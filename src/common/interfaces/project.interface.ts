import { ImageComparison } from "../enums/enums";
import { Build } from "./build.interface";
import { TestRun } from "./testrun.interface";
import { TestVariation } from "./testvariation.interface";

// project.interface.ts
export interface Project {
  id: string;
  name: string;
  mainBranchName: string;
  buildsCounter: number;
  maxBuildAllowed: number;
  maxBranchLifetime: number;
  updatedAt: Date;
  createdAt: Date;
  autoApproveFeature: boolean;
  imageComparison: ImageComparison;
  imageComparisonConfig: string;
  builds?: Build[];
  testRuns?: TestRun[];
  testVariations?: TestVariation[];
}