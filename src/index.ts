// Основные классы
export { ProcessManager } from './process-manager';
export { ProcessManagerAPI } from './process-manager-api';

// Основные типы
export type {
  ProcessConfig,
  ProcessInfo,
  ProcessCallbacks,
  ProcessManagerOptions,
  ResultFile,
  ProcessResults,
  ZipArchiveOptions
} from './types';

// Сервер (если нужен для прямого импорта)
export { main as startServer } from './server';

// Версия пакета
export const VERSION = '2.0.1';
