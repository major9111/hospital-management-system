import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InternalTokenService } from './internal-token.service';
import { forwardRequest } from './forward-request';

const EHR_SERVICE_URL = process.env.EHR_SERVICE_URL ?? 'http://localhost:8001';

function claimsFrom(req: any) {
  return {
    userId: req.user.userId,
    hospitalId: req.user.hospitalId,
    roles: req.user.roles,
    scope: req.resolvedScope,
  };
}

@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class PrescriptionsProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Post()
  @RequirePermission({ resource: 'prescription', action: 'write', scope: 'own' })
  async create(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, '/prescriptions/', 'POST', claimsFrom(req), body);
    res.status(result.status).json(result.data);
  }

  @Get(':id')
  @RequirePermission({ resource: 'prescription', action: 'read', scope: 'own' })
  async get(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/prescriptions/${id}`, 'GET', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Get('patient/:patientId')
  @RequirePermission({ resource: 'prescription', action: 'read', scope: 'own' })
  async listForPatient(@Param('patientId') patientId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/prescriptions/patient/${patientId}`, 'GET', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Post('items/:itemId/fulfill')
  @RequirePermission({ resource: 'prescription', action: 'write', scope: 'department' })
  async fulfill(@Param('itemId') itemId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/prescriptions/items/${itemId}/fulfill`, 'POST', claimsFrom(req));
    res.status(result.status).json(result.data);
  }
}

@Controller('lab')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class LabProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Post('orders')
  @RequirePermission({ resource: 'lab_order', action: 'write', scope: 'own' })
  async createOrder(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, '/lab/orders', 'POST', claimsFrom(req), body);
    res.status(result.status).json(result.data);
  }

  @Get('orders/:id')
  @RequirePermission({ resource: 'lab_order', action: 'read', scope: 'own' })
  async getOrder(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/lab/orders/${id}`, 'GET', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Get('orders/patient/:patientId')
  @RequirePermission({ resource: 'lab_order', action: 'read', scope: 'own' })
  async listForPatient(@Param('patientId') patientId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/lab/orders/patient/${patientId}`, 'GET', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Post('orders/:id/results')
  @RequirePermission({ resource: 'lab_order', action: 'write', scope: 'department' })
  async reportResult(@Param('id') id: string, @Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/lab/orders/${id}/results`, 'POST', claimsFrom(req), body);
    res.status(result.status).json(result.data);
  }
}

@Controller('telemedicine')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class TelemedicineProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Post('sessions')
  @RequirePermission({ resource: 'telemedicine', action: 'write', scope: 'own' })
  async create(@Body() body: { appointmentId: string }, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService, EHR_SERVICE_URL,
      `/telemedicine/sessions?appointment_id=${encodeURIComponent(body.appointmentId)}`,
      'POST', claimsFrom(req),
    );
    res.status(result.status).json(result.data);
  }

  @Get('sessions/:appointmentId')
  @RequirePermission({ resource: 'telemedicine', action: 'read', scope: 'own' })
  async get(@Param('appointmentId') appointmentId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/telemedicine/sessions/${appointmentId}`, 'GET', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Post('sessions/:appointmentId/start')
  @RequirePermission({ resource: 'telemedicine', action: 'write', scope: 'own' })
  async start(@Param('appointmentId') appointmentId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/telemedicine/sessions/${appointmentId}/start`, 'POST', claimsFrom(req));
    res.status(result.status).json(result.data);
  }

  @Post('sessions/:appointmentId/end')
  @RequirePermission({ resource: 'telemedicine', action: 'write', scope: 'own' })
  async end(@Param('appointmentId') appointmentId: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(this.internalTokenService, EHR_SERVICE_URL, `/telemedicine/sessions/${appointmentId}/end`, 'POST', claimsFrom(req));
    res.status(result.status).json(result.data);
  }
}
