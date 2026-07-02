const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'BandLogic <hello@bandlogic.online>'; // Replace with verified domain

/**
 * Send a transactional email.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML email body.
 */
async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Skipping email (no RESEND_API_KEY):', to, subject);
    return null;
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail,
};
