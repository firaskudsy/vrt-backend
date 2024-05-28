import { Controller, ParseUUIDPipe, Get, UseGuards, Param, Query, Delete, Inject } from '@nestjs/common';
import { ApiTags, ApiParam, ApiBearerAuth, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { TestVariationsService } from './test-variations.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { BuildDto } from '../builds/dto/build.dto';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../shared/roles.decorator';
import { MergeParams } from './types';
import { BaseTestVariationDto } from './dto/base-test-variation.dto';
import { TestVariationDto } from './dto/test-variation.dto';
import { Role } from 'src/common/enums/enums';
import { Pool } from 'pg';
import { TestVariation } from 'src/common/interfaces/testvariation.interface';
/* eslint-disable @darraghor/nestjs-typed/injectable-should-be-provided */
@ApiTags('test-variations')
@Controller('test-variations')
export class TestVariationsController {
  constructor(
    private testVariations: TestVariationsService,
    @Inject('DB_CONNECTION') private readonly pool: Pool
  ) {}

  @Get()
  @ApiQuery({ name: 'projectId', required: true })
  @ApiOkResponse({ type: BaseTestVariationDto, isArray: true })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getList(@Query('projectId', new ParseUUIDPipe()) projectId: string): Promise<BaseTestVariationDto[]> {
    return await this.pool.query('SELECT * FROM test_variations WHERE project_id = $1', [projectId]);
  }

  @Get('details/:id')
  @ApiParam({ name: 'id', required: true })
  @ApiOkResponse({ type: TestVariationDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getDetails(@Param('id', new ParseUUIDPipe()) id: string): Promise<TestVariation> {
    return this.testVariations.getDetails(id);
  }

  @Get('merge/')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'fromBranch', required: true })
  @ApiQuery({ name: 'toBranch', required: true })
  @ApiOkResponse({ type: BuildDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.admin, Role.editor)
  merge(@Query() params: MergeParams): Promise<BuildDto> {
    const { projectId, fromBranch, toBranch } = params;
    return this.testVariations.merge(projectId, fromBranch, toBranch);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', required: true })
  @ApiOkResponse({ type: BaseTestVariationDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.admin, Role.editor)
  delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<BaseTestVariationDto> {
    return this.testVariations.delete(id);
  }
}
