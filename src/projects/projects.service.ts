import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { BuildsService } from '../builds/builds.service';
import { TestVariationsService } from '../test-variations/test-variations.service';
import uuidAPIKey from 'uuid-apikey';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Pool } from 'pg';
import { Project } from 'src/common/interfaces/project.interface';
import { Build } from 'src/common/interfaces/build.interface';
import { TestVariation } from 'src/common/interfaces/testvariation.interface';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject('DB_CONNECTION') private readonly pool: Pool,
    @Inject(forwardRef(() => BuildsService))
    private buildsService: BuildsService,
    @Inject(forwardRef(() => TestVariationsService))
    private testVariationsService: TestVariationsService
  ) {}

  async findOne(idOrName: string): Promise<Project> {
    const isUUID = uuidAPIKey.isUUID(idOrName);
    const query = `
      SELECT * FROM "Project"
      WHERE ${isUUID ? 'id' : 'name'} = $1
    `;
    const values = [idOrName];
    const result = await this.pool.query(query, values);

    const project: Project = result.rows[0];

    if (!project) {
      throw new HttpException(`Project not found`, HttpStatus.NOT_FOUND);
    }
    return project;
  }

  async findAll(): Promise<Project[]> {
    const query = `
      SELECT * FROM "Project"
    `;
    const result = await this.pool.query(query);
    const projects: Project[] = result.rows;
    return projects;
  }

  async create(projectDto: CreateProjectDto): Promise<Project> {
    const query = `
      INSERT INTO "Project" (name, mainBranchName, autoApproveFeature, imageComparison, imageComparisonConfig)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      projectDto.name,
      projectDto.mainBranchName,
      projectDto.autoApproveFeature,
      projectDto.imageComparison,
      projectDto.imageComparisonConfig,
    ];
    const result = await this.pool.query(query, values);
    const project: Project = result.rows[0];
    return project;
  }

  async update(projectDto: UpdateProjectDto): Promise<Project> {
    const query = `
      UPDATE "Project"
      SET name = $1,
          mainBranchName = $2,
          autoApproveFeature = $3,
          imageComparison = $4,
          maxBuildAllowed = $5,
          maxBranchLifetime = $6,
          imageComparisonConfig = $7
      WHERE id = $8
      RETURNING *
    `;
    const values = [
      projectDto.name,
      projectDto.mainBranchName,
      projectDto.autoApproveFeature,
      projectDto.imageComparison,
      projectDto.maxBuildAllowed,
      projectDto.maxBranchLifetime,
      projectDto.imageComparisonConfig,
      projectDto.id,
    ];
    const result = await this.pool.query(query, values);
    const project: Project = result.rows[0];
    return project;
  }

  async remove(id: string): Promise<Project> {
    this.logger.debug(`Going to remove Project ${id}`);
    const query = `
      SELECT * FROM "Project"
      WHERE id = $1
    `;
    const values = [id];
    const result = await this.pool.query(query, values);
    const project: Project = result.rows[0];

    const buildQuery = `
      SELECT * FROM "Build"
      WHERE projectId = $1
    `;
    const buildValues = [project.id];
    const buildResult = await this.pool.query(buildQuery, buildValues);
    const builds: Build[] = buildResult.rows;

    const testVariationQuery = `
      SELECT * FROM "TestVariation"
      WHERE projectId = $1
    `;
    const testVariationValues = [project.id];
    const testVariationResult = await this.pool.query(testVariationQuery, testVariationValues);
    const testVariations: TestVariation[] = testVariationResult.rows;

    for (const build of builds) {
      await this.buildsService.remove(build.id);
    }
    for (const testVariation of testVariations) {
      await this.testVariationsService.delete(testVariation.id);
    }

    const deleteQuery = `
      DELETE FROM "Project"
      WHERE id = $1
      RETURNING *
    `;
    const deleteValues = [project.id];
    const deleteResult = await this.pool.query(deleteQuery, deleteValues);
    const deletedProject: Project = deleteResult.rows[0];

    return deletedProject;
  }
}
