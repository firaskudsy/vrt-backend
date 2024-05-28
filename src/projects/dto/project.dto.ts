import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsBoolean, IsEnum, IsJSON, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ImageComparison } from 'src/common/enums/enums';
import { Project } from 'src/common/interfaces/project.interface';

export class ProjectDto implements Project {
  @ApiProperty()
  @IsUUID()
  readonly id: string;

  @ApiProperty()
  @IsNumber()
  readonly buildsCounter: number;

  @ApiProperty()
  @IsString()
  readonly name: string;

  @ApiProperty()
  @IsString()
  readonly mainBranchName: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  readonly updatedAt: Date;

  @ApiProperty()
  @IsBoolean()
  autoApproveFeature: boolean;

  @ApiProperty(
    {
      enum: ImageComparison,
      enumName: 'ImageComparison',
    }
  )
  @IsEnum(ImageComparison)
  imageComparison: ImageComparison;

  @ApiProperty()
  @IsNumber()
  maxBuildAllowed: number;

  @ApiProperty()
  @IsNumber()
  maxBranchLifetime: number;

  @ApiProperty()
  @IsJSON()
  imageComparisonConfig: string;
}
