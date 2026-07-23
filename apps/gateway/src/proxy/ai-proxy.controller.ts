import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InternalTokenService } from './internal-token.service';
import { forwardRequest } from './forward-request';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8002';

@Controller('ai')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class AiProxyController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Post('receptionist/chat')
  @RequirePermission({ resource: 'appointment', action: 'write', scope: 'own' })
  async chat(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      AI_SERVICE_URL,
      '/receptionist/chat',
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

  @Post('receptionist/book')
  @RequirePermission({ resource: 'appointment', action: 'write', scope: 'own' })
  async book(@Body() body: unknown, @Req() req: any, @Res() res: Response) {
    const result = await forwardRequest(
      this.internalTokenService,
      AI_SERVICE_URL,
      '/receptionist/book',
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
