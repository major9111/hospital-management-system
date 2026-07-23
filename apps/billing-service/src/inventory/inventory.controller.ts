import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';
import { InventoryService } from './inventory.service';

class AdjustStockDto {
  changeQuantity: number;
  reason: string;
}

@Controller('inventory')
@UseGuards(InternalAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('low-stock')
  async lowStock(@Req() req: any) {
    return this.inventoryService.listLowStock(req.internalContext.hospitalId);
  }

  @Post(':id/adjust')
  async adjust(@Param('id') id: string, @Body() dto: AdjustStockDto, @Req() req: any) {
    return this.inventoryService.adjustStock(
      req.internalContext.hospitalId,
      id,
      dto.changeQuantity,
      dto.reason,
      req.internalContext.userId,
    );
  }
}
