export type ProcessIdentity = {
  pid: number;
  processName: string;
  executablePath?: string;
  startTime: number;
};

export type TerminationOutcome =
  | { status: "terminated" }
  | { status: "already_exited" }
  | { status: "still_running"; forceAuthorization: string };

