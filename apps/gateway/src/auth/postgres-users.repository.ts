import { Injectable } from '@nestjs/common';
import { pgPool } from '../db/pg-pool';
import { UsersRepository } from './auth.service';

@Injectable()
export class PostgresUsersRepository implements UsersRepository {
  async findByEmail(email: string) {
    const userResult = await pgPool.query(
      `SELECT id, email, password_hash, hospital_id
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email],
    );
    if (userResult.rowCount === 0) return null;
    const user = userResult.rows[0];

    const rolesResult = await pgPool.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
         AND (ur.hospital_id = $2 OR ur.hospital_id IS NULL)`,
      [user.id, user.hospital_id],
    );

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      hospitalId: user.hospital_id,
      roles: rolesResult.rows.map((r) => r.name),
    };
  }

  async storeRefreshTokenHash(userId: string, tokenHash: string, expiresAt: Date) {
    await pgPool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  /** Revoke a specific refresh token, e.g. on logout. */
  async revokeRefreshToken(tokenHash: string) {
    await pgPool.query(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  /** Revoke every refresh token for a user, e.g. on password change or "log out everywhere". */
  async revokeAllRefreshTokens(userId: string) {
    await pgPool.query(
      `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
      [userId],
    );
  }
}
