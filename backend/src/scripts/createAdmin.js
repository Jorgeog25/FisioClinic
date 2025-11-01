// backend/scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main(){
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error('Uso: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const exists = await User.findOne({ email });
  if (exists) {
    console.error('Ya existe un usuario con ese email');
    process.exit(1);
  }

  const admin = await User.create({ email, password, role: 'admin' });
  console.log('Admin creado:', { id: admin._id.toString(), email: admin.email, role: admin.role });
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
