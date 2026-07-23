import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationWorkers } from './notification.workers';
import { EmailAdapter, SmsAdapter, PushAdapter } from '../adapters/channel-adapters';
import { EventListener } from '../listeners/event-listener.service';

@Module({
  providers: [
    NotificationsService,
    NotificationWorkers,
    EmailAdapter,
    SmsAdapter,
    PushAdapter,
    EventListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
