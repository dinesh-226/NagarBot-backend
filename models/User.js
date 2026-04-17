const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
  department: { type: String, default: null },
  officerId: { type: String, default: null },
  proofUrl: { type: String, default: null },
  karma: { type: Number, default: 0 },
  phone: { type: String, default: null },
  city: { type: String, default: null },
  pincode: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  bio: { type: String, default: null },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
  approved: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
