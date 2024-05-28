import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { JwtPayload } from './jwt-payload.model';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { User } from 'src/common/interfaces/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject('DB_CONNECTION') private readonly pool: Pool
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload, done: VerifiedCallback) {

    const user = (await this.pool.query('SELECT * FROM "User" WHERE email = $1', [payload.email]))?.rows[0] as User | undefined;
    if (!user) {
      return done(new HttpException({}, HttpStatus.UNAUTHORIZED), false);
    }

    return done(null, user, payload.expire);
  }
}
