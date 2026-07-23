import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotifyController } from './notify.controller';
import { EmailAdapter, SmsAdapter, PushAdapter } from '../adapters/channel-adapters';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotifyController],
  providers: [NotificationsService, EmailAdapter, SmsAdapter, PushAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
