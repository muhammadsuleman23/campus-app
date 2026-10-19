const nodemailer = require("nodemailer");

if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.warn(
    "⚠️  EMAIL_USER / EMAIL_APP_PASSWORD not set in .env — OTP emails will fail to send."
  );
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE !== "false", // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendOtpEmail = async (toEmail, name, code) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #111827; margin-bottom: 4px;">Verify your email</h2>
      <p style="color: #4b5563;">Hi ${name || ""}, use the code below to verify your Campus App account.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f3f4f6; color: #111827; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your Campus App verification code",
    html,
  });
};

const sendPasswordResetEmail = async (toEmail, name, code) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #111827; margin-bottom: 4px;">Reset your password</h2>
      <p style="color: #4b5563;">Hi ${name || ""}, use the code below to reset your Campus App password.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f3f4f6; color: #111827; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email — your password will stay the same.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: "Reset your Campus App password",
    html,
  });
};

module.exports = { transporter, sendOtpEmail, sendPasswordResetEmail };
