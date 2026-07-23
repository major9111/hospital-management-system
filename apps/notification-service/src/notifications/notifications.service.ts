import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationPayload } from '../adapters/channel-adapters';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

// One queue per channel so a burst of SMS traffic can't starve email
// delivery (or vice versa), and each channel gets its own retry policy.
const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: false, // keep failures around for manual inspection/alerting
};

@Injectable()
export class NotificationsService {
  private emailQueue = new Queue('email', { connection, defaultJobOptions });
  private smsQueue = new Queue('sms', { connection, defaultJobOptions });
  private pushQueue = new Queue('push', { connection, defaultJobOptions });

  async sendEmail(payload: NotificationPayload) {
    await this.emailQueue.add('send', payload);
  }

  async sendSms(payload: NotificationPayload) {
    await this.smsQueue.add('send', payload);
  }

  async sendPush(payload: NotificationPayload) {
    await this.pushQueue.add('send', payload);
  }
}
