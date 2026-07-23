import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { NotifyClient } from '../notifications/notify-client.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [InventoryController],
  providers: [InventoryService, NotifyClient],
})
export class InventoryModule {}
