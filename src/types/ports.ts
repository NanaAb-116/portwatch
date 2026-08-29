export type PortProtocol = "tcp" | "udp";

export type PortEntry = {
  port: number;
  protocol: PortProtocol;
  address: string;
  state?: string;
  pid?: number;
  processName?: string;
  executablePath?: string;
  username?: string;
};

export type PortQueryOptions = {
  showTcp: boolean;
  showUdp: boolean;
  listeningOnly: boolean;
};

export type PortWatchError = {
  code: string;
  details?: { operation?: string };
};
