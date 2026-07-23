import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UsersService } from './users.service';
import { Role } from '../rbac/roles.enum';

class CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  hospitalId: string;
  role: Role;
  phone?: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RbacGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission({ resource: 'user_management', action: 'write', scope: 'all' })
  async create(@Body() dto: CreateUserDto) {
    // Only Admins hold user_management:write:all per the seeded role matrix,
    // so only Admins can hit this endpoint successfully.
    return this.usersService.createUser(dto);
  }
}
