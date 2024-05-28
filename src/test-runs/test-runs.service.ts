import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PNG } from 'pngjs';
import { CreateTestRequestDto } from './dto/create-test-request.dto';
import { IgnoreAreaDto } from './dto/ignore-area.dto';
import { StaticService } from '../shared/static/static.service';
import { DiffResult } from './diffResult';
import { EventsGateway } from '../shared/events/events.gateway';
import { TestRunResultDto } from '../test-runs/dto/testRunResult.dto';
import { TestVariationsService } from '../test-variations/test-variations.service';
import { TestRunDto } from './dto/testRun.dto';
import { getTestVariationUniqueData } from '../utils';
import { CompareService } from '../compare/compare.service';
import { UpdateTestRunDto } from './dto/update-test.dto';
import { TestStatus } from 'src/common/enums/enums';
import { Baseline } from 'src/common/interfaces/baseline.interface';
import { TestRun } from 'src/common/interfaces/testrun.interface';
import { TestVariation } from 'src/common/interfaces/testvariation.interface';
import { Pool } from 'pg';
@Injectable()
export class TestRunsService {
  private readonly logger: Logger = new Logger(TestRunsService.name);

  constructor(
    @Inject(forwardRef(() => TestVariationsService))
    private testVariationService: TestVariationsService,
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    private staticService: StaticService,
    private compareService: CompareService,
    private eventsGateway: EventsGateway
  ) {}

  async findMany(buildId: string): Promise<TestRunDto[]> {
    const query = `
      SELECT * FROM "TestRun"
      WHERE buildId = $1
    `;
    const values = [buildId];
    const result = await this.pool.query(query, values);
    return result.rows.map((item) => new TestRunDto(item));
  }

  async findOne(id: string): Promise<
    TestRun & {
      testVariation?: TestVariation;
    }
  > {
    const query = `
      SELECT * FROM "TestRun"
      LEFT JOIN "TestVariation" ON "TestRun"."testVariationId" = "TestVariation"."id"
      WHERE "TestRun"."id" = $1
    `;
    const values = [id];
    const result = await this.pool.query(query, values);
    const testRun = result.rows[0];
    if (testRun) {
      return {
        ...testRun,
        testVariation: testRun.testVariationId ? testRun.testVariation as TestVariation : undefined,
      };
    }
    return null;
  }

  async postTestRun({
    createTestRequestDto,
    imageBuffer,
  }: {
    createTestRequestDto: CreateTestRequestDto;
    imageBuffer: Buffer;
  }): Promise<TestRunResultDto> {
    const project = await this.pool.query('SELECT * FROM "Project" WHERE id = $1', [createTestRequestDto.projectId]);

    let testVariation = await this.testVariationService.find(createTestRequestDto);
    // creates variatioin if does not exist
    if (!testVariation) {
      testVariation = await this.testVariationService.create({
        createTestRequestDto,
      });
    }

    // delete previous test run if exists
    const previousTestRunQuery = `
      SELECT * FROM "TestRun"
      WHERE buildId = $1
        AND branchName = $2
        AND ${getTestVariationUniqueData(createTestRequestDto)}
        AND status NOT IN ($3, $4)
    `;
    const previousTestRunValues = [
      createTestRequestDto.buildId,
      createTestRequestDto.branchName,
      TestStatus.approved,
      TestStatus.autoApproved,
    ];
    const [previousTestRun] = await this.pool.query(previousTestRunQuery, previousTestRunValues);
    if (!!previousTestRun) {
      await this.delete(previousTestRun.id);
    }

    // create test run result
    const testRun = await this.create({ testVariation, createTestRequestDto, imageBuffer });

    // calculate diff
    let testRunWithResult = await this.calculateDiff(createTestRequestDto.projectId, testRun);

    // try auto approve
    if (project.autoApproveFeature) {
      testRunWithResult = await this.tryAutoApproveByPastBaselines({ testVariation, testRun: testRunWithResult });
      testRunWithResult = await this.tryAutoApproveByNewBaselines({ testVariation, testRun: testRunWithResult });
    }
    return new TestRunResultDto(testRunWithResult, testVariation);
  }

