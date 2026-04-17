const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const registerValidation = [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
];

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role, department, officerId, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  if (role === 'officer') {
    if (!department) return res.status(400).json({ message: 'Department is required for officers' });
    if (!officerId) return res.status(400).json({ message: 'Officer ID is required' });
    if (!req.file) return res.status(400).json({ message: 'Proof document is required' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name, email, password: hashed,
    role: role === 'officer' ? 'officer' : 'citizen',
    phone: phone || null,
    department: role === 'officer' ? department : null,
    officerId: role === 'officer' ? officerId : null,
    proofUrl: req.file?.path || null,
    approved: role === 'officer' ? false : true,
  });

  if (role === 'officer') {
    return res.status(201).json({ message: 'Officer registration submitted. Awaiting admin approval.' });
  }

  res.status(201).json({ token: signToken(user._id), user: { id: user._id, name, email, role: user.role } });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.approved)
    return res.status(403).json({ message: 'Your officer account is pending admin approval.' });
  res.json({ token: signToken(user._id), user: { id: user._id, name: user.name, email, role: user.role } });
};

const getMe = (req, res) => res.json({
  id: req.user._id,
  name: req.user.name,
  email: req.user.email,
  role: req.user.role,
  karma: req.user.karma,
  department: req.user.department,
  phone: req.user.phone,
  city: req.user.city,
  pincode: req.user.pincode,
  avatarUrl: req.user.avatarUrl,
  bio: req.user.bio,
  createdAt: req.user.createdAt,
});

const updateProfile = async (req, res) => {
  const allowed = ['name', 'phone', 'city', 'pincode', 'bio'];
  const update = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  if (req.file) update.avatarUrl = req.file.path;
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
  res.json({
    id: user._id, name: user.name, email: user.email, role: user.role,
    karma: user.karma, department: user.department, phone: user.phone,
    city: user.city, pincode: user.pincode, avatarUrl: user.avatarUrl,
    bio: user.bio, createdAt: user.createdAt,
  });
};

module.exports = { register, login, getMe, updateProfile, registerValidation };
