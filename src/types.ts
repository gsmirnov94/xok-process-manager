export interface ProcessConfig {
  name?: string;
  script: string;
  args?: string | string[];
  interpreter?: string;
  cwd?: string;
  env?: Record<string, string>;
  instances?: number | 'max';
  watch?: boolean | string[];
  autorestart?: boolean;
  maxMemoryRestart?: string;
}

export interface ProcessInfo {
  name: string;
  pmId: number | null;
  pid: number | null;
  status: string | null;
  restartTime?: number;
  cpu?: number;
  memory?: number;
  monit?: { memory?: number; cpu?: number } | undefined;
  pm2Env?: any;
}
