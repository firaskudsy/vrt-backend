import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestRunDto } from './testRun.dto';
import { TestRun } from 'src/common/interfaces/testrun.interface';
import { TestVariation } from 'src/common/interfaces/testvariation.interface';

export class TestRunResultDto extends TestRunDto {
  @ApiPropertyOptional()
  pixelMisMatchCount?: number;
  @ApiProperty()
  url: string;
  @ApiProperty()
  baselineName: string;

  constructor(testRun: TestRun, testVariation: TestVariation) {
    super(testRun);
    this.baselineName = testVariation.baselineName;
    this.pixelMisMatchCount = testRun.pixelMisMatchCount;
    this.url = `${process.env.APP_FRONTEND_URL}/${testVariation.projectId}?buildId=${testRun.buildId}&testId=${testRun.id}`;
  }
}
