import { Project } from "./project.interface";
import { TestRun } from "./testrun.interface";
import { User } from "./user.interface";

// build.interface.ts
export interface Build {
  id: string;
  ciBuildId?: string;
  number?: number;
  branchName?: string;
  status?: string;
  projectId: string;
  updatedAt: Date;
  createdAt: Date;
  userId?: string;
  isRunning?: boolean;
  project?: Project;
  user?: User;
  testRuns?: TestRun[];
}