import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { EmailAdapter, SmsAdapter, PushAdapter } from '../adapters/channel-adapters';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

@Injectable()
export class NotificationWorkers implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorkers.name);

  constructor(
    private emailAdapter: EmailAdapter,
    private smsAdapter: SmsAdapter,
    private pushAdapter: PushAdapter,
  ) {}

  onModuleInit() {
    new Worker('email', async (job) => this.emailAdapter.send(job.data), { connection });
    new Worker('sms', async (job) => this.smsAdapter.send(job.data), { connection });
    new Worker('push', async (job) => this.pushAdapter.send(job.data), { connection });
    this.logger.log('Notification workers started (email, sms, push)');
  }
}
