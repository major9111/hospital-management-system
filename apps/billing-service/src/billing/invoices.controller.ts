import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';
import { InvoicesService } from './invoices.service';

class CreateInvoiceDto {
  patientId: string;
  appointmentId?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

class RecordPaymentDto {
  amount: number;
  method: string;
  reference?: string;
}

@Controller('invoices')
@UseGuards(InternalAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    // hospitalId always comes from the verified internal token, never from
    // the request body — a caller can't invoice against a hospital they
    // don't belong to just by changing a field in the payload.
    return this.invoicesService.createInvoice(
      req.internalContext.hospitalId,
      dto.patientId,
      dto.appointmentId ?? null,
      dto.items,
    );
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.getInvoice(req.internalContext.hospitalId, id);
  }

  @Post(':id/payments')
  async pay(@Param('id') id: string, @Body() dto: RecordPaymentDto, @Req() req: any) {
    return this.invoicesService.recordPayment(
      req.internalContext.hospitalId,
      id,
      dto.amount,
      dto.method,
      dto.reference,
    );
  }
}
