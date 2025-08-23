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
  outputDirectory?: string;
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
  defaultOutputDirectory?: string;
}

export interface ResultFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
  processName: string;
}

export interface ProcessResults {
  processName: string;
  files: ResultFile[];
  totalSize: number;
  fileCount: number;
}

export interface ZipArchiveOptions {
  includeProcessName?: boolean;
  flattenStructure?: boolean;
  compressionLevel?: number;
  password?: string;
}
