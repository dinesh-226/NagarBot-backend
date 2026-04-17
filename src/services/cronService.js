const cron = require('node-cron');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { generateWeeklyDigest } = require('./aiService');
const { sendEmail } = require('./emailService');

cron.schedule('0 8 * * 1', async () => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeek] = await Promise.all([
      Issue.find({ createdAt: { $gte: oneWeekAgo } }),
      Issue.find({ createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),
    ]);

    const summarize = (issues) => ({
      total: issues.length,
      byCategory: issues.reduce((a, i) => { a[i.category] = (a[i.category] || 0) + 1; return a; }, {}),
      byDepartment: issues.reduce((a, i) => { a[i.department] = (a[i.department] || 0) + 1; return a; }, {}),
      byZone: issues.reduce((a, i) => {
        const zone = i.location?.address?.split(',').slice(-2).join(',').trim() || 'Unknown';
        a[zone] = (a[zone] || 0) + 1; return a;
      }, {}),
      avgUrgency: (issues.reduce((s, i) => s + i.urgency, 0) / (issues.length || 1)).toFixed(1),
      resolved: issues.filter((i) => i.status === 'resolved').length,
      avgResolutionDays: (() => {
        const resolved = issues.filter((i) => i.status === 'resolved');
        if (!resolved.length) return 'N/A';
        const avg = resolved.reduce((s, i) => s + Math.ceil((new Date(i.updatedAt) - new Date(i.createdAt)) / 86400000), 0) / resolved.length;
        return avg.toFixed(1);
      })(),
    });

    const stats = { thisWeek: summarize(thisWeek), lastWeek: summarize(lastWeek) };
    const digest = await generateWeeklyDigest(stats);

    // Send to all approved officers + admin
    const officers = await User.find({ role: 'officer', approved: true }).select('email');
    const allEmails = [...new Set([...officers.map((o) => o.email), process.env.EMAIL_USER])];

    await sendEmail({
      to: allEmails.join(','),
      subject: `📊 NagarBot Weekly Digest — ${now.toDateString()}`,
      text: digest,
    });

    console.log(`Weekly digest sent to ${allEmails.length} recipients`);
  } catch (e) {
    console.error('Weekly digest failed:', e.message);
  }
});
