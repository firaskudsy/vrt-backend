import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TestVariationsService } from '../../test-variations/test-variations.service';
import { Pool } from 'pg';
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    @Inject(forwardRef(() => TestVariationsService))
    private testVariationService: TestVariationsService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldTestVariations() {
    const projects = await this.pool.query('SELECT * FROM "Project"');

    for (const project of projects.rows) {
      const dateRemoveAfter: Date = new Date();
      dateRemoveAfter.setDate(dateRemoveAfter.getDate() - project.maxBranchLifetime);

      const testVariations = await this.pool.query('SELECT * FROM "TestVariation" WHERE project_id = $1 AND updated_at <= $2 AND branch_name != $3', [project.id, dateRemoveAfter, project.mainBranchName]);
      this.logger.debug(
        `Removing ${testVariations.rows.length} TestVariations for ${project.name} later than ${dateRemoveAfter}`
      );

      for (const testVariation of testVariations.rows) {
        await this.testVariationService.delete(testVariation.id);
      }
    }
  }
}
