import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { billingPgPool } from '../db/pg-pool';

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class InvoicesService {
  async createInvoice(
    hospitalId: string,
    patientId: string,
    appointmentId: string | null,
    items: InvoiceItemInput[],
  ) {
    if (items.length === 0) {
      throw new BadRequestException('Invoice needs at least one line item');
    }

    const client = await billingPgPool.connect();
    try {
      await client.query('BEGIN');

      const invoiceInsert = await client.query(
        `INSERT INTO billing.invoices (hospital_id, patient_id, appointment_id, status)
         VALUES ($1, $2, $3, 'issued') RETURNING id`,
        [hospitalId, patientId, appointmentId],
      );
      const invoiceId = invoiceInsert.rows[0].id;

      for (const item of items) {
        await client.query(
          `INSERT INTO billing.invoice_items (invoice_id, description, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [invoiceId, item.description, item.quantity, item.unitPrice],
        );
      }

      const totalResult = await client.query(
        `SELECT COALESCE(SUM(line_total), 0) AS total FROM billing.invoice_items WHERE invoice_id = $1`,
        [invoiceId],
      );
      const total = totalResult.rows[0].total;

      await client.query(`UPDATE billing.invoices SET total_amount = $1 WHERE id = $2`, [
        total,
        invoiceId,
      ]);

      await client.query('COMMIT');
      return { id: invoiceId, totalAmount: total, status: 'issued' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordPayment(
    hospitalId: string,
    invoiceId: string,
    amount: number,
    method: string,
    reference?: string,
  ) {
    const invoiceResult = await billingPgPool.query(
      `SELECT * FROM billing.invoices WHERE id = $1 AND hospital_id = $2`,
      [invoiceId, hospitalId],
    );
    if (invoiceResult.rowCount === 0) {
      throw new NotFoundException('Invoice not found');
    }
    const invoice = invoiceResult.rows[0];

    await billingPgPool.query(
      `INSERT INTO billing.payments (invoice_id, amount, method, reference) VALUES ($1, $2, $3, $4)`,
      [invoiceId, amount, method, reference ?? null],
    );

    const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
    const newStatus =
      newAmountPaid >= Number(invoice.total_amount) ? 'paid' : 'partially_paid';

    await billingPgPool.query(
      `UPDATE billing.invoices SET amount_paid = $1, status = $2, updated_at = now() WHERE id = $3`,
      [newAmountPaid, newStatus, invoiceId],
    );

    return { invoiceId, amountPaid: newAmountPaid, status: newStatus };
  }

  async getInvoice(hospitalId: string, invoiceId: string) {
    const invoiceResult = await billingPgPool.query(
      `SELECT * FROM billing.invoices WHERE id = $1 AND hospital_id = $2`,
      [invoiceId, hospitalId],
    );
    if (invoiceResult.rowCount === 0) throw new NotFoundException('Invoice not found');

    const itemsResult = await billingPgPool.query(
      `SELECT * FROM billing.invoice_items WHERE invoice_id = $1`,
      [invoiceId],
    );

    return { ...invoiceResult.rows[0], items: itemsResult.rows };
  }
}
