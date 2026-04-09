const { User, Sloka } = require('../models');
const mongoose = require('mongoose');
const UserMongo = require('../models/mongo/UserMongo');
const StoryMongo = require('../models/mongo/StoryMongo');
const MovieMongo = require('../models/mongo/MovieMongo');
const VideoMongo = require('../models/mongo/VideoMongo');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const mockContentStore = require('../utils/mockContentStore');

// Mock in-memory database for when MySQL is unavailable
let mockUsers = [];
let nextUserId = 1;
let isMockModeActive = false;

// In-memory OTP store for registration verification
const pendingRegistrations = new Map();
const pendingPasswordResets = new Map();
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

const ADMIN_NAME = process.env.ADMIN_NAME || 'Gita Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isMongoEnabled = String(process.env.USE_MONGODB || 'false').toLowerCase() === 'true';
const isMongoConnected = () => mongoose.connection && mongoose.connection.readyState === 1;
const useMongoStore = () => isMongoEnabled && isMongoConnected();
const normalizePersistentUserId = (id) => (useMongoStore() ? String(id) : Number(id));

const findPersistentUserByEmail = async (email) => {
  if (useMongoStore()) {
    return UserMongo.findOne({ email });
  }
  return User.findOne({ where: { email } });
};

const findPersistentUserById = async (id) => {
  if (useMongoStore()) {
    return UserMongo.findById(String(id));
  }
  return User.findByPk(id);
};

const createPersistentUser = async (payload) => {
  if (useMongoStore()) {
    return UserMongo.create(payload);
  }
  return User.create(payload);
};

const findAnyPersistentAdmin = async () => {
  if (useMongoStore()) {
    return UserMongo.findOne({ role: 'admin' });
  }
  return User.findOne({ where: { role: 'admin' } });
};

const listPersistentUsers = async ({ limit } = {}) => {
  if (useMongoStore()) {
    const query = UserMongo.find({}, { password: 0 }).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    return query;
  }

  const options = {
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']],
  };
  if (limit) options.limit = limit;
  return User.findAll(options);
};

const deletePersistentUser = async (user) => {
  if (!user) return;
  if (useMongoStore()) {
    await user.deleteOne();
    return;
  }
  await user.destroy();
};

const getPersistentUserCount = async () => {
  if (useMongoStore()) {
    return UserMongo.countDocuments({});
  }
  return User.count();
};

const sanitizeUserForResponse = (user) => {
  if (!user) return null;
  if (useMongoStore()) {
    const raw = typeof user.toObject === 'function' ? user.toObject() : user;
    const { _id, __v, password, ...rest } = raw;
    return {
      id: String(_id),
      ...rest,
    };
  }
  return user;
};

