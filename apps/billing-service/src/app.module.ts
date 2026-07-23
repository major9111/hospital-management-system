import { Module } from '@nestjs/common';
import { BillingModule } from './billing/billing.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [BillingModule, InventoryModule],
})
export class AppModule {}
