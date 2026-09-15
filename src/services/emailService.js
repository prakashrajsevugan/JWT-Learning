const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp) => {
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_EMAIL,
        to: email,
        subject: "Verify your email",
        html: `
            <h2>Email Verification</h2>

            <p>Your verification OTP is:</p>

            <h1>${otp}</h1>

            <p>This OTP expires in 10 minutes.</p>

            <p>
                If you did not request this code,
                you can safely ignore this email.
            </p>
        `
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error("Failed to send OTP email");
    }

    console.log("Email sent:", data.id);
};

module.exports = {
    sendOTPEmail
};