import { ExecutionContext, Injectable, CanActivate, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import { Pool } from 'pg';
@Injectable()
export class ApiGuard implements CanActivate {
  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT * FROM "User" WHERE apiKey = $1', [request.header('apiKey')]);
      const user = result.rows[0];
      client.release();
      return !!user;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
