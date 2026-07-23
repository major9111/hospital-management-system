import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { pgPool } from '../db/pg-pool';
import { Role } from '../rbac/roles.enum';

interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  hospitalId: string;
  role: Role;
  phone?: string;
}

@Injectable()
export class UsersService {
  async createUser(input: CreateUserInput) {
    const existing = await pgPool.query('SELECT id FROM users WHERE email = $1', [
      input.email,
    ]);
    if (existing.rowCount > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      const userInsert = await client.query(
        `INSERT INTO users (hospital_id, email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.hospitalId, input.email, passwordHash, input.fullName, input.phone ?? null],
      );
      const userId = userInsert.rows[0].id;

      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [
        input.role,
      ]);
      if (roleResult.rowCount === 0) {
        throw new Error(`Role not found: ${input.role}`);
      }
      const roleId = roleResult.rows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id, hospital_id) VALUES ($1, $2, $3)`,
        [userId, roleId, input.hospitalId],
      );

      await client.query('COMMIT');
      return { id: userId, email: input.email, role: input.role };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
