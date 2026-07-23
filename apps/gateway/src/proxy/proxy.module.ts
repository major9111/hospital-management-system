import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InternalTokenService } from './internal-token.service';
import { EhrProxyController } from './ehr-proxy.controller';
import { AiProxyController } from './ai-proxy.controller';
import { BillingProxyController, InventoryProxyController } from './billing-proxy.controller';
import {
  PrescriptionsProxyController,
  LabProxyController,
  TelemedicineProxyController,
} from './clinical-proxy.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    EhrProxyController,
    AiProxyController,
    BillingProxyController,
    InventoryProxyController,
    PrescriptionsProxyController,
    LabProxyController,
    TelemedicineProxyController,
  ],
  providers: [InternalTokenService],
})
export class ProxyModule {}
