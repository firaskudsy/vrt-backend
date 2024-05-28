import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { StaticService } from '../shared/static/static.service';
import { BuildsService } from '../builds/builds.service';
import { TestRunsService } from '../test-runs/test-runs.service';
import { PNG } from 'pngjs';
import { CreateTestRequestDto } from 'src/test-runs/dto/create-test-request.dto';
import { BuildDto } from 'src/builds/dto/build.dto';
import { getTestVariationUniqueData } from '../utils';
import { TestVariationUpdateDto } from './dto/test-variation-update.dto';
import { BaselineDataDto } from 'src/shared/dto/baseline-data.dto';
import { Pool} from 'pg';
import { Baseline } from 'src/common/interfaces/baseline.interface';
import { Build } from 'src/common/interfaces/build.interface';
import { TestVariation } from 'src/common/interfaces/testvariation.interface';
import { Project } from 'src/common/interfaces/project.interface';
@Injectable()
export class TestVariationsService {
  private readonly logger = new Logger(TestVariationsService.name);

  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    private staticService: StaticService,
    @Inject(forwardRef(() => TestRunsService))
    private testRunsService: TestRunsService,
    @Inject(forwardRef(() => BuildsService))
    private buildsService: BuildsService
  ) {}

  async getDetails(
    id: string
  ): Promise<TestVariation> {

     const query = `
      SELECT
        tv.*,
        json_agg(
          json_build_object(
            'id', b.id,
            'baselineName', b.baselineName,
            'testVariationId', b.testVariationId,
            'testRunId', b.testRunId,
            'userId', b.userId,
            'updatedAt', b.updatedAt,
            'createdAt', b.createdAt,
            'testRun', tr,
            'user', u
          )
        ORDER BY b.createdAt DESC
        ) AS baselines
      FROM
        "TestVariation" tv
      LEFT JOIN
        "BaseLine" b ON tv.id = b.testVariationId
      LEFT JOIN
        "TestRun" tr ON b.testRunId = tr.id
      LEFT JOIN
        "User" u ON b.userId = u.id
      WHERE
        tv.id = $1
      GROUP BY
        tv.id;
    `;
    const details = (await this.pool.query(query, [id]))?.rows[0] as TestVariation;
    return details;
  }

  async findUnique(data: BaselineDataDto & { projectId: string }): Promise<TestVariation | null> {
     const query = `
      SELECT *
      FROM "TestVariation"
      WHERE projectId = $1
        AND name = $2
        AND browser = $3
        AND device = $4
        AND os = $5
        AND viewport = $6
        AND customTags = $7
        AND branchName = $8
      LIMIT 1;
    `;
    const values = [
      data.projectId,
      data.name,
      data.browser,
      data.device,
      data.os,
      data.viewport,
      data.customTags,
      data.branchName,
    ];

    const result = (await this.pool.query(query, values))?.rows[0] as TestVariation;
    return result;

  }

  async update(id: string, data: TestVariationUpdateDto, testRunId?: string): Promise<TestVariation> {

    const updateTestVariationQuery = `
      UPDATE "TestVariation"
      SET baselineName = $2,
          ignoreAreas = $3,
          comment = $4
      WHERE id = $1;
    `;
    const updateTestRunQuery = `
      UPDATE "TestRun"
      SET testVariationId = $1
      WHERE id = $2;
    `;

    const values = [
      id,
      data.baselineName,
      data.ignoreAreas,
      data.comment
    ];

    // Execute the update query for test_variation
    const updatedTestVariation = await this.pool.query(updateTestVariationQuery, values);

    // If testRunId is provided, execute the update query for test_run
    if (testRunId) {
      await this.pool.query(updateTestRunQuery, [id, testRunId]);
    }


    return updatedTestVariation;

  }

  /**
   * Tries to get test variation for the same branch
   * Falls back to main branch if not found
   * @param projectId
   * @param baselineData
   * @returns
   */
  async find(
    createTestRequestDto: BaselineDataDto & { projectId: string; sourceBranch?: string }
  ): Promise<TestVariation | null> {
    const project = (await this.pool.query('SELECT * FROM "Project" WHERE id = $1', [createTestRequestDto.projectId]))?.rows[0] as Project | null;
    const mainBranch = createTestRequestDto.sourceBranch ?? project.mainBranchName;

    const [mainBranchTestVariation, currentBranchTestVariation] = await Promise.all([
      // search main branch variation
      this.findUnique({
        projectId: createTestRequestDto.projectId,
        branchName: mainBranch,
        ...getTestVariationUniqueData(createTestRequestDto),
      }),
      // search current branch variation
      createTestRequestDto.branchName !== mainBranch &&
        this.findUnique({
          projectId: createTestRequestDto.projectId,
          branchName: createTestRequestDto.branchName,
          ...getTestVariationUniqueData(createTestRequestDto),
        }),
    ]);

    if (!!currentBranchTestVariation) {
      if (mainBranchTestVariation && mainBranchTestVariation.updatedAt > currentBranchTestVariation.updatedAt) {
        return mainBranchTestVariation;
      }
      return currentBranchTestVariation;
    }

    if (!!mainBranchTestVariation) {
      return mainBranchTestVariation;
    }
  }

  /**
   * Creates empty test variation (no baseline)
   */
  async create({
    testRunId,
    createTestRequestDto,
  }: {
    testRunId?: string;
    createTestRequestDto: Omit<CreateTestRequestDto, 'buildId' | 'ignoreAreas'>;
  }): Promise<TestVariation> {
    try {
      await this.pool.query('BEGIN');

      // Extract unique data for test variation
      const uniqueData = getTestVariationUniqueData(createTestRequestDto);

      const insertTestVariationQuery = `
        INSERT INTO test_variation (
          projectId,
          branchName,
          browser,
          device,
          os,
          viewport,
          customTags,
          baselineName,
          ignoreAreas,
          comment,
          createdAt,
          updatedAt
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        )
        RETURNING *;
      `;

      const testVariationValues = [
        createTestRequestDto.projectId,
        createTestRequestDto.branchName,
        uniqueData.browser,
        uniqueData.device,
        uniqueData.os,
        uniqueData.viewport,
        uniqueData.customTags,
      ];

      const res = await this.pool.query(insertTestVariationQuery, testVariationValues);
      const newTestVariation = res.rows[0];

      if (testRunId) {
        const insertTestRunRelationQuery = `
          INSERT INTO test_run_test_variation (testVariationId, testRunId)
          VALUES ($1, $2);
        `;
        await this.pool.query(insertTestRunRelationQuery, [newTestVariation.id, testRunId]);
      }

      await this.pool.query('COMMIT');
      return newTestVariation;
    } catch (err) {
      await this.pool.query('ROLLBACK');
      throw err;
    } finally {
      this.pool.release();
    }
  }

  async addBaseline({
    id,
    userId,
    testRunId,
    baselineName,
  }: {
    id: string;
    userId: string;
    testRunId: string;
    baselineName: string;
  }): Promise<any> {
const updateTestVariationQuery = `
      UPDATE "TestVariation"
      SET baselineName = $2
      WHERE id = $1
      RETURNING *;
    `;

    const createBaselineQuery = `
      INSERT INTO "BaseLine" (baselineName, testVariationId, testRunId, userId, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *;
    `;

    const valuesForUpdate = [
      id,
      baselineName
    ];

    // Execute the update query for test_variation and return the updated record
    const updatedTestVariation = (await this.pool.query(updateTestVariationQuery, valuesForUpdate))?.rows[0] as TestVariation;

    const valuesForInsert = [
      baselineName,
      id,
      testRunId,
      userId || null
    ];

    // Execute the insert query for baseline and return the inserted record
    const newBaseline = (await this.pool.query(createBaselineQuery, valuesForInsert))?.rows[0] as Baseline;

    // Return both updated test variation and the new baseline
    return {
      ...updatedTestVariation,
      newBaseline
    };
  }

  async merge(projectId: string, fromBranch: string, toBranch: string): Promise<BuildDto> {
    // create build
    const build: Build = await this.buildsService.findOrCreate({
      branchName: toBranch,
      projectId,
    });

    // find source branch variations
    const testVariations: TestVariation[] = await (this.pool.query('SELECT * FROM "TestVariation" WHERE project_id = $1 AND branch_name = $2', [projectId, fromBranch]))?.rows as TestVariation[];



    // compare source to destination branch variations
    for (const sourceBranchTestVariation of testVariations) {
      const baseline = this.staticService.getImage(sourceBranchTestVariation.baselineName);
      if (baseline) {
        // get destination branch request
        const createTestRequestDto: CreateTestRequestDto = {
          ...sourceBranchTestVariation,
          branchName: toBranch,
          buildId: build.id,
          diffTollerancePercent: 0,
          merge: true,
          ignoreAreas: JSON.parse(sourceBranchTestVariation.ignoreAreas),
        };

        // get destination branch variation
        let destintionBranchTestVariation = await this.find({
          projectId,
          branchName: toBranch,
          ...getTestVariationUniqueData(sourceBranchTestVariation),
        });

        if (destintionBranchTestVariation?.branchName !== toBranch) {
          destintionBranchTestVariation = await this.create({ createTestRequestDto });
        }

        const testRun = await this.testRunsService.create({
          testVariation: destintionBranchTestVariation,
          createTestRequestDto,
          imageBuffer: PNG.sync.write(baseline),
        });

        await this.testRunsService.calculateDiff(projectId, testRun);
      }
    }

    // stop build
    return this.buildsService.update(build.id, { isRunning: false });
  }

  async delete(id: string): Promise<TestVariation> {
    this.logger.debug(`Going to remove TestVariation ${id}`);
    const testVariation = await this.getDetails(id);

    // delete Baselines
    for (const baseline of testVariation.baselines) {
      await this.deleteBaseline(baseline);
    }

  

    await this.pool.query('UPDATE "public"."TestRun" SET "testVariationId" = NULL::text WHERE "testVariationId" = $1', [id]);
    // delete TestVariation
    return await this.pool.query('DELETE FROM "TestVariation" WHERE id = $1', [id]);
  }

  async deleteBaseline(baseline: Baseline): Promise<Baseline> {
    this.logger.debug(`Going to remove Baseline ${baseline.id}`);

    this.staticService.deleteImage(baseline.baselineName);
    return await this.pool.query('DELETE FROM "BaseLine" WHERE id = $1', [baseline.id]);
  }
}
