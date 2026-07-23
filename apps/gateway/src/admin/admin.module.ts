import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { InternalTokenService } from '../proxy/internal-token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [InternalTokenService],
})
export class AdminModule {}
