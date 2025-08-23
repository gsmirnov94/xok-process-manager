import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Примеры использования HTTP API ProcessManager

export class ProcessManagerAPIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Проверка здоровья сервера
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      console.log('Health check:', response.data);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Инициализация PM2
   */
  async initializePM2() {
    try {
      const response = await axios.post(`${this.baseURL}/init`);
      console.log('PM2 initialized:', response.data);
      return response.data;
    } catch (error) {
      console.error('PM2 initialization failed:', error);
      throw error;
    }
  }

  /**
   * Создание нового процесса
   */
  async createProcess(processConfig: {
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
    time?: boolean;
    outputDirectory?: string;
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/processes`, processConfig);
      console.log('Process created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Process creation failed:', error);
      throw error;
    }
  }

  /**
   * Получение списка всех процессов
   */
  async getAllProcesses() {
    try {
      const response = await axios.get(`${this.baseURL}/processes`);
      console.log('All processes:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get processes:', error);
      throw error;
    }
  }

  /**
   * Получение информации о процессе
   */
  async getProcessInfo(processName: string) {
    try {
      const response = await axios.get(`${this.baseURL}/processes/${processName}`);
      console.log(`Process ${processName} info:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to get process ${processName} info:`, error);
      throw error;
    }
  }

  /**
   * Запуск процесса
   */
  async startProcess(processName: string) {
    try {
      const response = await axios.post(`${this.baseURL}/processes/${processName}/start`);
      console.log(`Process ${processName} started:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to start process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Остановка процесса
   */
  async stopProcess(processName: string) {
    try {
      const response = await axios.post(`${this.baseURL}/processes/${processName}/stop`);
      console.log(`Process ${processName} stopped:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to stop process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Перезапуск процесса
   */
  async restartProcess(processName: string) {
    try {
      const response = await axios.post(`${this.baseURL}/processes/${processName}/restart`);
      console.log(`Process ${processName} restarted:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to restart process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Удаление процесса
   */
  async deleteProcess(processName: string) {
    try {
      const response = await axios.delete(`${this.baseURL}/processes/${processName}`);
      console.log(`Process ${processName} deleted:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Получение статуса процесса
   */
  async getProcessStatus(processName: string) {
    try {
      const response = await axios.get(`${this.baseURL}/processes/${processName}/status`);
      console.log(`Process ${processName} status:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to get process ${processName} status:`, error);
      throw error;
    }
  }

  /**
   * Остановка всех процессов
   */
  async stopAllProcesses() {
    try {
      const response = await axios.post(`${this.baseURL}/processes/stop-all`);
      console.log('All processes stopped:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to stop all processes:', error);
      throw error;
    }
  }

  /**
   * Перезапуск всех процессов
   */
  async restartAllProcesses() {
    try {
      const response = await axios.post(`${this.baseURL}/processes/restart-all`);
      console.log('All processes restarted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to restart all processes:', error);
      throw error;
    }
  }

  /**
   * Сохранение файла результата
   */
  async saveResultFile(processName: string, fileName: string, content: string, encoding: 'utf8' | 'base64' = 'utf8') {
    try {
      const response = await axios.post(`${this.baseURL}/processes/${processName}/results`, {
        fileName,
        content,
        encoding
      });
      console.log(`Result file saved for ${processName}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to save result file for ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Получение результатов процесса
   */
  async getProcessResults(processName: string) {
    try {
      const response = await axios.get(`${this.baseURL}/processes/${processName}/results`);
      console.log(`Process ${processName} results:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to get results for ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Получение всех результатов
   */
  async getAllResults() {
    try {
      const response = await axios.get(`${this.baseURL}/results`);
      console.log('All results:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get all results:', error);
      throw error;
    }
  }

  /**
   * Создание ZIP архива с результатами процесса
   */
  async createProcessResultsZip(processName: string, outputPath?: string, options?: {
    compressionLevel?: number;
    includeProcessName?: boolean;
    flattenStructure?: boolean;
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/processes/${processName}/results/zip`, {
        outputPath,
        options
      });
      console.log(`ZIP archive created for ${processName}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to create ZIP for ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Создание ZIP архива со всеми результатами
   */
  async createAllResultsZip(outputPath?: string, options?: {
    compressionLevel?: number;
    includeProcessName?: boolean;
    flattenStructure?: boolean;
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/results/zip`, {
        outputPath,
        options
      });
      console.log('All results ZIP archive created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create all results ZIP:', error);
      throw error;
    }
  }

  /**
   * Удаление файла результата
   */
  async deleteResultFile(processName: string, fileName: string) {
    try {
      const response = await axios.delete(`${this.baseURL}/processes/${processName}/results/${fileName}`);
      console.log(`Result file ${fileName} deleted for ${processName}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete result file ${fileName} for ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Очистка результатов процесса
   */
  async clearProcessResults(processName: string) {
    try {
      const response = await axios.delete(`${this.baseURL}/processes/${processName}/results`);
      console.log(`Results cleared for ${processName}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to clear results for ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Очистка всех результатов
   */
  async clearAllResults() {
    try {
      const response = await axios.delete(`${this.baseURL}/results`);
      console.log('All results cleared:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to clear all results:', error);
      throw error;
    }
  }

  /**
   * Получение статистики
   */
  async getStatistics() {
    try {
      const response = await axios.get(`${this.baseURL}/statistics`);
      console.log('Statistics:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Принудительное завершение
   */
  async shutdown() {
    try {
      const response = await axios.post(`${this.baseURL}/shutdown`);
      console.log('Shutdown initiated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to initiate shutdown:', error);
      throw error;
    }
  }
}

// Пример использования
async function exampleUsage() {
  const client = new ProcessManagerAPIClient();

  try {
    // Проверяем здоровье сервера
    await client.checkHealth();

    // Инициализируем PM2
    await client.initializePM2();

    // Создаем процесс
    const processConfig = {
      name: 'example-process',
      script: './example-script.js',
      args: ['--env', 'production'],
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork' as const,
      watch: false
    };

    await client.createProcess(processConfig);

    // Получаем информацию о процессе
    await client.getProcessInfo('example-process');

    // Запускаем процесс
    await client.startProcess('example-process');

    // Ждем немного
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Получаем статус
    await client.getProcessStatus('example-process');

    // Сохраняем файл результата
    await client.saveResultFile('example-process', 'output.txt', 'Process completed successfully');

    // Получаем результаты
    await client.getProcessResults('example-process');

    // Создаем ZIP архив
    await client.createProcessResultsZip('example-process');

    // Получаем статистику
    await client.getStatistics();

    // Останавливаем процесс
    await client.stopProcess('example-process');

    // Удаляем процесс
    await client.deleteProcess('example-process');

  } catch (error) {
    console.error('Example usage failed:', error);
  }
}

// Экспортируем для использования в других файлах
export { exampleUsage };

// Запускаем пример, если файл запущен напрямую
if (require.main === module) {
  exampleUsage().catch(console.error);
}
