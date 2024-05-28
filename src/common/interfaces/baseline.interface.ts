import { TestRun } from "./testrun.interface";
import { TestVariation } from "./testvariation.interface";
import { User } from "./user.interface";


// baseline.interface.ts
export interface Baseline {
  id: string;
  baselineName: string;
  testVariationId: string;
  testRunId?: string;
  userId?: string;
  updatedAt: Date;
  createdAt: Date;
  testRun?: TestRun;
  testVariation?: TestVariation;
  user?: User;
}
