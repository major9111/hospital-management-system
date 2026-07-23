import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationsService } from './notifications.service';

// Other services (ehr-service, billing-service) PUBLISH domain events here
// rather than calling this service's HTTP API directly — keeps them
// decoupled from notification-service's uptime, and a burst of events
// (e.g. a bulk appointment import) doesn't need a synchronous response.
//
// Event payloads include the recipient's contact info directly (email/
// phone) rather than a bare id, so this service never needs its own
// connection to the core Postgres database.

interface AppointmentBookedEvent {
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt: string;
  department: string;
}

interface LowStockEvent {
  itemName: string;
  quantityOnHand: number;
  reorderThreshold: number;
  procurementEmail: string;
}

interface AiEscalationEvent {
  patientPhone?: string;
  reason: string;
  sessionId: string;
}

@Injectable()
export class EventListener implements OnModuleInit {
  private readonly logger = new Logger(EventListener.name);
  private subscriber = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  constructor(private notifications: NotificationsService) {}

  onModuleInit() {
    this.subscriber.subscribe(
      'events:appointment_booked',
      'events:inventory_low_stock',
      'events:ai_escalation',
    );

    this.subscriber.on('message', async (channel, message) => {
      try {
        const event = JSON.parse(message);
        await this.handle(channel, event);
      } catch (err) {
        this.logger.error(`Failed to handle event on ${channel}: ${err}`);
      }
    });

    this.logger.log('Subscribed to domain events for notification triggers');
  }

  private async handle(channel: string, event: unknown) {
    switch (channel) {
      case 'events:appointment_booked': {
        const e = event as AppointmentBookedEvent;
        if (e.patientEmail) {
          await this.notifications.sendEmail({
            to: e.patientEmail,
            subject: 'Appointment confirmed',
            body: `Your appointment in ${e.department} is confirmed for ${e.scheduledAt}.`,
          });
        }
        if (e.patientPhone) {
          await this.notifications.sendSms({
            to: e.patientPhone,
            body: `Appointment confirmed: ${e.department} at ${e.scheduledAt}.`,
          });
        }
        break;
      }
      case 'events:inventory_low_stock': {
        const e = event as LowStockEvent;
        await this.notifications.sendEmail({
          to: e.procurementEmail,
          subject: `Low stock: ${e.itemName}`,
          body: `${e.itemName} is at ${e.quantityOnHand}, at or below the reorder threshold of ${e.reorderThreshold}.`,
        });
        break;
      }
      case 'events:ai_escalation': {
        const e = event as AiEscalationEvent;
        // Escalations go to the on-duty front-desk/nurse queue, not the
        // patient — the patient already gets the "connecting you" message
        // directly from ai-service's chat response.
        this.logger.warn(`AI escalation (session ${e.sessionId}): ${e.reason}`);
        break;
      }
      default:
        this.logger.warn(`Unhandled event channel: ${channel}`);
    }
  }
}
