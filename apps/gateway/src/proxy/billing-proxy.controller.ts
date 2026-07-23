import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InternalTokenService } from './internal-token.service';
import { forwardRequest } from './forward-request';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL ?? 'http://localhost:3001';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class BillingProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Post('invoices')
  @RequirePermission({ resource: 'billing', action: 'write', scope: 'hospital' })
  async createInvoice(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      BILLING_SERVICE_URL,
      '/invoices',
      'POST',
      claimsFrom(req),
      body,
    );
    res.status(result.status).json(result.data);
  }

  @Get('invoices/:id')
  @RequirePermission({ resource: 'billing', action: 'read', scope: 'hospital' })
  async getInvoice(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      BILLING_SERVICE_URL,
      `/invoices/${id}`,
      'GET',
      claimsFrom(req),
    );
    res.status(result.status).json(result.data);
  }

  @Post('invoices/:id/payments')
  @RequirePermission({ resource: 'billing', action: 'write', scope: 'hospital' })
  async recordPayment(@Param('id') id: string, @Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      BILLING_SERVICE_URL,
      `/invoices/${id}/payments`,
      'POST',
      claimsFrom(req),
      body,
    );
    res.status(result.status).json(result.data);
  }
}

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class InventoryProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Get('low-stock')
  @RequirePermission({ resource: 'inventory', action: 'write', scope: 'all' })
  async lowStock(@Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      BILLING_SERVICE_URL,
      '/inventory/low-stock',
      'GET',
      claimsFrom(req),
    );
    res.status(result.status).json(result.data);
  }

  @Post(':id/adjust')
  @RequirePermission({ resource: 'inventory', action: 'write', scope: 'all' })
  async adjust(@Param('id') id: string, @Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      BILLING_SERVICE_URL,
      `/inventory/${id}/adjust`,
      'POST',
      claimsFrom(req),
      body,
    );
    res.status(result.status).json(result.data);
  }
}

function claimsFrom(req: any) {
  return {
    userId: req.user.userId,
    hospitalId: req.user.hospitalId,
    roles: req.user.roles,
    scope: req.resolvedScope,
  };
}
