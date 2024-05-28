import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BuildDto } from '../../builds/dto/build.dto';
import { debounce } from 'lodash';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { Build } from 'src/common/interfaces/build.interface';
import { TestRun } from 'src/common/interfaces/testrun.interface';
@WebSocketGateway({ cors: true })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  constructor(@Inject('DB_CONNECTION') private readonly pool: Pool) {}

  private debounceTimeout = 1500;
  private maxWait = 3000;
  private testRunsCreatedQueued: Array<TestRun> = [];
  private testRunsDeletedQueued: Array<TestRun> = [];
  private testRunsUpdatedQueued: Array<TestRun> = [];
  private buildsUpdatedQueued: Array<string> = [];

  buildCreated(build: BuildDto): void {
    this.server.emit('build_created', build);
  }

  buildUpdated(id: string): void {
    this.buildsUpdatedQueued.push(id);
    this.buildUpdatedDebounced();
  }

  testRunCreated(testRun: TestRun): void {
    this.testRunsCreatedQueued.push(testRun);
    this.testRunCreatedDebounced();
    this.buildUpdated(testRun.buildId);
  }

  testRunUpdated(testRun: TestRun): void {
    this.testRunsUpdatedQueued.push(testRun);
    this.testRunUpdatedDebounced();
    this.buildUpdated(testRun.buildId);
  }

  testRunDeleted(testRun: TestRun): void {
    this.testRunsCreatedQueued = this.testRunsCreatedQueued.filter((tr) => tr.id !== testRun.id);
    this.testRunsUpdatedQueued = this.testRunsUpdatedQueued.filter((tr) => tr.id !== testRun.id);
    this.testRunsDeletedQueued.push(testRun);
    this.testRunDeletedDebounced();
    this.buildUpdated(testRun.buildId);
  }

  buildDeleted(buildDto: BuildDto) {
    this.server.emit('build_deleted', buildDto);
  }

  private testRunUpdatedDebounced = debounce(
    () => {
      this.server.emit('testRun_updated', this.testRunsUpdatedQueued);
      this.testRunsUpdatedQueued = [];
    },
    this.debounceTimeout,
    {
      leading: true,
      maxWait: this.maxWait,
    }
  );

  private testRunCreatedDebounced = debounce(
    () => {
      this.server.emit('testRun_created', this.testRunsCreatedQueued);
      this.testRunsCreatedQueued = [];
    },
    this.debounceTimeout,
    {
      leading: true,
      maxWait: this.maxWait,
    }
  );

  private testRunDeletedDebounced = debounce(
    () => {
      this.server.emit('testRun_deleted', this.testRunsDeletedQueued);
      this.testRunsDeletedQueued = [];
    },
    this.debounceTimeout,
    {
      leading: true,
      maxWait: this.maxWait,
    }
  );

  private buildUpdatedDebounced = debounce(
    () => {
      const buildIds = this.buildsUpdatedQueued;
      this.buildsUpdatedQueued = [];

      const query = `
        SELECT * FROM "Build"
        WHERE id IN (${buildIds.map((id) => `'${id}'`).join(',')})
      `;

      this.pool.query(query)
        .then((result) => {
          const builds: Array<Build> = result.rows;
          this.server.emit(
            'build_updated',
            builds.map((build: Build) => new BuildDto(build))
          );
        })
        .catch((error) => {
          console.error('Error fetching builds:', error);
        });
    },
    this.debounceTimeout,
    {
      leading: true,
      maxWait: this.maxWait,
    }
  );
}
