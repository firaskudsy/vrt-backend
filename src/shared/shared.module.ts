import { forwardRef, Global, Module } from '@nestjs/common';
import { StaticService } from './static/static.service';
import { EventsGateway } from '../shared/events/events.gateway';
import { TasksService } from './tasks/tasks.service';
import { TestVariationsModule } from '../test-variations/test-variations.module';
import { DatabaseModule } from 'src/common/database/database.module';

@Global()
@Module({
  providers: [StaticService, EventsGateway,  TasksService],
  exports: [StaticService, EventsGateway],
  imports: [
    DatabaseModule,
    forwardRef(() => TestVariationsModule)],
  controllers: [],
})
export class SharedModule {}
