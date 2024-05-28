import { Role } from "../enums/enums";
import { Baseline } from "./baseline.interface";
import { Build } from "./build.interface";

// user.interface.ts
export interface User {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  apiKey: string;
  isActive: boolean;
  role: Role;
  updatedAt: Date;
  createdAt: Date;
  baselines?: Baseline[];
  builds?: Build[];
}
