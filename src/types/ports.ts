export type PortProtocol = "tcp" | "udp";

export type PortEntry = {
  port: number;
  protocol: PortProtocol;
  address: string;
  state?: string;
  pid?: number;
  processName?: string;
  executablePath?: string;
  processStartTime?: number;
  username?: string;
};

export type PortQueryOptions = {
  showTcp: boolean;
  showUdp: boolean;
  listeningOnly: boolean;
};

export type PortSortKey = "port" | "protocol" | "processName" | "pid" | "address";

export type SortDirection = "ascending" | "descending";

export type PortSort = {
  key: PortSortKey;
  direction: SortDirection;
};

export type PortWatchError = {
  code: string;
  details?: { operation?: string; pid?: number };
};
