const { getMessaging } = require('firebase-admin/messaging');

/**
 * Send a push notification via Firebase Cloud Messaging.
 * @param {string|string[]} tokens - FCM registration token(s).
 * @param {object} payload - Notification payload { title, body, data }
 */
async function sendPushNotification(tokens, payload) {
  if (!tokens || tokens.length === 0) return;
  
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  };

  try {
    if (Array.isArray(tokens)) {
      const response = await getMessaging().sendEachForMulticast({ ...message, tokens });
      console.log(`FCM Multicast sent: ${response.successCount} successes, ${response.failureCount} failures`);
      return response;
    } else {
      const response = await getMessaging().send({ ...message, token: tokens });
      console.log(`FCM message sent to ${tokens.substring(0, 10)}...`);
      return response;
    }
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw error;
  }
}

module.exports = {
  sendPushNotification,
};
