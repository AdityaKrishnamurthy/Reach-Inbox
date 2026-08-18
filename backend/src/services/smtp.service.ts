import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { Sender } from '../types/db';

export interface SendEmailPayload {
  sender?: Sender | null;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
  response: string;
}

export class SmtpService {
  private static cachedTransporters = new Map<string, Transporter>();
  private static defaultEtherealAccount: nodemailer.TestAccount | null = null;

  /**
   * Initializes or retrieves a default Ethereal test account if credentials are not specified
   */
  private static async getDefaultEtherealAccount(): Promise<nodemailer.TestAccount> {
    if (!this.defaultEtherealAccount) {
      if (config.smtp.user && config.smtp.pass) {
        this.defaultEtherealAccount = {
          user: config.smtp.user,
          pass: config.smtp.pass,
          smtp: { host: config.smtp.host, port: config.smtp.port, secure: false },
          imap: { host: 'imap.ethereal.email', port: 993, secure: true },
          pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
          web: 'https://ethereal.email',
        };
      } else {
        console.log('[SMTP] Creating ephemeral Ethereal test account for demo...');
        this.defaultEtherealAccount = await nodemailer.createTestAccount();
        console.log(`[SMTP] Ethereal account created: ${this.defaultEtherealAccount.user}`);
      }
    }
    return this.defaultEtherealAccount;
  }

  /**
   * Creates or gets cached Nodemailer Transporter for a sender
   */
  static async getTransporter(sender?: Sender | null): Promise<{ transporter: Transporter; fromAddress: string }> {
    const senderKey = sender ? sender.id : 'default';

    if (this.cachedTransporters.has(senderKey)) {
      const transporter = this.cachedTransporters.get(senderKey)!;
      const fromAddress = sender
        ? `"${sender.display_name}" <${sender.email}>`
        : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`;
      return { transporter, fromAddress };
    }

    let host = sender?.smtp_host || config.smtp.host;
    let port = sender?.smtp_port || config.smtp.port;
    let user = sender?.smtp_user || config.smtp.user;
    let pass = sender?.smtp_pass || config.smtp.pass;
    let secure = sender?.smtp_secure || false;
    let fromEmail = sender?.email || config.smtp.fromEmail;
    let fromName = sender?.display_name || config.smtp.fromName;

    // If credentials are dummy/empty, generate or use Ethereal test account
    if (!user || !pass || pass === 'demopass') {
      const ethereal = await this.getDefaultEtherealAccount();
      host = ethereal.smtp.host;
      port = ethereal.smtp.port;
      user = ethereal.user;
      pass = ethereal.pass;
      secure = ethereal.smtp.secure;
      fromEmail = user;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.cachedTransporters.set(senderKey, transporter);

    const fromAddress = `"${fromName}" <${fromEmail}>`;
    return { transporter, fromAddress };
  }

  /**
   * Sends an email via SMTP and captures test preview URL
   */
  static async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const { sender, to, subject, html, text } = payload;
    const { transporter, fromAddress } = await this.getTransporter(sender);

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>?/gm, '') || '',
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    if (previewUrl) {
      console.log(`[SMTP Sent] To: ${to} | Subject: "${subject}" | Preview: ${previewUrl}`);
    } else {
      console.log(`[SMTP Sent] To: ${to} | MessageID: ${info.messageId}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
      response: info.response || 'Message sent',
    };
  }
}
