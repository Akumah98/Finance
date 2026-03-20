const SibApiV3Sdk = require('@getbrevo/brevo');

// Create API client instance
const client = SibApiV3Sdk.ApiClient.instance;

// Set API key correctly
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Create email API instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Sends a password reset email to the user with a 6-digit token.
 * @param {string} email - The user's email address.
 * @param {string} token - The 6-digit reset token.
 */
const sendPasswordResetEmail = async (email, token) => {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.subject = "Glitch: Your Password Reset Code";

        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Glitch Password Reset</h2>
                <p>Hello,</p>
                <p>You requested to reset your password. Please use the 6-digit code below to proceed:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border-radius: 5px; margin: 20px 0;">
                    ${token}
                </div>
                <p>This code is valid for <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #777;">Best regards,<br>The Glitch Team</p>
            </div>
        `;

        sendSmtpEmail.sender = {
            name: "Glitch App",
            email: "akumahsuh8@gmail.com"
        };

        sendSmtpEmail.to = [
            { email: email }
        ];

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log("✅ Reset email sent:", result);
        return result;

    } catch (error) {
        console.error("❌ Email error:", error?.response?.body || error.message);
        throw new Error("Failed to send reset email");
    }
};

module.exports = {
    sendPasswordResetEmail
};