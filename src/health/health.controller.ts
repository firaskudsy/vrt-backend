import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Inject ('DB_CONNECTION') private readonly pool: Pool
  ) { }

  @Get()
  @ApiOkResponse({type: Object})
  @HealthCheck()
  check() {
    return this.health.check([() => this.pool.query(`SELECT 1`)]);
  }
}
