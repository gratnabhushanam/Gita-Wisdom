<<<<<<< HEAD
const getExpectedApiKeys = () => String(process.env.APP_API_KEY || process.env.PERMANENT_API_KEYS || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

const requireApiKey = (req, res, next) => {
  const expectedKeys = getExpectedApiKeys();

  // Keep local/dev flow working when key is not configured.
  if (!expectedKeys.length) {
=======
const getExpectedApiKey = () => String(process.env.APP_API_KEY || '').trim();

const requireApiKey = (req, res, next) => {
  const expectedKey = getExpectedApiKey();

  // Keep local/dev flow working when key is not configured.
  if (!expectedKey) {
>>>>>>> 51a5678 (feat: secure daily sloka and mentor APIs with shared key)
    return next();
  }

  const receivedKey = String(req.headers['x-api-key'] || '').trim();
<<<<<<< HEAD
  if (!receivedKey || !expectedKeys.includes(receivedKey)) {
=======
  if (!receivedKey || receivedKey !== expectedKey) {
>>>>>>> 51a5678 (feat: secure daily sloka and mentor APIs with shared key)
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }

  return next();
};

module.exports = { requireApiKey };