const normalizeUserSettings = (incomingSettings = {}, currentSettings = {}) => {
  const base = {
    notifications: true,
    privacy: 'public',
    interests: [],
    ...(currentSettings || {}),
  };

  if (!incomingSettings || typeof incomingSettings !== 'object') {
    return base;
  }

  if (Object.prototype.hasOwnProperty.call(incomingSettings, 'notifications')) {
    base.notifications = Boolean(incomingSettings.notifications);
  }

  if (Object.prototype.hasOwnProperty.call(incomingSettings, 'privacy')) {
    const normalizedPrivacy = String(incomingSettings.privacy || '').trim().toLowerCase();
    base.privacy = normalizedPrivacy === 'private' ? 'private' : 'public';
  }

  if (Object.prototype.hasOwnProperty.call(incomingSettings, 'interests')) {
    const raw = Array.isArray(incomingSettings.interests) ? incomingSettings.interests : [];
    const uniqueInterests = Array.from(
      new Set(
        raw
          .map((interest) => String(interest || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 20);
    base.interests = uniqueInterests;
  }

  return base;
};

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getOtpExpiryTime = () => Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
const ALLOW_OTP_PREVIEW = String(process.env.ALLOW_OTP_PREVIEW || 'false').toLowerCase() === 'true' && String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const RESEND_FROM_EMAIL = String(process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
const RESEND_FROM_NAME = String(process.env.RESEND_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Gita Wisdom').trim();

const getEmailAuthConfig = () => {
  const user = String(process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  return { user, pass };
};

const isResendConfigured = () => Boolean(RESEND_API_KEY);

const isEmailTransportConfigured = () => {
  const { user, pass } = getEmailAuthConfig();
  return isResendConfigured() || Boolean(user && pass);
};

const resolveEmailProvider = () => {
  if (ALLOW_OTP_PREVIEW) {
    return 'preview';
  }

  const { user, pass } = getEmailAuthConfig();

  // Force SMTP when credentials are present to avoid stale EMAIL_PROVIDER=resend
  // overriding a working Gmail setup in production.
  if (user && pass) {
    return 'smtp';
  }

  if (EMAIL_PROVIDER === 'resend' || EMAIL_PROVIDER === 'smtp') {
    return EMAIL_PROVIDER;
  }

  if (isResendConfigured()) {
    return 'resend';
  }

  return 'smtp';
};

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 12000);
const SMTP_HOST = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || (SMTP_PORT === 465 ? 'true' : 'false')).toLowerCase() === 'true';
const RESEND_TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS || 12000);

const buildTransporter = () => nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  connectionTimeout: SMTP_TIMEOUT_MS,
  greetingTimeout: SMTP_TIMEOUT_MS,
  socketTimeout: SMTP_TIMEOUT_MS,
  auth: {
    user: getEmailAuthConfig().user,
    pass: getEmailAuthConfig().pass,
  },
});

const buildResendPayload = ({ email, name, otp }) => ({
  from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
  to: [email],
  subject: 'Your Gita Wisdom OTP Code',
  text: `Hare Krishna ${name || ''}, your OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  html: `<div style="font-family:Arial,sans-serif;background:#08111f;color:#fef3c7;padding:24px;border-radius:12px;border:1px solid #d4a12d;max-width:520px;"><h2 style="margin:0 0 12px;color:#f5d06f;">Gita Wisdom Account Verification</h2><p style="margin:0 0 16px;line-height:1.5;">Hare Krishna ${name || ''}, use this OTP to verify your account.</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;margin:10px 0 18px;">${otp}</div><p style="margin:0;color:#fcd34d;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p></div>`,
});

const sendViaResend = async ({ email, name, otp }) => {
  if (!isResendConfigured()) {
    return {
      delivered: false,
      message: 'Resend is not configured. Set RESEND_API_KEY.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildResendPayload({ email, name, otp })),
      signal: controller.signal,
    });

    const responseText = await response.text();
    const responseBody = responseText ? (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        return { raw: responseText };
      }
    })() : {};
    if (!response.ok) {
      const error = new Error(responseBody.message || `Resend request failed with status ${response.status}`);
      error.status = response.status;
      error.responseBody = responseBody;
      error.responseText = responseText;
      error.provider = 'resend';
      error.code = response.status === 401 || response.status === 403 ? 'EAUTH' : 'EFAIL';
      throw error;
    }

    return { delivered: true, provider: 'resend', messageId: responseBody.id || null };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      error.code = 'ETIMEDOUT';
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const sendViaSmtp = async ({ email, name, otp }) => {
  const { user } = getEmailAuthConfig();
  if (!user) {
    return {
      delivered: false,
      message: 'SMTP is not configured. Set EMAIL_USER and EMAIL_PASS.',
    };
  }

  const transporter = buildTransporter();
  await withTimeout(transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME || 'Gita Wisdom'} <${user}>`,
    to: email,
    subject: 'Your Gita Wisdom OTP Code',
    text: `Hare Krishna ${name || ''}, your OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<div style="font-family:Arial,sans-serif;background:#08111f;color:#fef3c7;padding:24px;border-radius:12px;border:1px solid #d4a12d;max-width:520px;"><h2 style="margin:0 0 12px;color:#f5d06f;">Gita Wisdom Account Verification</h2><p style="margin:0 0 16px;line-height:1.5;">Hare Krishna ${name || ''}, use this OTP to verify your account.</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;margin:10px 0 18px;">${otp}</div><p style="margin:0;color:#fcd34d;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p></div>`,
  }), SMTP_TIMEOUT_MS, 'SMTP send timed out');

  return { delivered: true, provider: 'smtp' };
};

