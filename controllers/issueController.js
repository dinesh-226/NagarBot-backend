const Issue = require('../models/Issue');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { analyzeIssue, generateComplaintLetter } = require('../services/aiService');
const { sendPush } = require('../services/pushService');
const { sendEmail } = require('../services/emailService');

let io;
const setIO = (socketIO) => { io = socketIO; };

const generateRefNumber = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `NB-${year}-${num}`;
};

const addKarma = async (userId, points) => {
  await User.findByIdAndUpdate(userId, { $inc: { karma: points } });
};

const getDeptOfficerEmails = async (department) => {
  const officers = await User.find({ role: 'officer', department, approved: true }).select('email');
  const emails = officers.map((o) => o.email);
  if (!emails.includes(process.env.EMAIL_USER)) emails.push(process.env.EMAIL_USER);
  return emails.join(',');
};

const notifyUser = async (userId, title, body) => {
  const user = await User.findById(userId).select('pushSubscription');
  if (user?.pushSubscription) {
    const result = await sendPush(user.pushSubscription, { title, body, icon: '/logo192.png' });
    if (result === 'expired') await User.findByIdAndUpdate(userId, { pushSubscription: null });
  }
};

const guessDepartment = (description) => {
  const d = description.toLowerCase();
  if (d.match(/pothole|road|footpath|pavement|bridge/)) return { category: 'Pothole', department: 'PWD' };
  if (d.match(/light|streetlight|electric|power|wire/)) return { category: 'Streetlight', department: 'Electricity Board' };
  if (d.match(/garbage|waste|trash|dustbin|dump|litter/)) return { category: 'Garbage', department: 'Sanitation' };
  if (d.match(/water|pipe|leak|drain|sewage|flood/)) return { category: 'Water', department: 'Water Works' };
  if (d.match(/construction|building|illegal|encroach/)) return { category: 'Construction', department: 'Municipal Corporation' };
  return { category: 'Other', department: 'Municipal Corporation' };
};

const createIssue = async (req, res) => {
  const { title, description, lat, lng, address } = req.body;
  const imageUrl = req.file?.path || null;

  let aiData = { category: 'Other', urgency: 5, department: 'Municipal Corporation', estimated_resolution_days: 7, summary: '', action_required: '' };
  try {
    aiData = await analyzeIssue(description);
  } catch (e) {
    console.error('AI failed, using keyword fallback:', e.message);
    const guess = guessDepartment(description);
    aiData.category = guess.category;
    aiData.department = guess.department;
  }

  const refNumber = generateRefNumber();
  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + (aiData.estimated_resolution_days || 7));

  const issue = await Issue.create({
    title, description,
    category: aiData.category,
    urgency: aiData.urgency,
    department: aiData.department,
    estimatedDays: aiData.estimated_resolution_days,
    aiSummary: aiData.summary,
    actionRequired: aiData.action_required,
    refNumber,
    slaDeadline,
    location: { lat: parseFloat(lat), lng: parseFloat(lng), address },
    imageUrl,
    reportedBy: req.user._id,
    timeline: [{
      event: 'Issue Reported',
      note: `${aiData.summary || ''} · Urgency ${aiData.urgency}/10 · SLA: ${aiData.estimated_resolution_days} days`,
      by: req.user.name,
    }],
  });

  try {
    const letter = await generateComplaintLetter({
      ...issue.toObject(),
      reporterName: req.user.name,
      location: { lat, lng, address },
    });
    issue.complainantLetter = letter;
    await issue.save();
  } catch (e) { console.error('Letter failed:', e.message); }

  await addKarma(req.user._id, 10);

  if (aiData.urgency >= 8) {
    try {
      const to = await getDeptOfficerEmails(aiData.department);
      await sendEmail({
        to,
        subject: `🚨 HIGH URGENCY Alert — ${refNumber} | Urgency ${aiData.urgency}/10`,
        text: `A high-urgency civic issue has been reported and requires IMMEDIATE attention.\n\nRef: ${refNumber}\nTitle: ${title}\nCategory: ${aiData.category}\nDepartment: ${aiData.department}\nUrgency: ${aiData.urgency}/10\nLocation: ${address || `${lat}, ${lng}`}\nSLA Deadline: ${slaDeadline.toDateString()}\nReported By: ${req.user.name}\n\nAction Required: ${aiData.action_required || 'Immediate inspection and repair'}\nSummary: ${aiData.summary || 'High urgency civic issue'}\n\nLogin to Officer Portal: ${process.env.CLIENT_URL}/officer`,
      });
      console.log(`High urgency alert sent for ${refNumber} to: ${to}`);
    } catch (e) {
      console.error('High urgency alert email failed:', e.message);
    }
  }

  if (io) io.emit('issue:new', issue);
  res.status(201).json(issue);
};

