import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Create email transporter with proper Gmail SMTP configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
};

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Paperfly CRM" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to: ${params.to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    const emailSent = await sendEmail({
      to: email,
      subject: "Paperfly CRM - Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Paperfly CRM</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification Required</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering with Paperfly CRM! Please enter the verification code below to complete your registration:
            </p>
            
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
              <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">Enter this code in the verification form</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Important:</strong> This code will expire in 15 minutes for security purposes.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you didn't create an account with Paperfly CRM, please ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
              <p>© 2025 Paperfly CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
      text: `
Paperfly CRM - Email Verification

Thank you for registering with Paperfly CRM!

Your verification code is: ${code}

Please enter this code in the verification form to complete your registration.

This code will expire in 15 minutes.

If you didn't create an account, please ignore this email.

© 2025 Paperfly CRM
      `
    });

    if (emailSent) {
      console.log(`Verification email sent to: ${email}`);
      return true;
    } else {
      // Fallback to console display
      console.log(`\n========================================`);
      console.log(`📧 EMAIL VERIFICATION CODE`);
      console.log(`========================================`);
      console.log(`User: ${email}`);
      console.log(`Verification Code: ${code}`);
      console.log(`========================================`);
      console.log(`⚠️  Email service failed - using console`);
      console.log(`========================================\n`);
      return true;
    }
  } catch (error) {
    console.error("Email service error:", error);
    // Always show code in console as fallback
    console.log(`\n========================================`);
    console.log(`📧 EMAIL VERIFICATION CODE`);
    console.log(`========================================`);
    console.log(`User: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`========================================`);
    console.log(`⚠️  Email service failed - using console`);
    console.log(`========================================\n`);
    return true;
  }
}