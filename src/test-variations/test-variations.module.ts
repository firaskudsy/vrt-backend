import { forwardRef, Module } from '@nestjs/common';
import { TestVariationsService } from './test-variations.service';
import { TestVariationsController } from './test-variations.controller';
import { TestRunsModule } from '../test-runs/test-runs.module';
import { BuildsModule } from '../builds/builds.module';
import { DatabaseModule } from 'src/common/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => TestRunsModule), forwardRef(() => BuildsModule)],
  providers: [TestVariationsService],
  controllers: [TestVariationsController],
  exports: [TestVariationsService],
})
export class TestVariationsModule {}
