const webpush = require('web-push');

let vapidSet = false;
const ensureVapid = () => {
  if (!vapidSet) {
    webpush.setVapidDetails(
      'mailto:' + process.env.EMAIL_USER,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidSet = true;
  }
};

const sendPush = async (subscription, payload) => {
  ensureVapid();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 410) return 'expired';
    console.error('Push failed:', e.message);
  }
};

module.exports = { sendPush };
