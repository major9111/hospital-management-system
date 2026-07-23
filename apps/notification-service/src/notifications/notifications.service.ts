import { Injectable, Logger } from '@nestjs/common';
import { EmailAdapter, SmsAdapter, PushAdapter, NotificationPayload } from '../adapters/channel-adapters';

// No queue backing this anymore (BullMQ needed Redis, which this
// deployment doesn't have) — sends land directly. This means a failed
// send doesn't automatically retry the way it did before; each call does
// one built-in retry with a short delay, then gives up and logs. If you
// add Redis back later (e.g. Render's free Key Value tier), swap this
// back to the BullMQ version for real retry/backoff and a dead-letter view.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private emailAdapter: EmailAdapter,
    private smsAdapter: SmsAdapter,
    private pushAdapter: PushAdapter,
  ) {}

  async sendEmail(payload: NotificationPayload) {
    await this.sendWithRetry(() => this.emailAdapter.send(payload), 'email');
  }

  async sendSms(payload: NotificationPayload) {
    await this.sendWithRetry(() => this.smsAdapter.send(payload), 'sms');
  }

  async sendPush(payload: NotificationPayload) {
    await this.sendWithRetry(() => this.pushAdapter.send(payload), 'push');
  }

  private async sendWithRetry(fn: () => Promise<void>, label: string) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`${label} send failed, retrying once: ${err}`);
      try {
        await new Promise((r) => setTimeout(r, 1000));
        await fn();
      } catch (err2) {
        this.logger.error(`${label} send failed after retry, giving up: ${err2}`);
      }
    }
  }
}
