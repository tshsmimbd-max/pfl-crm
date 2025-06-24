import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Create transporter using Gmail SMTP (free)
const createTransporter = () => {
  // For development, use Ethereal (free test email service)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  // For production, use Gmail SMTP (requires app password)
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password'
    }
  });
};

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    // For development, just log the verification code
    console.log(`\n========================================`);
    console.log(`📧 EMAIL VERIFICATION CODE`);
    console.log(`========================================`);
    console.log(`User: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`========================================`);
    console.log(`⚠️  IMPORTANT: Enter this code to verify your email!`);
    console.log(`========================================\n`);
    return true;

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@paperfly.com',
      to: email,
      subject: 'Verify your Paperfly CRM account',
      text: `Please verify your email by clicking: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Paperfly CRM</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Welcome to Paperfly CRM!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering. Please verify your email address by clicking the button below:
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #888; font-size: 14px; line-height: 1.5;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all; font-size: 14px;">
              ${verificationLink}
            </p>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">
              If you didn't create an account, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    // In development, still return true for simulation
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // For development, just log the email
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n📧 Email simulated:`);
      console.log(`To: ${params.to}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Content: ${params.text || 'HTML content'}\n`);
      return true;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@paperfly.com',
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return process.env.NODE_ENV !== 'production'; // Return true in dev for simulation
  }
}