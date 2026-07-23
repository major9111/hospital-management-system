import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InternalTokenService } from './internal-token.service';
import { forwardRequest } from './forward-request';

const EHR_SERVICE_URL = process.env.EHR_SERVICE_URL ?? 'http://localhost:8001';

// Explicit per-resource routes (not a blind wildcard proxy) so every path
// exposed to the outside world has its own declared permission — the
// gateway is the API contract, not a transparent tunnel into ehr-service.
@Controller('ehr')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class EhrProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Get('patients/me')
  @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'own' })
  async getMyPatientRecord(@Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      '/patients/me',
      'GET',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
    );
    res.status(result.status).json(result.data);
  }

  @Get('patients/:id')
  @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'own' })
  async getPatient(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      `/patients/${id}`,
      'GET',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
    );
    res.status(result.status).json(result.data);
  }

  @Get('patients')
  @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'department' })
  async listPatients(@Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      '/patients/',
      'GET',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
    );
    res.status(result.status).json(result.data);
  }

  @Get('appointments')
  @RequirePermission({ resource: 'appointment', action: 'read', scope: 'own' })
  async listAppointments(@Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      '/appointments/',
      'GET',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
    );
    res.status(result.status).json(result.data);
  }

  @Get('search/patients')
  @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'department' })
  async searchPatients(@Req() req: any, @Res() res: Response) {
    const q = req.query.q ?? '';
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      `/search/patients?q=${encodeURIComponent(q)}`,
      'GET',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
    );
    res.status(result.status).json(result.data);
  }

  @Post('appointments')
  @RequirePermission({ resource: 'appointment', action: 'write', scope: 'own' })
  async createAppointment(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      EHR_SERVICE_URL,
      '/appointments/',
      'POST',
      {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId,
        roles: req.user.roles,
        scope: req.resolvedScope,
      },
      body,
    );
    res.status(result.status).json(result.data);
  }
}
