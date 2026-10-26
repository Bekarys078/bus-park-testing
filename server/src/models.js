const mongoose = require('mongoose');
const User = mongoose.model('User', new mongoose.Schema({
  login: { type: String, unique: true }, password: String,
  role: { type: String, enum: ['admin', 'dispatcher', 'mechanic'] } }));
const Bus = mongoose.model('Bus', new mongoose.Schema({
  plate: { type: String, unique: true }, brand: String, driver: String,
  status: { type: String, default: 'Жарамды' } }, { timestamps: true }));
module.exports = { User, Bus };
