import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Create Gmail SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Check if Gmail credentials are available
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log('Gmail credentials not found, using console fallback');
      return logToConsole(params);
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Paperfly CRM" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully via Gmail SMTP to: ${params.to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Gmail SMTP failed:', error);
    console.log('Falling back to console logging...');
    return logToConsole(params);
  }
}

// Console fallback function
function logToConsole(params: EmailParams): boolean {
  console.log(`\n========================================`);
  console.log(`📧 EMAIL NOTIFICATION (Console Fallback)`);
  console.log(`========================================`);
  console.log(`To: ${params.to}`);
  console.log(`Subject: ${params.subject}`);
  console.log(`Content: ${params.text || params.html?.replace(/<[^>]*>/g, '') || ''}`);
  console.log(`========================================`);
  console.log(`⚠️  SMTP unavailable - using console display`);
  console.log(`📱 Please copy the code from above`);
  console.log(`========================================\n`);
  return true;
}

export async function sendTargetAssignmentEmail(email: string, targetInfo: {
  assignedUser: string;
  assigner: string;
  period: string;
  targetValue: number;
  orderTarget?: number;
  arpoTarget?: number;
  merchantsAcquisition?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}): Promise<boolean> {
  try {
    const formatDate = (date?: Date) => date ? new Date(date).toLocaleDateString() : 'N/A';
    const formatCurrency = (amount?: number) => amount ? `৳${amount.toLocaleString()}` : 'N/A';

    const emailSent = await sendEmail({
      to: email,
      subject: "📊 New Target Assigned - Paperfly CRM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎯 Target Assignment</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">New ${targetInfo.period} target has been set for you</p>
          </div>
          
          <div style="background: white; padding: 30px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello ${targetInfo.assignedUser}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              <strong>${targetInfo.assigner}</strong> has assigned you a new ${targetInfo.period} target. Here are the details:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">📈 Target Metrics</h3>
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">Revenue Target:</span>
                  <span style="color: #28a745; font-weight: bold;">${formatCurrency(targetInfo.targetValue)}</span>
                </div>
                ${targetInfo.orderTarget ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">Order Target:</span>
                  <span style="color: #17a2b8; font-weight: bold;">${targetInfo.orderTarget} orders</span>
                </div>
                ` : ''}
                ${targetInfo.arpoTarget ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">ARPO Target:</span>
                  <span style="color: #fd7e14; font-weight: bold;">${formatCurrency(targetInfo.arpoTarget)}</span>
                </div>
                ` : ''}
                ${targetInfo.merchantsAcquisition ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">Merchants Target:</span>
                  <span style="color: #6f42c1; font-weight: bold;">${targetInfo.merchantsAcquisition} merchants</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">📅 Timeline</h4>
              <p style="margin: 5px 0; color: #455a64;"><strong>Period:</strong> ${targetInfo.period}</p>
              <p style="margin: 5px 0; color: #455a64;"><strong>Start Date:</strong> ${formatDate(targetInfo.startDate)}</p>
              <p style="margin: 5px 0; color: #455a64;"><strong>End Date:</strong> ${formatDate(targetInfo.endDate)}</p>
            </div>
            
            ${targetInfo.description ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">📝 Additional Notes</h4>
              <p style="color: #856404; margin: 0;">${targetInfo.description}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; margin-bottom: 15px;">Track your progress and manage your targets in the CRM dashboard.</p>
              <p style="color: #999; font-size: 12px;">
                This is an automated notification from Paperfly CRM System<br>
                If you have any questions, please contact your team manager.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `New Target Assignment - Paperfly CRM
      
Hello ${targetInfo.assignedUser},

${targetInfo.assigner} has assigned you a new ${targetInfo.period} target:

Revenue Target: ${formatCurrency(targetInfo.targetValue)}
${targetInfo.orderTarget ? `Order Target: ${targetInfo.orderTarget} orders` : ''}
${targetInfo.arpoTarget ? `ARPO Target: ${formatCurrency(targetInfo.arpoTarget)}` : ''}
${targetInfo.merchantsAcquisition ? `Merchants Target: ${targetInfo.merchantsAcquisition} merchants` : ''}

Timeline: ${formatDate(targetInfo.startDate)} - ${formatDate(targetInfo.endDate)}
${targetInfo.description ? `\nNotes: ${targetInfo.description}` : ''}

Please log into the CRM dashboard to track your progress.

Best regards,
Paperfly CRM System`
    });

    return emailSent;
  } catch (error) {
    console.error('Failed to send target assignment email:', error);
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

// Password reset email function
export async function sendPasswordResetCode(email: string, code: string, employeeName: string): Promise<boolean> {
  try {
    const emailSent = await sendEmail({
      to: email,
      subject: "Paperfly CRM - Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Paperfly CRM</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6;">
              Hi ${employeeName}, we received a request to reset your password for your Paperfly CRM account. Please enter the code below to reset your password:
            </p>
            
            <div style="background: #f8f9fa; border: 2px dashed #e74c3c; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #e74c3c; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
              <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">Enter this code to reset your password</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Important:</strong> This code will expire in 15 minutes for security purposes.
              </p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;">
                <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact your system administrator immediately.
              </p>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
              <p>© 2025 Paperfly CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
      text: `
Paperfly CRM - Password Reset

Hi ${employeeName},

We received a request to reset your password for your Paperfly CRM account.

Your password reset code is: ${code}

Please enter this code to reset your password.

This code will expire in 15 minutes.

If you did not request a password reset, please ignore this email or contact your system administrator.

© 2025 Paperfly CRM
      `
    });

    if (emailSent) {
      console.log(`Password reset email sent to: ${email}`);
      return true;
    } else {
      // Fallback to console display
      console.log(`\n========================================`);
      console.log(`🔒 PASSWORD RESET CODE`);
      console.log(`========================================`);
      console.log(`User: ${email} (${employeeName})`);
      console.log(`Reset Code: ${code}`);
      console.log(`========================================`);
      console.log(`⚠️  Email service failed - using console`);
      console.log(`========================================\n`);
      return true;
    }
  } catch (error) {
    console.error("Password reset email error:", error);
    // Always show code in console as fallback
    console.log(`\n========================================`);
    console.log(`🔒 PASSWORD RESET CODE`);
    console.log(`========================================`);
    console.log(`User: ${email} (${employeeName})`);
    console.log(`Reset Code: ${code}`);
    console.log(`========================================`);
    console.log(`⚠️  Email service failed - using console`);
    console.log(`========================================\n`);
    return true;
  }
}