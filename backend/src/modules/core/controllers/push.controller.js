const subscriptions = []; // In-memory mock store for subscriptions (Production: save to DB)

async function subscribe(req, res, next) {
  try {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) { next(error); }
}

async function sendNotification(req, res, next) {
  try {
    const { title, body } = req.body;
    // In production, we would use web-push or firebase-admin here
    console.log(`[PUSH] Sending Notification: ${title} - ${body} to ${subscriptions.length} clients`);
    res.json({ success: true, message: 'Notification sent (Mocked)' });
  } catch (error) { next(error); }
}

module.exports = {
  subscribe,
  sendNotification
};
