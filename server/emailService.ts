import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Simple email configuration for development
const createTransporter = () => {
  // For development, we'll use a simple configuration that falls back to console
  return nodemailer.createTransporter({
    // Use a simple SMTP test configuration
    host: 'localhost',
    port: 587,
    secure: false,
    // Skip authentication for local testing
    auth: undefined,
    // Ignore TLS errors for development
    tls: {
      rejectUnauthorized: false
    }
  });
};

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"Paperfly CRM" <noreply@paperfly.com>',
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    };

    // For development, we'll simulate email sending
    console.log(`Email would be sent to: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    return false; // Intentionally return false to trigger console fallback
  } catch (error) {
    console.error('Email configuration not available');
    return false;
  }
}

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    // Try to send email first
    const emailSent = await sendEmail({
      to: email,
      subject: "Paperfly CRM - Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Paperfly CRM</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering with Paperfly CRM! To complete your registration, please enter the verification code below:
            </p>
            
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
              <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">Enter this code in the verification form</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              This code will expire in 15 minutes for security purposes. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
              <p>© 2025 Paperfly CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Paperfly CRM - Email Verification
        
        Thank you for registering! Your verification code is: ${code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this verification, please ignore this email.
      `
    });

    if (emailSent) {
      console.log(`Verification email sent to: ${email}`);
      return true;
    } else {
      // Display code in console as fallback
      console.log(`\n========================================`);
      console.log(`📧 EMAIL VERIFICATION CODE`);
      console.log(`========================================`);
      console.log(`User: ${email}`);
      console.log(`Verification Code: ${code}`);
      console.log(`========================================`);
      console.log(`⚠️  Enter this code to verify your email!`);
      console.log(`========================================\n`);
      return true;
    }
  } catch (error) {
    console.error("Email service error:", error);
    // Always show verification code in console for development
    console.log(`\n========================================`);
    console.log(`📧 EMAIL VERIFICATION CODE`);
    console.log(`========================================`);
    console.log(`User: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`========================================`);
    console.log(`⚠️  Enter this code to verify your email!`);
    console.log(`========================================\n`);
    return true;
  }
}