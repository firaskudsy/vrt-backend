import { Module } from '@nestjs/common';
import { CompareService } from './compare.service';
import { LookSameService } from './libs/looks-same/looks-same.service';
import { OdiffService } from './libs/odiff/odiff.service';
import { PixelmatchService } from './libs/pixelmatch/pixelmatch.service';
import { DatabaseModule } from 'src/common/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CompareService, PixelmatchService, LookSameService, OdiffService],
  exports: [CompareService],
})
export class CompareModule {}
