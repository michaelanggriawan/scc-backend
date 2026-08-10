import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Thin wrapper over SendGrid. If no API key is configured yet, emails are
// logged to the console instead of sent — so the whole flow works end-to-end
// before the real key is plugged in. Nothing else in the app needs to change
// once SENDGRID_API_KEY is set.
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('email.sendgridApiKey');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.enabled = true;
      this.logger.log('SendGrid enabled — emails will be sent.');
    } else {
      this.logger.warn(
        'SENDGRID_API_KEY not set — emails will be logged, not sent. Plug in the key to go live.',
      );
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const from = {
      email: this.config.get<string>('email.from') || 'no-reply@scc.example.com',
      name: this.config.get<string>('email.fromName') || 'SCC Venue',
    };

    if (!this.enabled) {
      this.logger.log(
        `[EMAIL:STUB] to=${message.to} subject="${message.subject}"\n${message.text}`,
      );
      return;
    }

    try {
      await sgMail.send({
        to: message.to,
        from,
        subject: message.subject,
        text: message.text,
        html: message.html || message.text,
      });
      this.logger.log(`Email sent to ${message.to} — "${message.subject}"`);
    } catch (err: any) {
      // Never let a mail failure break a business action; log and move on.
      this.logger.error(
        `Failed to send email to ${message.to}: ${err?.message || err}`,
      );
    }
  }
}
