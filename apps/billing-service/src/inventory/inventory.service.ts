import { Injectable, NotFoundException } from '@nestjs/common';
import { billingPgPool } from '../db/pg-pool';
import { NotifyClient } from '../notifications/notify-client.service';

@Injectable()
export class InventoryService {
  constructor(private notifyClient: NotifyClient) {}

  async listLowStock(hospitalId: string) {
    const result = await billingPgPool.query(
      `SELECT * FROM inventory.low_stock_items WHERE hospital_id = $1`,
      [hospitalId],
    );
    return result.rows;
  }

  async adjustStock(
    hospitalId: string,
    itemId: string,
    changeQuantity: number,
    reason: string,
    performedBy: string,
  ) {
    const client = await billingPgPool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query(
        `SELECT * FROM inventory.items WHERE id = $1 AND hospital_id = $2 FOR UPDATE`,
        [itemId, hospitalId],
      );
      if (itemResult.rowCount === 0) {
        throw new NotFoundException('Inventory item not found');
      }
      const item = itemResult.rows[0];

      const newQuantity = item.quantity_on_hand + changeQuantity;
      if (newQuantity < 0) {
        throw new Error('Stock adjustment would result in negative quantity');
      }

      await client.query(
        `UPDATE inventory.items SET quantity_on_hand = $1 WHERE id = $2`,
        [newQuantity, itemId],
      );
      await client.query(
        `INSERT INTO inventory.stock_transactions (item_id, change_quantity, reason, performed_by)
         VALUES ($1, $2, $3, $4)`,
        [itemId, changeQuantity, reason, performedBy],
      );

      await client.query('COMMIT');

      if (newQuantity <= item.reorder_threshold) {
        // Fire-and-forget HTTP call — a missed notification here shouldn't
        // roll back a stock adjustment that already committed.
        await this.notifyClient.notifyLowStock({
          itemName: item.name,
          quantityOnHand: newQuantity,
          reorderThreshold: item.reorder_threshold,
          procurementEmail: 'procurement@REPLACE_WITH_HOSPITAL_DOMAIN', // TODO: per-hospital procurement contact
        });
      }

      return { itemId, newQuantity };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
