import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Create nodemailer reusable transporter
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const mailUser = process.env.MAIL_FROM || env.MAIL_FROM || 'paladiyashreeval@gmail.com';
  const mailPass = process.env.MAIL_PROVIDER_API_KEY || process.env.SMTP_PASS || 'pvsdwvueyznsjhaz';

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 5,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  });

  return transporter;
}

export interface TicketReplyEmailParams {
  to: string;
  userName: string;
  ticketNumber: string;
  issueType: string;
  userQuestion: string;
  adminAnswer: string;
}

export async function sendTicketReplyEmail(params: TicketReplyEmailParams): Promise<boolean> {
  try {
    const transport = await getTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: #2563eb; color: #ffffff; padding: 24px 32px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
          .content { padding: 32px; }
          .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
          .box { background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px; margin: 20px 0; }
          .box-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
          .box-text { font-size: 14px; line-height: 1.5; color: #334155; margin: 0; }
          .answer-box { background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin: 20px 0; }
          .answer-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #065f46; margin-bottom: 6px; }
          .answer-text { font-size: 15px; line-height: 1.6; color: #064e3b; margin: 0; font-weight: 500; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bivio Support Team</h1>
            <div class="badge">Ticket #${params.ticketNumber} · ${params.issueType}</div>
          </div>
          <div class="content">
            <div class="greeting">Hello ${params.userName},</div>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">
              Our administrator team has reviewed your support inquiry and provided an answer below.
            </p>

            <div class="box">
              <div class="box-title">Your Submitted Concern</div>
              <p class="box-text">${params.userQuestion}</p>
            </div>

            <div class="answer-box">
              <div class="answer-title">Official Administrator Response</div>
              <p class="answer-text">${params.adminAnswer}</p>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 24px;">
              If you have any further questions or your issue persists, you can respond by submitting an updated support ticket on your desk.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Bivio Platform. All rights reserved.<br>
            This is an automated notification regarding support ticket #${params.ticketNumber}.
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`\n📧 [EMAIL DISPATCH] Sending support response email to: ${params.to}`);
    console.log(`📋 Ticket: #${params.ticketNumber} | Category: ${params.issueType}`);
    console.log(`💬 Admin Response: "${params.adminAnswer}"\n`);

    // Send the email via transporter
    await transport.sendMail({
      from: `"Bivio Support" <${env.MAIL_FROM}>`,
      to: params.to,
      subject: `[Bivio Support] Response to Ticket #${params.ticketNumber} (${params.issueType})`,
      html: htmlContent,
    });

    return true;
  } catch (err) {
    console.error('Failed to send ticket reply email:', err);
    return false;
  }
}
