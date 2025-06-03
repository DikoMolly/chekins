import nodemailer from 'nodemailer';
require('dotenv').config();

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: Number(process.env.EMAIL_PORT),
      secure: Boolean(process.env.SECURE),
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: process.env.USER,
      ...options,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (
  email: string,
  code: string,
): Promise<void> => {
  const emailContent = {
    to: email,
    subject: 'Verify Your Email',
    text: `Your verification code is: ${code}. This code will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Our Platform!</h2>
        <p>Please verify your email address by entering the following code:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5;">
          ${code}
        </h1>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `,
  };

  await sendEmail(emailContent);
};
