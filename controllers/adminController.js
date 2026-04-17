const Issue = require('../models/Issue');

const getStats = async (req, res) => {
  const [total, byStatus, byCategory, byDepartment] = await Promise.all([
    Issue.countDocuments(),
    Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
  ]);
  res.json({ total, byStatus, byCategory, byDepartment });
};

const getAllUsers = async (req, res) => {
  const User = require('../models/User');
  const users = await User.find().select('-password');
  res.json(users);
};

const getPendingOfficers = async (req, res) => {
  const User = require('../models/User');
  const pending = await User.find({ role: 'officer', approved: false }).select('-password');
  res.json(pending);
};

const approveOfficer = async (req, res) => {
  const User = require('../models/User');
  const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

const rejectOfficer = async (req, res) => {
  const User = require('../models/User');
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Officer registration rejected and removed' });
};

module.exports = { getStats, getAllUsers, getPendingOfficers, approveOfficer, rejectOfficer };
