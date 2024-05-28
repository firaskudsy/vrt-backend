import { Baseline } from "./baseline.interface";
import { Project } from "./project.interface";
import { TestRun } from "./testrun.interface";

// testVariation.interface.ts
export interface TestVariation {
  id: string;
  name: string;
  branchName: string;
  browser: string;
  device: string;
  os: string;
  viewport: string;
  customTags: string;
  baselineName?: string;
  ignoreAreas: string;
  projectId: string;
  comment?: string;
  updatedAt: Date;
  createdAt: Date;
  baselines?: Baseline[];
  testRuns?: TestRun[];
  project?: Project;
}
