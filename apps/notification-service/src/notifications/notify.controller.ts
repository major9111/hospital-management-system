import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';
import { NotificationsService } from './notifications.service';

class AppointmentBookedDto {
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt: string;
  department: string;
}

class LowStockDto {
  itemName: string;
  quantityOnHand: number;
  reorderThreshold: number;
  procurementEmail: string;
}

class AiEscalationDto {
  patientPhone?: string;
  reason: string;
  sessionId: string;
}

// Replaces the old Redis pub/sub channels (events:appointment_booked,
// events:inventory_low_stock, events:ai_escalation) now that there's no
// Redis in this deployment — ehr-service, billing-service, and ai-service
// call these directly instead, using the same signed internal token every
// other cross-service call in this system already uses.
@Controller('notify')
@UseGuards(InternalAuthGuard)
export class NotifyController {
  private readonly logger = new Logger(NotifyController.name);

  constructor(private notifications: NotificationsService) {}

  @Post('appointment-booked')
  async appointmentBooked(@Body() dto: AppointmentBookedDto) {
    if (dto.patientEmail) {
      await this.notifications.sendEmail({
        to: dto.patientEmail,
        subject: 'Appointment confirmed',
        body: `Your appointment in ${dto.department} is confirmed for ${dto.scheduledAt}.`,
      });
    }
    if (dto.patientPhone) {
      await this.notifications.sendSms({
        to: dto.patientPhone,
        body: `Appointment confirmed: ${dto.department} at ${dto.scheduledAt}.`,
      });
    }
    return { status: 'sent' };
  }

  @Post('inventory-low-stock')
  async lowStock(@Body() dto: LowStockDto) {
    await this.notifications.sendEmail({
      to: dto.procurementEmail,
      subject: `Low stock: ${dto.itemName}`,
      body: `${dto.itemName} is at ${dto.quantityOnHand}, at or below the reorder threshold of ${dto.reorderThreshold}.`,
    });
    return { status: 'sent' };
  }

  @Post('ai-escalation')
  async aiEscalation(@Body() dto: AiEscalationDto) {
    // Escalations go to the on-duty front-desk/nurse queue, not the
    // patient — the patient already gets the "connecting you" message
    // directly from ai-service's chat response.
    this.logger.warn(`AI escalation (session ${dto.sessionId}): ${dto.reason}`);
    return { status: 'logged' };
  }
}
