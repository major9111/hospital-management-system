import { Body, Controller, Post, ConflictException, HttpCode, NotFoundException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { pgPool } from '../db/pg-pool';
import { verifyInsurance } from './insurance-verification';

class SelfRegisterDto {
  email: string;
  password: string;
  fullName: string;
  hospitalId: string; // which hospital branch they're registering with
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
}

@Controller('auth')
export class SelfRegistrationController {
  // Deliberately public — no AuthGuard/RbacGuard here, this is how a new
  // patient gets into the system in the first place. Rate-limited at the
  // NGINX/edge layer the same way /auth/login is (see infra/nginx/nginx.conf)
  // to blunt automated account-creation abuse.
  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async selfRegister(@Body() dto: SelfRegisterDto) {
    const hospital = await pgPool.query(
      'SELECT id FROM hospitals WHERE id = $1 AND is_active = true',
      [dto.hospitalId],
    );
    if (hospital.rowCount === 0) {
      throw new NotFoundException('Unknown or inactive hospital');
    }

    const existing = await pgPool.query('SELECT id FROM users WHERE email = $1', [dto.email]);
    if (existing.rowCount > 0) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      const userInsert = await client.query(
        `INSERT INTO users (hospital_id, email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [dto.hospitalId, dto.email, passwordHash, dto.fullName, dto.phone ?? null],
      );
      const userId = userInsert.rows[0].id;

      const roleResult = await client.query(`SELECT id FROM roles WHERE name = 'patient'`);
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, hospital_id) VALUES ($1, $2, $3)`,
        [userId, roleResult.rows[0].id, dto.hospitalId],
      );

      // Insurance "verification" goes through a pluggable stub — see
      // insurance-verification.ts for exactly what it does and doesn't check.
      const verification = await verifyInsurance(dto.insuranceProvider, dto.insurancePolicyNumber);

      await client.query(
        `INSERT INTO patients
           (hospital_id, user_id, full_name, date_of_birth, gender, phone, email,
            insurance_provider, insurance_policy_number, insurance_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          dto.hospitalId, userId, dto.fullName, dto.dateOfBirth ?? null, dto.gender ?? null,
          dto.phone ?? null, dto.email, dto.insuranceProvider ?? null,
          dto.insurancePolicyNumber ?? null, verification.verified,
        ],
      );

      await client.query('COMMIT');
      return {
        id: userId,
        email: dto.email,
        insuranceVerified: verification.verified,
        message: verification.reason,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
