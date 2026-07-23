import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

@Injectable()
export class NotifyClient {
  constructor(private jwtService: JwtService) {}

  async notifyLowStock(payload: {
    itemName: string;
    quantityOnHand: number;
    reorderThreshold: number;
    procurementEmail: string;
  }) {
    const token = this.jwtService.sign(
      { userId: 'system', hospitalId: 'system', roles: ['system'], scope: 'all' },
      { secret: process.env.INTERNAL_SERVICE_SECRET, expiresIn: '30s' },
    );

    try {
      // Uses Node's built-in fetch (Node 18+) rather than adding another
      // HTTP client dependency just for this one call.
      await fetch(`${NOTIFICATION_SERVICE_URL}/notify/inventory-low-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-token': token },
        body: JSON.stringify(payload),
      });
    } catch {
      // A missed low-stock notification shouldn't roll back a stock
      // adjustment that already committed — log-and-continue.
    }
  }
}
