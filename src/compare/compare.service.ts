import { Inject, Injectable } from '@nestjs/common';
import { PixelmatchService } from './libs/pixelmatch/pixelmatch.service';
import { ImageComparator } from './libs/image-comparator.interface';
import { ImageCompareInput } from './libs/ImageCompareInput';
import { DiffResult } from '../test-runs/diffResult';
import { LookSameService } from './libs/looks-same/looks-same.service';
import { OdiffService } from './libs/odiff/odiff.service';
import { Pool } from 'pg';
import { Project } from 'src/common/interfaces/project.interface';
import { ImageComparison } from 'src/common/enums/enums';
@Injectable()
export class CompareService {
  constructor(
    private pixelmatchService: PixelmatchService,
    private lookSameService: LookSameService,
    private odiffService: OdiffService,
    @Inject('DB_CONNECTION') private readonly pool: Pool
  ) {}

  async getDiff({ projectId, data }: { projectId: string; data: ImageCompareInput }): Promise<DiffResult> {
    const project: Project = (await this.pool.query('SELECT * FROM projects WHERE id = $1', [projectId]))?.rows[0] as Project | undefined;
    const comparator = this.getComparator(project.imageComparison);
    const config = comparator.parseConfig(project.imageComparisonConfig);
    return comparator.getDiff(data, config);
  }

  getComparator(imageComparison: ImageComparison): ImageComparator {
    switch (imageComparison) {
      case ImageComparison.pixelmatch: {
        return this.pixelmatchService;
      }
      case ImageComparison.lookSame: {
        return this.lookSameService;
      }
      case ImageComparison.odiff: {
        return this.odiffService;
      }
      default: {
        return this.pixelmatchService;
      }
    }
  }
}
