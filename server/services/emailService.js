// server/services/emailService.js
const { BrevoClient } = require('@getbrevo/brevo');

if (!process.env.BREVO_API_KEY) {
  console.warn('BREVO_API_KEY is not set. Emails will fail until the env var is configured.');
}

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

/**
 * Sends a password reset email
 * @param {string} email
 * @param {string} token
 */
const sendPasswordResetEmail = async (email, token) => {
  try {
    const sendSmtpEmail = {
      sender: {
        name: 'Glitch App',
        email: 'akumahsuh8@gmail.com'
      },
      to: [{ email }],
      subject: 'Glitch: Your Password Reset Code',
      htmlContent: `
        <div style="font-family: Arial; padding:20px;">
          <h2>Glitch Password Reset</h2>
          <p>Your reset code:</p>
          <h1>${token}</h1>
          <p>Valid for 1 hour</p>
        </div>
      `
    };

    const result = await brevo.transactionalEmails.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Email sent:', result);
    return result;
  } catch (error) {
    // Prefer the SDK response body when available
    const details = error?.response?.body ?? error?.message ?? error;
    console.error('❌ Email error:', details);
    throw new Error('Failed to send reset email');
  }
};

module.exports = { sendPasswordResetEmail };