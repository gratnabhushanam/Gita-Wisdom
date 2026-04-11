// Script to list all users in MongoDB for GitaWisdom
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ratnabhushanam8688_db_user:Ratna%402005@cluster0.prfkqkt.mongodb.net/';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  createdAt: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function listUsers() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({}, { name: 1, email: 1, role: 1, createdAt: 1 });
  users.forEach(u => {
    console.log(`${u.email} | ${u.role} | ${u.name} | ${u.createdAt}`);
  });
  mongoose.disconnect();
}

listUsers().catch(e => { console.error(e); mongoose.disconnect(); });
