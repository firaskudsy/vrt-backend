import { TestStatus } from "../enums/enums";
import { Baseline } from "./baseline.interface";
import { Build } from "./build.interface";
import { Project } from "./project.interface";
import { TestVariation } from "./testvariation.interface";

// testRun.interface.ts
export interface TestRun {
  id: string;
  imageName: string;
  diffName?: string;
  diffPercent?: number;
  diffTollerancePercent: number;
  pixelMisMatchCount?: number;
  status: TestStatus;
  buildId: string;
  testVariationId?: string;
  projectId?: string;
  merge: boolean;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  browser?: string;
  device?: string;
  os?: string;
  viewport?: string;
  customTags?: string;
  baselineName?: string;
  comment?: string;
  branchName: string;
  baselineBranchName?: string;
  ignoreAreas: string;
  tempIgnoreAreas: string;
  baseline?: Baseline;
  build?: Build;
  project?: Project;
  testVariation?: TestVariation;
}