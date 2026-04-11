// Script to create an admin user in MongoDB for GitaWisdom
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gita_wisdom';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Gita Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gitawisdom143@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ratnapavan@7896';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('Admin user already exists. Updating password...');
    existing.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    existing.role = 'admin';
    await existing.save();
    console.log('Admin password updated.');
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: hash, role: 'admin' });
    console.log('Admin user created.');
  }
  mongoose.disconnect();
}

createAdmin().catch(e => { console.error(e); mongoose.disconnect(); });

