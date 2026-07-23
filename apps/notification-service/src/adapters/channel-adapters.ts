import { Injectable, Logger } from '@nestjs/common';

export interface NotificationPayload {
  to: string;
  subject?: string; // email only
  body: string;
}

// Each adapter is intentionally a thin interface so swapping providers
// later (e.g. moving from console logging in dev to a real provider in
// production) never touches the calling code in notifications.service.ts.

@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger(EmailAdapter.name);

  async send(payload: NotificationPayload) {
    // Swap point: SendGrid, SES, Postmark, etc. Keep the interface identical.
    this.logger.log(`[EMAIL -> ${payload.to}] ${payload.subject}: ${payload.body}`);
  }
}

@Injectable()
export class SmsAdapter {
  private readonly logger = new Logger(SmsAdapter.name);

  async send(payload: NotificationPayload) {
    // Swap point: Twilio, Termii, Africa's Talking (good SMS coverage in
    // Nigeria specifically) — keep the interface identical.
    this.logger.log(`[SMS -> ${payload.to}] ${payload.body}`);
  }
}

@Injectable()
export class PushAdapter {
  private readonly logger = new Logger(PushAdapter.name);

  async send(payload: NotificationPayload) {
    // Swap point: Firebase Cloud Messaging, OneSignal.
    this.logger.log(`[PUSH -> ${payload.to}] ${payload.body}`);
  }
}
