import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

// Example of how every protected route in the system should look:
// 1) AuthGuard('jwt') confirms who they are
// 2) RbacGuard + @RequirePermission confirms what they're allowed to do
@Controller('patients')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class PatientsExampleController {
  @Get(':id')
  @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'own' })
  async getPatient(@Param('id') id: string) {
    // In the real implementation, this forwards to the EHR (FastAPI) service,
    // passing request.resolvedScope so the EHR service can filter rows
    // (e.g. a doctor only gets patients in their department).
    return { message: `Would proxy to ehr-service for patient ${id}` };
  }
}