  /**
   * Confirm difference for testRun
   */
  async approve(id: string, merge = false, autoApprove = false, userId?: string): Promise<TestRun> {
    this.logger.log(`Approving testRun: ${id} merge: ${merge} autoApprove: ${autoApprove}`);
    const testRun = await this.findOne(id);
    let { testVariation } = testRun;
    if (!testVariation) {
      throw new Error('No test variation found. Re-create test run');
    }

    // save new baseline
    const baseline = this.staticService.getImage(testRun.imageName);
    const baselineName = this.staticService.saveImage('baseline', PNG.sync.write(baseline));

    if (testRun.baselineBranchName !== testRun.branchName && !merge && !autoApprove) {
      // replace main branch with feature branch test variation
      const featureBranchTestVariation = await this.testVariationService.findUnique({
        projectId: testRun.projectId,
        branchName: testRun.branchName,
        ...testRun,
      });

      if (!featureBranchTestVariation) {
        testVariation = await this.testVariationService.create({
          testRunId: id,
          createTestRequestDto: {
            projectId: testRun.projectId,
            branchName: testRun.branchName,
            ...getTestVariationUniqueData(testRun),
          },
        });
      } else {
        testVariation = featureBranchTestVariation;
      }

      // carry over data from testRun
      testVariation = await this.testVariationService.update(
        testVariation.id,
        {
          baselineName: testRun.baselineName,
          ignoreAreas: testRun.ignoreAreas,
          comment: testRun.comment,
        },
        testRun.id
      );
    }

    if (!autoApprove || (autoApprove && testRun.baselineBranchName === testRun.branchName)) {
      // add baseline
      const query = `
        INSERT INTO "Baseline" ("testVariationId", "userId", "testRunId", "baselineName")
        VALUES ($1, $2, $3, $4)
      `;
      const values = [testVariation.id, userId, testRun.id, baselineName];
      await this.pool.query(query, values);
    }

    // update status
    const status = autoApprove ? TestStatus.autoApproved : TestStatus.approved;
    return this.setStatus(id, status);
  }

