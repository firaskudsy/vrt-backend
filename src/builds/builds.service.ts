import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TestRunsService } from '../test-runs/test-runs.service';
import { EventsGateway } from '../shared/events/events.gateway';
import { BuildDto } from './dto/build.dto';
import { PaginatedBuildDto } from './dto/build-paginated.dto';
import { ModifyBuildDto } from './dto/build-modify.dto';
import { Pool } from 'pg';
import { TestStatus } from 'src/common/enums/enums';
import { Build } from 'src/common/interfaces/build.interface';
@Injectable()
export class BuildsService {
  private readonly logger: Logger = new Logger(BuildsService.name);

  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    private eventsGateway: EventsGateway,
    @Inject(forwardRef(() => TestRunsService))
    private testRunsService: TestRunsService
  ) {}

  async findOne(id: string): Promise<BuildDto> {
    const query = `
      SELECT * FROM "Build"
      WHERE id = $1
    `;
    const values = [id];
    const result = await this.pool.query(query, values);
    const build = result.rows[0];

    const testRunsQuery = `
      SELECT * FROM "TestRun"
      WHERE build_id = $1
    `;
    const testRunsValues = [id];
    const testRunsResult = await this.pool.query(testRunsQuery, testRunsValues);
    const testRuns = testRunsResult.rows;

    return new BuildDto({
      ...build,
      testRuns,
    });
  }

  async findMany(projectId: string, take: number, skip: number): Promise<PaginatedBuildDto> {
    const query = `
      SELECT COUNT(*) FROM "Build"
      WHERE projectId = $1
    `;
    const countValues = [projectId];
    const countResult = await this.pool.query(query, countValues);
    const total = countResult.rows[0].count;

    const query2 = `
      SELECT * FROM "Build"
      WHERE projectId = $1
      ORDER BY createdAt DESC
      LIMIT $2 OFFSET $3
    `;
    const values = [projectId, take, skip];
    const result = await this.pool.query(query2, values);
    const buildList = result.rows;

    const data = await Promise.all(buildList.map((build) => this.findOne(build.id)));

    return {
      data,
      total,
      take,
      skip,
    };
  }

  async update(id: string, modifyBuildDto: ModifyBuildDto): Promise<BuildDto> {
    const query = `
      UPDATE "Build"
      SET
        ciBuildId = $1,
        isRunning = $2,
      WHERE id = $3
      RETURNING *
    `;
    const values = [
      modifyBuildDto.ciBuildId,
      modifyBuildDto.isRunning,
      id,
    ];
    const result = await this.pool.query(query, values);
    const updatedBuild = result.rows[0];
    this.eventsGateway.buildUpdated(id);
    return new BuildDto(updatedBuild);
  }

  async remove(id: string): Promise<Build> {
    this.logger.debug(`Going to remove Build ${id}`);

    const query = `
      SELECT * FROM "Build"
      WHERE id = $1
    `;
    const values = [id];
    const result = await this.pool.query(query, values);
    const build = result.rows[0];

    const testRunsQuery = `
      SELECT * FROM "TestRun"
      WHERE build_id = $1
    `;
    const testRunsValues = [build.id];
    const testRunsResult = await this.pool.query(testRunsQuery, testRunsValues);
    const testRuns = testRunsResult.rows;

    await Promise.all(testRuns.map((testRun) => this.testRunsService.delete(testRun.id)));

    const deleteQuery = `
      DELETE FROM "Build"
      WHERE id = $1
      RETURNING *
    `;
    const deleteValues = [id];
    const deleteResult = await this.pool.query(deleteQuery, deleteValues);
    const deletedBuild = deleteResult.rows[0];

    this.logger.log('Deleted build:' + JSON.stringify(deletedBuild.id));
    this.eventsGateway.buildDeleted(
      new BuildDto({
        ...deletedBuild,
      })
    );

    return new BuildDto(deletedBuild);
  }

  async deleteOldBuilds(projectId: string, keepBuilds: number) {
    keepBuilds = keepBuilds < 2 ? keepBuilds : keepBuilds - 1;
    this.findMany(projectId, undefined, keepBuilds).then((buildList) => {
      buildList.data.forEach((eachBuild) => {
        this.remove(eachBuild.id);
      });
    });
  }

  async approve(id: string, merge: boolean): Promise<void> {
    const query = `
      SELECT * FROM "Build"
      WHERE id = $1
    `;
    const values = [id];
    const result = await this.pool.query(query, values);
    const build = result.rows[0];

    const testRunsQuery = `
      SELECT * FROM "TestRun"
      WHERE build_id = $1
        AND status IN ($2, $3)
    `;
    const testRunsValues = [build.id, TestStatus.new, TestStatus.unresolved];
    const testRunsResult = await this.pool.query(testRunsQuery, testRunsValues);
    const testRuns = testRunsResult.rows;

    for (const testRun of testRuns) {
      await this.testRunsService.approve(testRun.id, merge);
    }
  }

  async findOrCreate({
    projectId,
    branchName,
    ciBuildId,
  }: {
    projectId: string;
    branchName: string;
    ciBuildId?: string;
  }): Promise<Build> {
    const query = `
      SELECT * FROM "Build"
      WHERE projectId = $1
        AND ciBuildId = $2
    `;
    const values = [projectId, ciBuildId];
    const result = await this.pool.query(query, values);
    let build = result.rows[0];

    if (!build) {
      const insertQuery = `
        INSERT INTO "Build" (projectId, ciBuildId, branchName, isRunning)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const insertValues = [projectId, ciBuildId, branchName, true];
      const insertResult = await this.pool.query(insertQuery, insertValues);
      build = insertResult.rows[0];
    } else {
      const updateQuery = `
        UPDATE "Build"
        SET isRunning = $1
        WHERE id = $2
        RETURNING *
      `;
      const updateValues = [true, build.id];
      const updateResult = await this.pool.query(updateQuery, updateValues);
      build = updateResult.rows[0];
    }

    // assign build number
    if (!build.number) {
      build = await this.incrementBuildNumber(build.id, projectId);
      this.eventsGateway.buildCreated(new BuildDto(build));
    }

    return build;
  }

  async incrementBuildNumber(buildId: string, projectId: string): Promise<Build> {
    const projectQuery = `
      UPDATE "Project"
      SET buildsCounter = buildsCounter + 1
      WHERE id = $1
      RETURNING buildsCounter
    `;
    const projectValues = [projectId];
    const projectResult = await this.pool.query(projectQuery, projectValues);
    const buildsCounter = projectResult.rows[0].buildsCounter;

    const buildQuery = `
      UPDATE "Build"
      SET number = $1
      WHERE id = $2
      RETURNING *
    `;
    const buildValues = [buildsCounter, buildId];
    const buildResult = await this.pool.query(buildQuery, buildValues);
    const updatedBuild = buildResult.rows[0];

    return updatedBuild;
  }
}
