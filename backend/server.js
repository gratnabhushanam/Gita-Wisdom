
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');
const { connectDB } = require('./config/db');
const { initializeAdminCredentials } = require('./controllers/authController');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
let initializePromise = null;
// HLS DRM middleware
const jwt = require('jsonwebtoken');
app.use('/uploads/hls', (req, res, next) => {
  // Allow only .m3u8 and .ts files with valid token
  const token = req.query.token || req.headers['x-hls-token'];
  if (!token) return res.status(401).send('Missing HLS token');
  try {
    const payload = jwt.verify(token, process.env.HLS_JWT_SECRET || 'supersecret');
    // Optionally: check videoId matches requested file
    // Example: /uploads/hls/:videoId/...
    // const videoId = req.path.split('/')[1];
    // if (payload.videoId !== videoId) return res.status(403).send('Invalid video token');
    next();
  } catch {
    return res.status(401).send('Invalid or expired HLS token');
  }
}, express.static(path.join(__dirname, 'uploads', 'hls')));

// Honor x-forwarded-proto so generated absolute URLs use https in production behind proxies.
app.set('trust proxy', 1);

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const corsAllowlist = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin = '') => {
  if (!origin) {
    return true;
  }
  const isDevOrigin = origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1');
  if (!isProduction && isDevOrigin) {
    return true;
  }
  if (!corsAllowlist.length) {
    return !isProduction;
  }
  return corsAllowlist.includes(origin);
};

const createRateLimiter = ({ windowMs, maxRequests, isMatch }) => {
  const bucket = new Map();

  return (req, res, next) => {
    if (!isMatch(req)) {
      return next();
    }

    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const hit = bucket.get(key);

    if (!hit || now > hit.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (hit.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    hit.count += 1;
    return next();
  };
};

app.use(helmet());

// Only apply global CORS to API routes
app.use('/api', cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked for this origin'));
  },
  credentials: true,
}));

if (isProduction) {
  app.use((req, res, next) => {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    const isSecure = req.secure || forwardedProto.includes('https');
    if (isSecure) {
      return next();
    }
    const host = req.get('host');
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

app.use(createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  isMatch: () => true,
}));
app.use(createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  isMatch: (req) => req.path.startsWith('/api/auth'),
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add CORS headers specifically for video files served from /uploads/reels

// CORS for video streaming (partial content/range requests)
app.use('/uploads/reels', cors({
  origin: 'https://gitawisdom.vercel.app',
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Encoding', 'Content-Length'],
}));

// Custom video streaming route for bulletproof range support
const fs = require('fs');
app.get('/uploads/reels/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'reels', req.params.filename);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).end('Video not found');
    }

    const range = req.headers.range;
    if (!range) {
      // No range header, send the whole file
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Parse Range header (e.g., "bytes=0-1023")
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
    const chunkSize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/slokas', require('./routes/slokaRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));
app.use('/api/debug', require('./routes/debugRoutes'));

console.log('Routes registered');

app.get('/', (req, res) => {
  res.send('Gita Wisdom API is running');
});

const PORT = process.env.PORT || 8888;
const LEGACY_PORT = process.env.LEGACY_PORT || 5000;

const initializeApp = async () => {
  if (!initializePromise) {
    initializePromise = connectDB()
      .then(async () => {
        try {
          await initializeAdminCredentials();
        } catch (error) {
          console.warn('Admin bootstrap skipped:', error.message);
        }
      })
      .catch((error) => {
        initializePromise = null;
        throw error;
      });
  }

  return initializePromise;
};

const startServer = async () => {
  try {
    await initializeApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    if (!isProduction && String(LEGACY_PORT) !== String(PORT)) {
      app.listen(LEGACY_PORT, '0.0.0.0', () => {
        console.log(`Legacy compatibility port running on ${LEGACY_PORT}`);
      });
    }
  } catch (err) {
    console.error('DB Connection Failed:', err);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, initializeApp, startServer };