  async setStatus(id: string, status: TestStatus): Promise<TestRun> {
    const query = `
      UPDATE "TestRun"
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const values = [status, id];
    const result = await this.pool.query(query, values);
    const testRun = result.rows[0];
    if (testRun) {
      this.eventsGateway.testRunUpdated(testRun);
      return this.findOne(id);
    }
    return null;
  }

  async saveDiffResult(id: string, diffResult: DiffResult): Promise<TestRun> {
    const query = `
      UPDATE "TestRun"
      SET diffName = $1,
          pixelMisMatchCount = $2,
          diffPercent = $3,
          status = $4
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      diffResult && diffResult.diffName,
      diffResult && diffResult.pixelMisMatchCount,
      diffResult && diffResult.diffPercent,
      diffResult ? diffResult.status : TestStatus.new,
      id,
    ];
    const result = await this.pool.query(query, values);
    const testRun = result.rows[0];
    if (testRun) {
      this.eventsGateway.testRunUpdated(testRun);
      return testRun;
    }
    return null;
  }

  async calculateDiff(projectId: string, testRun: TestRun): Promise<TestRun> {
    this.staticService.deleteImage(testRun.diffName);
    const diffResult = await this.compareService.getDiff({
      projectId,
      data: {
        image: testRun.imageName,
        baseline: testRun.baselineName,
        ignoreAreas: this.getAllIgnoteAreas(testRun),
        diffTollerancePercent: testRun.diffTollerancePercent,
        saveDiffAsFile: true,
      },
    });
    return this.saveDiffResult(testRun.id, diffResult);
  }

  async create({
    testVariation,
    createTestRequestDto,
    imageBuffer,
  }: {
    testVariation: TestVariation;
    createTestRequestDto: CreateTestRequestDto;
    imageBuffer: Buffer;
  }): Promise<TestRun> {
    // save image
    const imageName = this.staticService.saveImage('screenshot', imageBuffer);

    const query = `
      INSERT INTO "TestRun" (
        "imageName",
        "testVariationId",
        "buildId",
        "projectId",
        "baselineName",
        "baselineBranchName",
        "ignoreAreas",
        "tempIgnoreAreas",
        "comment",
        "diffTollerancePercent",
        "branchName",
        "merge",
        "status"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      imageName,
      testVariation.id,
      createTestRequestDto.buildId,
      createTestRequestDto.projectId,
      testVariation.baselineName,
      testVariation.branchName,
      testVariation.ignoreAreas,
      JSON.stringify(createTestRequestDto.ignoreAreas),
      createTestRequestDto.comment || testVariation.comment,
      createTestRequestDto.diffTollerancePercent,
      createTestRequestDto.branchName,
      createTestRequestDto.merge,
      TestStatus.new,
    ];
    const result = await this.pool.query(query, values);
    const testRun = result.rows[0];

    this.eventsGateway.testRunCreated(testRun);
    return testRun;
  }

  async delete(id: string): Promise<TestRun> {
    const testRun = await this.findOne(id);

    await Promise.all([
      this.staticService.deleteImage(testRun.diffName),
      this.staticService.deleteImage(testRun.imageName),
      this.pool.query('DELETE FROM "TestRun" WHERE id = $1', [id]),
    ]);

    this.eventsGateway.testRunDeleted(testRun);
    return testRun;
  }

  async updateIgnoreAreas(id: string, ignoreAreas: IgnoreAreaDto[]): Promise<TestRun> {
    const query = `
      UPDATE "TestRun"
      SET "ignoreAreas" = $1
      WHERE "id" = $2
      RETURNING *
    `;
    const values = [JSON.stringify(ignoreAreas), id];
    const result = await this.pool.query(query, values);
    const testRun = result.rows[0];
    const testVariation = await this.testVariationService.update(testRun.testVariationId, {
      ignoreAreas: testRun.ignoreAreas,
    });
    return this.calculateDiff(testVariation.projectId, testRun);
  }

  async addIgnoreAreas(id: string, ignoreAreas: IgnoreAreaDto[]): Promise<TestRun> {
    const testRun = await this.findOne(id);
    const oldIgnoreAreas: IgnoreAreaDto[] = JSON.parse(testRun.ignoreAreas) ?? [];
    return this.updateIgnoreAreas(id, oldIgnoreAreas.concat(ignoreAreas));
  }

  async update(id: string, data: UpdateTestRunDto): Promise<TestRun> {
    const testRun = await this.pool.query('SELECT * FROM "TestRun" WHERE id = $1', [id]);
    if (!testRun) {
      throw new Error('TestRun not found');
    }
    const updatedTestRun = {
      ...testRun,
      comment: data.comment,
    };
    await this.pool.query('UPDATE "TestRun" SET comment = $1 WHERE id = $2', [updatedTestRun.comment, id]);
    await this.testVariationService.update(testRun.testVariationId, data);
    this.eventsGateway.testRunUpdated(updatedTestRun);
    return updatedTestRun;
  }

  private getAllIgnoteAreas(testRun: TestRun): IgnoreAreaDto[] {
    const ignoreAreas: IgnoreAreaDto[] = JSON.parse(testRun.ignoreAreas) ?? [];
    const tempIgnoreAreas: IgnoreAreaDto[] = JSON.parse(testRun.tempIgnoreAreas) ?? [];
    return ignoreAreas.concat(tempIgnoreAreas);
  }

  /**
   * Reason: not rebased code from feature branch is compared agains new main branch baseline thus diff is expected
   * Tries to find past baseline in main branch and autoApprove in case matched
   * @param testVariation
   * @param testRun
   */
  private async tryAutoApproveByPastBaselines({ testRun, testVariation }: AutoApproveProps): Promise<TestRun> {
    if (testRun.status === TestStatus.ok || testRun.branchName === testRun.baselineBranchName) {
      return testRun;
    }

    this.logger.log(`Try AutoApproveByPastBaselines testRun: ${testRun.id}`);
    const testVariationHistory = await this.testVariationService.getDetails(testVariation.id);
    // skip first baseline as it was used by default in general flow
    for (const baseline of testVariationHistory.baselines.slice(1)) {
      if (await this.shouldAutoApprove({ projectId: testVariation.projectId, baseline, testRun })) {
        return this.approve(testRun.id, false, true);
      }
    }

    return testRun;
  }

  /**
   * Reason: branch got another one merged thus diff is expected
   * Tries to find latest baseline in test variation
   * that has already approved test agains the same baseline image
   * and autoApprove in case matched
   * @param testVariation
   * @param testRun
   */
  private async tryAutoApproveByNewBaselines({ testVariation, testRun }: AutoApproveProps): Promise<TestRun> {
    if (testRun.status === TestStatus.ok) {
      return testRun;
    }
    this.logger.log(`Try AutoApproveByNewBaselines testRun: ${testRun.id}`);

    const alreadyApprovedTestRuns: TestRun[] = await this.pool.query(`
      SELECT *
      FROM "TestRun"
      WHERE "baselineName" = $1
      AND "status" = $2
      AND "testVariationId" IN (
        SELECT id
        FROM "TestVariation"
        WHERE "projectId" = $3
      )
    `, [testVariation.baselineName, TestStatus.approved, testVariation.projectId]);

    for (const approvedTestRun of alreadyApprovedTestRuns) {
      const approvedTestVariation = await this.testVariationService.getDetails(approvedTestRun.testVariationId);
      const baseline = approvedTestVariation.baselines.shift();

      if (await this.shouldAutoApprove({ projectId: testVariation.projectId, baseline, testRun })) {
        return this.approve(testRun.id, false, true);
      }
    }

    return testRun;
  }

  private async shouldAutoApprove({
    projectId,
    baseline,
    testRun,
  }: {
    projectId: string;
    baseline: Baseline;
    testRun: TestRun;
  }): Promise<boolean> {
    const diffResult = await this.compareService.getDiff({
      projectId,
      data: {
        image: testRun.imageName,
        baseline: baseline.baselineName,
        ignoreAreas: this.getAllIgnoteAreas(testRun),
        diffTollerancePercent: testRun.diffTollerancePercent,
        saveDiffAsFile: false,
      },
    });

    if (diffResult.status === TestStatus.ok) {
      this.logger.log(`TestRun ${testRun.id} could be auto approved based on Baseline ${baseline.id}`);
      return true;
    }
  }
}

interface AutoApproveProps {
  testVariation: TestVariation;
  testRun: TestRun;
}
