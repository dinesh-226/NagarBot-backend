const User = require('../models/User');
const Issue = require('../models/Issue');

const getLeaderboard = async (req, res) => {
  const topUsers = await User.find({ role: 'citizen', karma: { $gt: 0 } })
    .select('name karma createdAt')
    .sort('-karma')
    .limit(20);

  const withCounts = await Promise.all(topUsers.map(async (u) => {
    const issueCount = await Issue.countDocuments({ reportedBy: u._id });
    const resolvedCount = await Issue.countDocuments({ reportedBy: u._id, status: 'resolved' });
    return { _id: u._id, name: u.name, karma: u.karma, issueCount, resolvedCount };
  }));

  res.json(withCounts);
};

const savePushSubscription = async (req, res) => {
  const { subscription } = req.body;
  await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
  res.json({ message: 'Subscription saved' });
};

module.exports = { getLeaderboard, savePushSubscription };
