/**
 * Email service for sending transactional emails
 * Uses nodemailer with SMTP configuration
 */

import nodemailer from 'nodemailer';

// Simple logger to avoid pino worker thread issues in Next.js dev mode
const emailLogger = {
  info: (msg: string | object, msg2?: string) => {
    const text = typeof msg === 'string' ? msg : msg2 || JSON.stringify(msg);
    console.log(`[EMAIL] ${text}`);
  },
  warn: (msg: string) => console.warn(`[EMAIL WARN] ${msg}`),
  error: (data: object, msg: string) => console.error(`[EMAIL ERROR] ${msg}`, data),
};

// Email configuration from environment
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  from: process.env.SMTP_FROM || 'noreply@arendapro.ru',
};

// Create reusable transporter
const createTransporter = () => {
  // In development, log emails to console instead of sending
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    emailLogger.info('Email service running in development mode - emails will be logged to console');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: EMAIL_CONFIG.auth,
  });
};

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, text, html } = options;

  // Development mode - just log
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    emailLogger.info('=== EMAIL (Development Mode) ===');
    emailLogger.info(`To: ${to}`);
    emailLogger.info(`Subject: ${subject}`);
    emailLogger.info(`Text: ${text || '(no text)'}`);
    emailLogger.info(`HTML: ${html ? '(html content)' : '(no html)'}`);
    emailLogger.info('================================');
    console.log('\n📧 EMAIL (Development Mode):');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text: ${text || '(no text)'}`);
    console.log('================================\n');
    return true;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      emailLogger.warn('Email transporter not configured');
      return false;
    }

    const info = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      text,
      html,
    });

    emailLogger.info({ messageId: info.messageId, to, subject }, 'Email sent successfully');
    return true;
  } catch (error) {
    emailLogger.error({ error, to, subject }, 'Failed to send email');
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

  const subject = 'Сброс пароля - Арендол';

  const text = `
Здравствуйте${userName ? `, ${userName}` : ''}!

Вы запросили сброс пароля для вашего аккаунта на платформе Арендол.

Для установки нового пароля перейдите по ссылке:
${resetLink}

Ссылка действительна в течение 1 часа.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

С уважением,
Команда Арендол
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Арендол</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">Сброс пароля</h2>

    <p>Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!</p>

    <p>Вы запросили сброс пароля для вашего аккаунта на платформе Арендол.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Установить новый пароль
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      Или скопируйте ссылку в браузер:<br>
      <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
    </p>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-top: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Важно:</strong> Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Арендол. Все права защищены.</p>
    <p style="margin: 5px 0 0;">Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
  </div>
</body>
</html>
`;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(
  email: string,
  userName?: string
): Promise<boolean> {
  const subject = 'Пароль изменён - Арендол';

  const text = `
Здравствуйте${userName ? `, ${userName}` : ''}!

Пароль для вашего аккаунта на платформе Арендол был успешно изменён.

Если это были не вы, немедленно свяжитесь с нашей службой поддержки.

С уважением,
Команда Арендол
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Пароль изменён</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Арендол</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #d1fae5; border-radius: 50%; padding: 15px;">
        <span style="font-size: 30px;">✓</span>
      </div>
    </div>

    <h2 style="color: #1f2937; margin-top: 0; text-align: center;">Пароль успешно изменён</h2>

    <p>Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!</p>

    <p>Пароль для вашего аккаунта на платформе Арендол был успешно изменён.</p>

    <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-top: 20px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Внимание:</strong> Если это были не вы, немедленно свяжитесь с нашей службой поддержки.
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Арендол. Все права защищены.</p>
  </div>
</body>
</html>
`;

  return sendEmail({ to: email, subject, text, html });
}
