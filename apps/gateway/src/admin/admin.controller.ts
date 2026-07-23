import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InternalTokenService } from '../proxy/internal-token.service';
import { forwardRequest } from '../proxy/forward-request';
import { pgPool } from '../db/pg-pool';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL ?? 'http://localhost:3001';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class AdminController {
  constructor(private internalTokenService: InternalTokenService) {}

  @Get('metrics')
  @RequirePermission({ resource: 'user_management', action: 'write', scope: 'all' })
  async metrics(@Req() req: any) {
    const hospitalId = req.user.hospitalId;

    const [staffCount, patientCount, appointmentsToday, hospitalCount] = await Promise.all([
      pgPool.query(
        `SELECT count(DISTINCT ur.user_id) FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.hospital_id = $1 AND r.name != 'patient'`,
        [hospitalId],
      ),
      pgPool.query(`SELECT count(*) FROM patients WHERE hospital_id = $1`, [hospitalId]),
      pgPool.query(
        `SELECT count(*) FROM appointments
         WHERE hospital_id = $1 AND scheduled_at::date = now()::date`,
        [hospitalId],
      ),
      pgPool.query(`SELECT count(*) FROM hospitals WHERE is_active = true`),
    ]);

    let lowStockCount = 0;
    try {
      const lowStock = await forwardRequest(
        this.internalTokenService,
        BILLING_SERVICE_URL,
        '/inventory/low-stock',
        'GET',
        { userId: req.user.userId, hospitalId, roles: req.user.roles, scope: 'all' },
      );
      lowStockCount = Array.isArray(lowStock.data) ? lowStock.data.length : 0;
    } catch {
      // billing-service unreachable — metrics still return, just without this figure
    }

    return {
      activeHospitalsNetworkWide: Number(hospitalCount.rows[0].count),
      staffAccounts: Number(staffCount.rows[0].count),
      patients: Number(patientCount.rows[0].count),
      appointmentsToday: Number(appointmentsToday.rows[0].count),
      lowStockItems: lowStockCount,
    };
  }
}
