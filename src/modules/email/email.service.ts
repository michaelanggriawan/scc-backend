import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Thin wrapper over Resend (https://resend.com). If no API key is configured
// yet, emails are logged to the console instead of sent — so the whole flow
// works end-to-end before the real key is plugged in. Nothing else in the app
// needs to change once RESEND_API_KEY is set.
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('email.resendApiKey');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend enabled — emails will be sent.');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not set — emails will be logged, not sent. Plug in the key to go live.',
      );
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const fromEmail =
      this.config.get<string>('email.from') || 'no-reply@scc.example.com';
    const fromName = this.config.get<string>('email.fromName') || 'SCC Venue';
    const from = `${fromName} <${fromEmail}>`;

    if (!this.resend) {
      this.logger.log(
        `[EMAIL:STUB] to=${message.to} subject="${message.subject}"\n${message.text}`,
      );
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html || message.text,
      });
      if (error) {
        // Resend returns errors in the response body rather than throwing.
        this.logger.error(
          `Failed to send email to ${message.to}: ${error.message}`,
        );
        return;
      }
      this.logger.log(`Email sent to ${message.to} — "${message.subject}"`);
    } catch (err: any) {
      // Never let a mail failure break a business action; log and move on.
      this.logger.error(
        `Failed to send email to ${message.to}: ${err?.message || err}`,
      );
    }
  }
}
