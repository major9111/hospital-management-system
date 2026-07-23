import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { SelfRegistrationController } from './self-registration.controller';
import { AuthService, USERS_REPOSITORY } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PostgresUsersRepository } from './postgres-users.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets passed per-call in AuthService (access vs refresh)
  ],
  controllers: [AuthController, SelfRegistrationController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: USERS_REPOSITORY, useClass: PostgresUsersRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
