import { jest } from '@jest/globals';

// Мокаем PM2 модуль
jest.mock('pm2', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  restart: jest.fn(),
  delete: jest.fn(),
  describe: jest.fn(),
  list: jest.fn()
}));

// Мокаем fs модуль
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  createWriteStream: jest.fn()
}));

// Мокаем path модуль
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Мокаем archiver модуль
jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn().mockReturnThis(),
    file: jest.fn().mockReturnThis(),
    finalize: jest.fn(),
    on: jest.fn(),
    pointer: jest.fn(() => 1024)
  };
  
  return jest.fn(() => mockArchive);
});

// Глобальные переменные для тестов
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Очистка моков после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