const getIssues = async (req, res) => {
  const { status, category, department } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (department) filter.department = department;
  const issues = await Issue.find(filter).populate('reportedBy', 'name karma').sort('-createdAt');
  res.json(issues);
};

const getIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('reportedBy', 'name karma')
    .populate('assignedTo', 'name');
  if (!issue) return res.status(404).json({ message: 'Issue not found' });
  res.json(issue);
};

const updateIssue = async (req, res) => {
  const existing = await Issue.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Issue not found' });

  const statusChanged = req.body.status && req.body.status !== existing.status;
  if (req.file) req.body.resolutionImageUrl = req.file.path;

  const update = { ...req.body };
  if (statusChanged) {
    update.$push = {
      timeline: {
        event: `Status changed to "${req.body.status}"`,
        note: req.body.resolutionNote || '',
        by: req.user.name,
      },
    };
  }
  delete update.timeline;

  const issue = await Issue.findByIdAndUpdate(req.params.id, update, { new: true });

  if (statusChanged && req.body.status === 'resolved') {
    const resolvedDays = Math.ceil((Date.now() - existing.createdAt) / (1000 * 60 * 60 * 24));
    await addKarma(existing.reportedBy, 20);
    await notifyUser(existing.reportedBy, '✅ Issue Resolved!',
      `Your complaint ${existing.refNumber} has been resolved by ${existing.department}. Resolution time: ${resolvedDays} day(s).`);

    const votes = await Vote.find({ issue: existing._id }).select('user');
    for (const vote of votes) {
      if (vote.user.toString() !== existing.reportedBy.toString()) {
        await notifyUser(vote.user, '✅ Issue Resolved!',
          `An issue you upvoted (${existing.refNumber}) has been resolved by ${existing.department}.`);
      }
    }
  } else if (statusChanged) {
    await notifyUser(existing.reportedBy, '🔄 Issue Update',
      `Your complaint ${existing.refNumber} is now ${req.body.status}.`);
  }

  if (io) io.emit('issue:updated', issue);
  res.json(issue);
};

const upvoteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    await Vote.create({ issue: id, user: req.user._id });
    const issue = await Issue.findByIdAndUpdate(id, { $inc: { upvotes: 1 } }, { new: true });

    await addKarma(issue.reportedBy, 2);

    if (issue.upvotes % 10 === 0 && issue.urgency < 10) {
      const escalated = await Issue.findByIdAndUpdate(id, {
        $inc: { urgency: 1 },
        $push: { timeline: { event: 'Urgency Escalated', note: `Reached ${issue.upvotes} upvotes — escalated to senior officer`, by: 'System' } },
      }, { new: true });

      getDeptOfficerEmails(issue.department).then((to) => {
        sendEmail({
          to,
          subject: `⚠️ Urgency Escalation — ${issue.refNumber} now ${escalated.urgency}/10`,
          text: `Issue ${issue.refNumber} has been escalated.\n\nTitle: ${issue.title}\nNew Urgency: ${escalated.urgency}/10\nNeighbors Affected: ${issue.upvotes}\nLocation: ${issue.location?.address || ''}\nDepartment: ${issue.department}\n\nLogin to Officer Portal: ${process.env.CLIENT_URL}/officer`,
        }).catch(() => {});
      });
    }

    if (io) io.emit('issue:updated', issue);
    res.json(issue);
  } catch {
    res.status(400).json({ message: 'Already upvoted' });
  }
};

const getMyIssues = async (req, res) => {
  const issues = await Issue.find({ reportedBy: req.user._id }).sort('-createdAt');
  res.json(issues);
};

module.exports = { createIssue, getIssues, getIssue, updateIssue, upvoteIssue, getMyIssues, setIO };
