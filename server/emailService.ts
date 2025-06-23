import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`Verification email simulated for ${email} with token: ${verificationToken}`);
    return true; // Simulate success when no API key is provided
  }

  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:5000';
    
    const verificationLink = `${baseUrl}/api/verify-email?token=${verificationToken}`;
    
    const msg = {
      to: email,
      from: 'noreply@paperfly.com', // Use your verified sender
      subject: 'Verify your Paperfly CRM account',
      text: `Please verify your email by clicking: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Paperfly CRM!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can also click this link:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`Email simulated to ${params.to}: ${params.subject}`);
    return true;
  }

  try {
    const msg = {
      to: params.to,
      from: 'noreply@paperfly.com', // Use your verified sender
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}