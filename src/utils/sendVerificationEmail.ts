import { sendEmail } from './send-email';

export const sendVerificationEmail = async (email: string, code: string) : Promise<void> => {
    const emailContent = {
      to: email,
      subject: 'Verify Your Email Address',
      text: `Your verification code is: ${code}. This code will expire in 1 hour.`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333;">Email Verification</h2>
        </div>
        <p style="color: #555; font-size: 16px;">Thank you for registering! Please verify your email address by entering the following code:</p>
        <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
          <h2 style="letter-spacing: 5px; color: #333; margin: 0; font-size: 28px;">${code}</h2>
        </div>
        <p style="color: #555; font-size: 14px;">This verification code will expire in <strong>1 hour</strong>.</p>
        <p style="color: #555; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 12px; text-align: center;">
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    `,
    };

    try {
        await sendEmail(emailContent);  
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
  }
};
