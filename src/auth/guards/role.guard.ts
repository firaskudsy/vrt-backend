import { ExecutionContext, Injectable, CanActivate, Inject } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/enums/enums';
import { User } from 'src/common/interfaces/user.interface';
import { Pool } from 'pg';
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const user = await this.getUser(context);
    return this.checkPermission(user);
  }

  checkPermission = (user: User): boolean => {
    switch (user.role) {
      case Role.admin: {
        return true;
      }
      case Role.editor: {
        // check project permissions later
        return true;
      }
      default:
        return false;
    }
  };

  getUser = async (context: ExecutionContext): Promise<User> => {
    const request: Request = context.switchToHttp().getRequest();

    if (request.user) {
      return request.user as User;
    }

    return this.pool.query('SELECT * FROM "User" WHERE apiKey = $1', [request.header('apiKey')])
      .then(result => result.rows[0]);
  };
}