const withTimeout = (promise, ms, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(timeoutMessage || 'Operation timed out');
      error.code = 'ETIMEDOUT';
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const getEmailFailureMessage = (error) => {
  if (ALLOW_OTP_PREVIEW) {
    return 'Preview OTP mode is enabled.';
  }

  const resendValidationMessage = String(error?.responseBody?.message || error?.responseText || '').toLowerCase();
  const resendSandboxRestricted = error?.provider === 'resend' && (
    error?.responseBody?.name === 'validation_error' || resendValidationMessage.includes('only send testing emails')
  );

  const authRejected = error && (
    error.responseCode === 535 ||
    (error.code === 'EAUTH' && error.provider !== 'resend')
  );
  const smtpNetworkBlocked = error && (
    error.code === 'ESOCKET' ||
    error.code === 'ENETUNREACH' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED'
  );
  const resendRejected = error && (
    error.provider === 'resend' ||
    error.code === 'EFAIL'
  );

  if (authRejected) {
    return 'Gmail rejected EMAIL_PASS. Use a Gmail App Password.';
  }

  if (resendRejected) {
    if (resendSandboxRestricted) {
      return 'Resend is in testing mode. OTP can currently be sent only to the account owner email until a domain sender is verified.';
    }

    const details = error?.responseText
      ? ` Details: ${error.responseText}`
      : error?.responseBody && Object.keys(error.responseBody).length
        ? ` Details: ${JSON.stringify(error.responseBody)}`
        : '';
    const status = error?.status ? ` (status ${error.status})` : '';
    return `Resend API rejected the request${status}. Check RESEND_API_KEY and RESEND_FROM_EMAIL.${details}`;
  }

  if (smtpNetworkBlocked) {
    return 'SMTP network unreachable from server. Check internet/firewall.';
  }

  return 'Email delivery failed.';
};

exports.getEmailHealth = async (req, res) => {
  const provider = resolveEmailProvider();
  const { user } = getEmailAuthConfig();

  if (provider === 'preview') {
    return res.status(200).json({
      configured: true,
      reachable: true,
      mode: 'preview',
      provider: 'preview',
      smtpUser: user || null,
      message: 'Preview OTP mode is enabled. Codes will be returned in the response.',
    });
  }

  if (!isEmailTransportConfigured()) {
    return res.status(200).json({
      configured: false,
      reachable: false,
      mode: 'preview',
      provider: null,
      smtpUser: user || null,
      message: 'Email service is not configured. Set RESEND_API_KEY or EMAIL_USER and EMAIL_PASS.',
    });
  }

  try {
    if (provider === 'resend') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

      try {
        const response = await fetch('https://api.resend.com/domains', {
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const responseText = await response.text();
          const responseBody = responseText ? (() => {
            try {
              return JSON.parse(responseText);
            } catch {
              return { raw: responseText };
            }
          })() : {};
          const error = new Error(responseBody.message || `Resend health check failed with status ${response.status}`);
          error.status = response.status;
          error.responseBody = responseBody;
          error.responseText = responseText;
          error.provider = 'resend';
          error.code = response.status === 401 || response.status === 403 ? 'EAUTH' : 'EFAIL';
          throw error;
        }

        return res.status(200).json({
          configured: true,
          reachable: true,
          mode: 'live',
          provider: 'resend',
          smtpUser: null,
          message: 'Resend API is reachable. OTP emails should be delivered.',
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const transporter = buildTransporter();
    await withTimeout(transporter.verify(), SMTP_TIMEOUT_MS, 'SMTP verification timed out');

    return res.status(200).json({
      configured: true,
      reachable: true,
      mode: 'live',
      provider: 'smtp',
      smtpUser: user,
      message: 'SMTP is reachable. OTP emails should be delivered.',
    });
  } catch (error) {
    return res.status(200).json({
      configured: true,
      reachable: false,
      mode: 'preview',
      provider,
      smtpUser: user,
      errorCode: error.code || null,
      details: error.responseBody || null,
      message: getEmailFailureMessage(error),
    });
  }
};

const sendOtpEmail = async ({ email, name, otp }) => {
  if (ALLOW_OTP_PREVIEW) {
    return { delivered: true, provider: 'preview', previewCode: otp };
  }

  const isConfigured = isEmailTransportConfigured();
  if (!isConfigured) {
    return {
      delivered: false,
      message: 'Email service is not configured. Set RESEND_API_KEY or EMAIL_USER and EMAIL_PASS.',
    };
  }

  const providerPreference = resolveEmailProvider();
  const deliveryPlan = providerPreference === 'resend'
    ? ['resend', 'smtp']
    : providerPreference === 'smtp'
      ? ['smtp', 'resend']
      : ['resend', 'smtp'];

  let lastError = null;

  for (const provider of deliveryPlan) {
    try {
      if (provider === 'resend') {
        const result = await sendViaResend({ email, name, otp });
        if (result?.delivered) {
          return result;
        }
        lastError = new Error(result?.message || 'Resend delivery failed');
        lastError.code = 'EFAIL';
        continue;
      }

      const result = await sendViaSmtp({ email, name, otp });
      if (result?.delivered) {
        return result;
      }
      // Keep the richer previous provider error (usually Resend) when SMTP fallback
      // is unavailable, so callers get actionable upstream diagnostics.
      if (provider === 'smtp' && result?.message && /not configured/i.test(result.message) && lastError) {
        continue;
      }
      lastError = new Error(result?.message || 'SMTP delivery failed');
      lastError.code = 'EFAIL';
    } catch (error) {
      lastError = error;
    }
  }

  return {
    delivered: false,
    message: getEmailFailureMessage(lastError),
  };
};

const ensureMockAdminUser = () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin credentials missing in env. Set ADMIN_EMAIL and ADMIN_PASSWORD.');
    return;
  }

  const normalizedAdminEmail = normalizeEmail(ADMIN_EMAIL);
  const existingAdmin = mockUsers.find((u) => normalizeEmail(u.email) === normalizedAdminEmail || u.role === 'admin');
  if (existingAdmin) {
    existingAdmin.name = ADMIN_NAME;
    existingAdmin.email = normalizedAdminEmail;
    existingAdmin.password = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    existingAdmin.role = 'admin';
    existingAdmin.updatedAt = new Date().toISOString();
    return;
  }

  const adminUser = {
    id: nextUserId++,
    name: ADMIN_NAME,
    email: normalizedAdminEmail,
    password: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'admin',
    language: 'telugu',
    streak: 0,
    profilePicture: null,
    settings: { notifications: true, privacy: 'public', interests: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockUsers.push(adminUser);
  console.log('Mock admin user created:', normalizedAdminEmail);
};

const ensurePersistentAdminUser = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin credentials missing in env. Set ADMIN_EMAIL and ADMIN_PASSWORD.');
    return;
  }

  const normalizedAdminEmail = normalizeEmail(ADMIN_EMAIL);

  const existing = await findPersistentUserByEmail(normalizedAdminEmail);
  if (existing) {
    existing.name = ADMIN_NAME;
    existing.role = 'admin';
    existing.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await existing.save();
    return;
  }

  const anyAdmin = await findAnyPersistentAdmin();
  if (anyAdmin) {
    anyAdmin.name = ADMIN_NAME;
    anyAdmin.email = normalizedAdminEmail;
    anyAdmin.role = 'admin';
    anyAdmin.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await anyAdmin.save();
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await createPersistentUser({
    name: ADMIN_NAME,
    email: normalizedAdminEmail,
    password: hashedPassword,
    role: 'admin',
  });

  console.log('Admin user bootstrapped:', normalizedAdminEmail);
};

// Set mock mode
const setMockMode = (value) => {
  isMockModeActive = value;
  console.log('Mock mode:', isMockModeActive ? 'ENABLED' : 'DISABLED');
  if (isMockModeActive) {
    ensureMockAdminUser();
  }
};

const isMockMode = () => isMockModeActive;

module.exports.setMockMode = setMockMode;
module.exports.isMockMode = isMockMode;

const getMockUserById = (id) => mockUsers.find((u) => Number(u.id) === Number(id));
module.exports.getMockUserById = getMockUserById;

const initializeAdminCredentials = async () => {
  if (isMockMode()) {
    ensureMockAdminUser();
    return;
  }
  await ensurePersistentAdminUser();
};

module.exports.initializeAdminCredentials = initializeAdminCredentials;

// Register step 1: create OTP challenge, send email, do not create user yet.
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const safeEmail = normalizeEmail(email);

    if (!name || !safeEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    let userExists;
    if (isMockMode()) {
      userExists = mockUsers.find((u) => normalizeEmail(u.email) === safeEmail);
    } else {
      userExists = await findPersistentUserByEmail(safeEmail);
    }

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = createOtp();
    const now = Date.now();

    pendingRegistrations.set(safeEmail, {
      name,
      email: safeEmail,
      password: hashedPassword,
      otp,
      expiresAt: getOtpExpiryTime(),
      attempts: 0,
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    });

    let deliveryResult;
    try {
      deliveryResult = await sendOtpEmail({ email: safeEmail, name, otp });

      if (!deliveryResult?.delivered) {
        pendingRegistrations.delete(safeEmail);
        return res.status(503).json({ message: deliveryResult?.message || 'Failed to deliver OTP email. Please try again later.' });
      }
    } catch (mailError) {
      pendingRegistrations.delete(safeEmail);
      return res.status(502).json({
        message: 'Failed to send OTP email. Check Gmail app password and try again.',
        error: mailError.message,
      });
    }

    const response = {
      message: 'OTP sent to your email. Please verify to complete account creation.',
      email: safeEmail,
      retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };

    if (deliveryResult?.provider === 'preview' && deliveryResult?.previewCode) {
      response.previewCode = deliveryResult.previewCode;
      response.message = 'Preview OTP generated. Use the returned code to verify your account.';
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Optional endpoint to resend OTP for existing pending registration
exports.resendRegistrationOtp = async (req, res) => {
  try {
    const safeEmail = normalizeEmail(req.body.email);
    if (!safeEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const pending = pendingRegistrations.get(safeEmail);
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    const now = Date.now();
    if (Number(pending.resendAvailableAt || 0) > now) {
      const retryAfterSeconds = Math.ceil((Number(pending.resendAvailableAt) - now) / 1000);
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting a new OTP. For security, OTP can be resent once per minute.`,
        retryAfterSeconds,
      });
    }

    const otp = createOtp();
    pending.otp = otp;
    pending.expiresAt = getOtpExpiryTime();
    pending.attempts = 0;
    pending.resendAvailableAt = now + OTP_RESEND_COOLDOWN_SECONDS * 1000;
    pendingRegistrations.set(safeEmail, pending);

    let deliveryResult;
    try {
      deliveryResult = await sendOtpEmail({ email: safeEmail, name: pending.name, otp });

      if (!deliveryResult?.delivered) {
        return res.status(503).json({ message: deliveryResult?.message || 'Failed to deliver OTP email. Please try again later.' });
      }
    } catch (mailError) {
      return res.status(502).json({
        message: 'Failed to resend OTP email. Check Gmail app password and try again.',
        error: mailError.message,
      });
    }

    const response = {
      message: 'A new OTP has been sent',
      email: safeEmail,
      retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };

    if (deliveryResult?.provider === 'preview' && deliveryResult?.previewCode) {
      response.previewCode = deliveryResult.previewCode;
      response.message = 'Preview OTP generated. Use the returned code to verify your account.';
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Register step 2: verify OTP and create user account
exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const safeEmail = normalizeEmail(req.body.email);
    const providedOtp = String(req.body.otp || '').trim();

    if (!safeEmail || !providedOtp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const pending = pendingRegistrations.get(safeEmail);
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register again.' });
    }

    if (pending.expiresAt < Date.now()) {
      pendingRegistrations.delete(safeEmail);
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      pendingRegistrations.delete(safeEmail);
      return res.status(429).json({ message: 'Too many invalid attempts. Please register again.' });
    }

    if (pending.otp !== providedOtp) {
      pending.attempts += 1;
      pendingRegistrations.set(safeEmail, pending);
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    let user;
    if (isMockMode()) {
      const existingMock = mockUsers.find((u) => normalizeEmail(u.email) === safeEmail);
      if (existingMock) {
        pendingRegistrations.delete(safeEmail);
        return res.status(400).json({ message: 'User already exists' });
      }

      user = {
        id: nextUserId++,
        name: pending.name,
        email: pending.email,
        password: pending.password,
        role: 'user',
        language: 'telugu',
        streak: 0,
        profilePicture: null,
        settings: { notifications: true, privacy: 'public', interests: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockUsers.push(user);
    } else {
      const existing = await findPersistentUserByEmail(safeEmail);
      if (existing) {
        pendingRegistrations.delete(safeEmail);
        return res.status(400).json({ message: 'User already exists' });
      }

      user = await createPersistentUser({
        name: pending.name,
        email: pending.email,
        password: pending.password,
      });
    }

    pendingRegistrations.delete(safeEmail);

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language,
      settings: user.settings,
      token: generateToken(user.id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Forgot password step 1: send OTP
exports.requestPasswordResetOtp = async (req, res) => {
  try {
    const safeEmail = normalizeEmail(req.body.email);
    if (!safeEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let existingUser;
    if (isMockMode()) {
      existingUser = mockUsers.find((u) => normalizeEmail(u.email) === safeEmail);
    } else {
      existingUser = await findPersistentUserByEmail(safeEmail);
    }

    if (!existingUser) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const existingResetRequest = pendingPasswordResets.get(safeEmail);
    const now = Date.now();
    if (existingResetRequest && Number(existingResetRequest.resendAvailableAt || 0) > now) {
      const retryAfterSeconds = Math.ceil((Number(existingResetRequest.resendAvailableAt) - now) / 1000);
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting a new OTP. For security, OTP can be resent once per minute.`,
        retryAfterSeconds,
      });
    }

    const otp = createOtp();
    pendingPasswordResets.set(safeEmail, {
      otp,
      expiresAt: getOtpExpiryTime(),
      attempts: 0,
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    });

    const deliveryResult = await sendOtpEmail({
      email: safeEmail,
      name: existingUser.name,
      otp,
    });

    if (!deliveryResult?.delivered) {
      pendingPasswordResets.delete(safeEmail);
      return res.status(503).json({ message: deliveryResult?.message || 'Failed to deliver OTP email. Please try again later.' });
    }

    const response = {
      message: 'OTP sent to your email',
      email: safeEmail,
      retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };

    if (deliveryResult?.provider === 'preview' && deliveryResult?.previewCode) {
      response.previewCode = deliveryResult.previewCode;
      response.message = 'Preview OTP generated. Use the returned code to reset your password.';
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Forgot password step 2: verify OTP and set new password
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const safeEmail = normalizeEmail(req.body.email);
    const providedOtp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!safeEmail || !providedOtp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const pending = pendingPasswordResets.get(safeEmail);
    if (!pending) {
      return res.status(404).json({ message: 'No pending password reset found. Request OTP again.' });
    }

    if (pending.expiresAt < Date.now()) {
      pendingPasswordResets.delete(safeEmail);
      return res.status(400).json({ message: 'OTP expired. Request a new OTP.' });
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      pendingPasswordResets.delete(safeEmail);
      return res.status(429).json({ message: 'Too many invalid attempts. Request OTP again.' });
    }

    if (pending.otp !== providedOtp) {
      pending.attempts += 1;
      pendingPasswordResets.set(safeEmail, pending);
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isMockMode()) {
      const target = mockUsers.find((u) => normalizeEmail(u.email) === safeEmail);
      if (!target) {
        pendingPasswordResets.delete(safeEmail);
        return res.status(404).json({ message: 'User not found' });
      }
      target.password = hashedPassword;
      target.updatedAt = new Date().toISOString();
      pendingPasswordResets.delete(safeEmail);
      return res.json({ message: 'Password reset successful' });
    }

    const target = await findPersistentUserByEmail(safeEmail);
    if (!target) {
      pendingPasswordResets.delete(safeEmail);
      return res.status(404).json({ message: 'User not found' });
    }

    target.password = hashedPassword;
    await target.save();
    pendingPasswordResets.delete(safeEmail);
    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user;

    if (isMockMode()) {
      user = mockUsers.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
    } else {
      user = await findPersistentUserByEmail(normalizeEmail(email));
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      const now = new Date();
      if (user.lastActive) {
        const lastActiveDate = new Date(user.lastActive);
        const timeDiff = Math.abs(now - lastActiveDate);
        const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          user.streak += 1;
        } else if (diffDays > 1) {
          user.streak = 1;
        }
      } else {
        user.streak = 1;
      }
      user.lastActive = now;

      if (!isMockMode()) {
        await user.save();
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        streak: user.streak,
        settings: user.settings,
        token: generateToken(user.id),
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update user streak on sloka view
exports.updateStreak = async (req, res) => {
  try {
    if (isMockMode()) {
      const user = getMockUserById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const now = new Date();
      if (user.lastActive) {
        const lastActiveDate = new Date(user.lastActive);
        const isSameDay = now.toDateString() === lastActiveDate.toDateString();

        if (!isSameDay) {
          const diffTime = Math.abs(now - lastActiveDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          user.streak = diffDays === 1 ? (user.streak || 0) + 1 : 1;
          user.lastActive = now.toISOString();
        }
      } else {
        user.streak = 1;
        user.lastActive = now.toISOString();
      }

      return res.json({ streak: user.streak, lastActive: user.lastActive });
    }

    const user = await findPersistentUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    if (user.lastActive) {
      const lastActiveDate = new Date(user.lastActive);
      const isSameDay = now.toDateString() === lastActiveDate.toDateString();

      if (!isSameDay) {
        const diffTime = Math.abs(now - lastActiveDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          user.streak += 1;
        } else {
          user.streak = 1;
        }
        user.lastActive = now;
        await user.save();
      }
    } else {
      user.streak = 1;
      user.lastActive = now;
      await user.save();
    }

    return res.json({ streak: user.streak, lastActive: user.lastActive });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    if (isMockMode()) {
      const user = getMockUserById(req.user.id);
      if (user) {
        const { password, ...safeUser } = user;
        return res.json({
          ...safeUser,
          bookmarkedSlokas: Array.isArray(user.bookmarkedSlokas) ? user.bookmarkedSlokas : [],
        });
      }
      return res.status(404).json({ message: 'User not found' });
    }

    const user = useMongoStore()
      ? await findPersistentUserById(req.user.id)
      : await User.findByPk(req.user.id, {
        include: [{ model: Sloka, as: 'bookmarkedSlokas' }],
      });
    if (user) {
      const safeUser = sanitizeUserForResponse(user);
      if (useMongoStore()) {
        safeUser.bookmarkedSlokas = Array.isArray(safeUser.bookmarkedSlokas) ? safeUser.bookmarkedSlokas : [];
      }
      return res.json(safeUser);
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update user profile/settings
exports.updateUserProfile = async (req, res) => {
  try {
    if (isMockMode()) {
      const user = getMockUserById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio || user.bio;
      user.profilePicture = req.body.profilePicture || user.profilePicture;
      if (req.body.settings) {
        user.settings = normalizeUserSettings(req.body.settings, user.settings);
      }
      user.updatedAt = new Date().toISOString();

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        settings: user.settings,
        role: user.role,
        token: generateToken(user.id),
      });
    }

    const user = await findPersistentUserById(req.user.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio || user.bio;
      user.profilePicture = req.body.profilePicture || user.profilePicture;

      if (req.body.settings) {
        user.settings = normalizeUserSettings(req.body.settings, user.settings);
      }

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();
      const safeUser = sanitizeUserForResponse(updatedUser);
      return res.json({
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        bio: safeUser.bio,
        profilePicture: safeUser.profilePicture,
        settings: safeUser.settings,
        role: safeUser.role,
        token: generateToken(safeUser.id),
      });
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Bookmark a sloka
exports.toggleBookmark = async (req, res) => {
  try {
    if (isMockMode()) {
      const slokaId = Number(req.body.slokaId);
      if (!slokaId) {
        return res.status(400).json({ message: 'Valid slokaId is required' });
      }

      const user = getMockUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!Array.isArray(user.bookmarkedSlokas)) {
        user.bookmarkedSlokas = [];
      }

      const existingIndex = user.bookmarkedSlokas.findIndex((id) => Number(id) === slokaId);
      const isBookmarked = existingIndex !== -1;

      if (isBookmarked) {
        user.bookmarkedSlokas.splice(existingIndex, 1);
      } else {
        user.bookmarkedSlokas.push(slokaId);
      }

      user.updatedAt = new Date().toISOString();

      return res.json({
        message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
        bookmarks: user.bookmarkedSlokas,
      });
    }

    const { slokaId } = req.body;
    const user = await findPersistentUserById(req.user.id);

    if (user) {
      if (useMongoStore()) {
        if (!Array.isArray(user.bookmarkedSlokas)) {
          user.bookmarkedSlokas = [];
        }

        const numericSlokaId = Number(slokaId);
        const existingIndex = user.bookmarkedSlokas.findIndex((id) => Number(id) === numericSlokaId);
        const isBookmarked = existingIndex !== -1;

        if (isBookmarked) {
          user.bookmarkedSlokas.splice(existingIndex, 1);
        } else {
          user.bookmarkedSlokas.push(numericSlokaId);
        }

        await user.save();
        return res.json({
          message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
          bookmarks: user.bookmarkedSlokas,
        });
      }

      const isBookmarked = await user.hasBookmarkedSloka(slokaId);
      if (isBookmarked) {
        await user.removeBookmarkedSloka(slokaId);
      } else {
        await user.addBookmarkedSloka(slokaId);
      }
      const updatedUser = await User.findByPk(req.user.id, {
        include: [{ model: require('../models/Sloka'), as: 'bookmarkedSlokas' }],
      });
      return res.json({ message: isBookmarked ? 'Bookmark removed' : 'Bookmark added', bookmarks: updatedUser.bookmarkedSlokas });
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    if (isMockMode()) {
      const users = [...mockUsers]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map(({ password, ...safeUser }) => safeUser);
      return res.json(users);
    }

    const users = await listPersistentUsers();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Delete a user account (Admin only)
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const targetUserId = normalizePersistentUserId(req.params.id);
    if (!targetUserId || String(targetUserId).trim().length === 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (String(req.user.id) === String(targetUserId)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    if (isMockMode()) {
      const target = mockUsers.find((u) => Number(u.id) === Number(targetUserId));
      if (!target) return res.status(404).json({ message: 'User not found' });
      if (target.role === 'admin') {
        return res.status(403).json({ message: 'Admin account deletion is blocked' });
      }

      mockUsers = mockUsers.filter((u) => Number(u.id) !== Number(targetUserId));
      return res.json({ message: 'User deleted successfully' });
    }

    const target = await findPersistentUserById(targetUserId);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Admin account deletion is blocked' });
    }

    await deletePersistentUser(target);
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get stats (Admin only)
exports.getStats = async (req, res) => {
  try {
    if (isMockMode()) {
      const counts = mockContentStore.getCounts();
      const recentUsers = [...mockUsers]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5)
        .map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt || new Date().toISOString() }));

      return res.json({
        totalUsers: mockUsers.length,
        totalMovies: counts.totalMovies,
        totalStories: counts.totalStories,
        totalVideos: counts.totalVideos,
        recentUsers,
      });
    }

    const userCount = await getPersistentUserCount();
    const movieCount = useMongoStore() ? await MovieMongo.countDocuments({}) : await require('../models/Movie').count();
    const storyCount = useMongoStore() ? await StoryMongo.countDocuments({}) : await require('../models/Story').count();
    const videoCount = useMongoStore() ? await VideoMongo.countDocuments({}) : await require('../models/Video').count();

    const recentUsers = await listPersistentUsers({ limit: 5 });

    return res.json({
      totalUsers: userCount,
      totalMovies: movieCount,
      totalStories: storyCount,
      totalVideos: videoCount,
      recentUsers,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Public community profiles (only users with public privacy)
exports.getCommunityProfiles = async (req, res) => {
  try {
    if (isMockMode()) {
      const community = mockUsers
        .filter((user) => user.role !== 'admin')
        .filter((user) => String(user?.settings?.privacy || 'public') === 'public')
        .map((user) => ({
          id: user.id,
          name: user.name,
          bio: user.bio || '',
          profilePicture: user.profilePicture || null,
          streak: user.streak || 0,
          benefits: user.benefits || { points: 0, badges: [] },
          settings: {
            privacy: 'public',
            interests: Array.isArray(user?.settings?.interests) ? user.settings.interests : [],
          },
        }));

      return res.json(community);
    }

    const users = useMongoStore()
      ? await UserMongo.find({ role: 'user' }).sort({ createdAt: -1 })
      : await User.findAll({
        where: { role: 'user' },
        attributes: ['id', 'name', 'bio', 'profilePicture', 'streak', 'benefits', 'settings'],
        order: [['createdAt', 'DESC']],
      });

    const community = users
      .filter((user) => String(user?.settings?.privacy || 'public') === 'public')
      .map((user) => ({
        id: String(user.id || user._id),
        name: user.name,
        bio: user.bio || '',
        profilePicture: user.profilePicture || null,
        streak: user.streak || 0,
        benefits: user.benefits || { points: 0, badges: [] },
        settings: {
          privacy: 'public',
          interests: Array.isArray(user?.settings?.interests) ? user.settings.interests : [],
        },
      }));

    return res.json(community);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports.getUserByIdForAuth = async (id) => {
  if (isMockMode()) {
    const mockUser = getMockUserById(id);
    return mockUser ? { ...mockUser, password: undefined } : null;
  }

  if (useMongoStore()) {
    const user = await UserMongo.findById(String(id), { password: 0 });
    if (!user) return null;
    const raw = user.toObject();
    const { _id, __v, ...rest } = raw;
    return { id: String(_id), ...rest };
  }

  return User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });
};