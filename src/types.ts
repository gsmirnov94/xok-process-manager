export interface ProcessCallbacks {
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onRestart?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export interface ProcessConfig {
  name: string;
  script: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  instances?: number;
  exec_mode?: 'fork' | 'cluster';
  watch?: boolean;
  ignore_watch?: string[];
  max_memory_restart?: string;
  error_file?: string;
  out_file?: string;
  log_file?: string;
  time?: boolean;
  callbacks?: ProcessCallbacks;
}

export interface ProcessInfo {
  id: number;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  pm_id: number;
}

export interface ProcessManagerOptions {
  maxProcesses?: number;
  autoRestart?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}
