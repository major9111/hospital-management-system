import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class BillingModule {}
