const brevo = require('@getbrevo/brevo');

// Initialize API client properly (NEW SDK way)
const apiInstance = new brevo.TransactionalEmailsApi();

// Set API key (NEW WAY)
apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

/**
 * Sends a password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
    try {
        const sendSmtpEmail = {
            to: [{ email }],
            sender: {
                name: "Glitch App",
                email: "akumahsuh8@gmail.com"
            },
            subject: "Glitch: Your Password Reset Code",
            htmlContent: `
                <div style="font-family: Arial; padding:20px;">
                    <h2>Glitch Password Reset</h2>
                    <p>Your reset code:</p>
                    <h1>${token}</h1>
                    <p>Valid for 1 hour</p>
                </div>
            `
        };

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log("✅ Email sent:", result);
        return result;

    } catch (error) {
        console.error("❌ Email error:", error.response?.body || error.message);
        throw new Error("Failed to send reset email");
    }
};

module.exports = { sendPasswordResetEmail };