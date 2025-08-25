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
  execMode?: 'fork' | 'cluster';
  watch?: boolean;
  ignoreWatch?: string[];
  maxMemoryRestart?: string;
  errorFile?: string;
  outFile?: string;
  logFile?: string;
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
  pmId: number;
}

export interface ProcessManagerOptions {
  maxProcesses?: number;
  autoRestart?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  defaultOutputDirectory?: string;
  scriptsDirectory?: string;
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
