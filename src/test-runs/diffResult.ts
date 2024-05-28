import { TestStatus } from "src/common/enums/enums";

export interface DiffResult {
  status: TestStatus;
  diffName: string;
  pixelMisMatchCount: number;
  diffPercent: number;
  isSameDimension: boolean;
}
