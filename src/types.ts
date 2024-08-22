export interface TimeSeparated {
  seconds?: number;
  minutes?: number;
  hours?: number;
}

export interface Stats {
  approveLimit: number;
  approveCurrent: number;
  wrapLimit: number;
  wrapCurrent: number;
  hasPoints: boolean | undefined;
  claimedPoints: boolean;
}

export type StatNames = keyof Stats;
