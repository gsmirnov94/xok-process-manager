import { ProcessConfig, ProcessInfo } from './types';

export class ProcessManager {
  /**
   * Create a new PM2 process
   * @param config Process configuration
   * @returns Promise that resolves to process information
   */
  async createProcess(config: ProcessConfig): Promise<void> {
    try {
      const pm2 = require('pm2');
      
      console.log('ProcessManager: Starting process with config:', JSON.stringify(config, null, 2));
      
      return new Promise((resolve, reject) => {
        pm2.connect((err: Error) => {
          if (err) {
            console.error('ProcessManager: PM2 connect error:', err);
            reject(err);
            return;
          }

          const pm2Config = {
            name: config.name,
            script: config.script,
            args: config.args,
            interpreter: config.interpreter,
            cwd: config.cwd,
            env: config.env,
            instances: config.instances,
            watch: config.watch,
            autorestart: config.autorestart,
            max_memory_restart: config.maxMemoryRestart
          };
          
          console.log('ProcessManager: PM2 config:', JSON.stringify(pm2Config, null, 2));

          pm2.start(config.script, pm2Config, (err: Error) => {
            if (err) {
              console.error('ProcessManager: PM2 start error:', err);
              reject(err);
              return;
            }
            
            console.log('ProcessManager: Process started successfully');
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('ProcessManager: Unexpected error:', error);
      throw new Error(`Failed to create process: ${error}`);
    }
  }

  /**
   * Get list of all PM2 processes
   * @returns Promise that resolves to array of process information
   */
  async getProcessList(): Promise<ProcessInfo[]> {
    try {
      const pm2 = require('pm2');
      
      return new Promise((resolve, reject) => {
        pm2.connect((err: Error) => {
          if (err) {
            reject(err);
            return;
          }

          pm2.list((err: Error, processes: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            const processList: ProcessInfo[] = processes.map(proc => ({
              name: proc.name,
              pmId: proc.pm_id,
              pid: proc.pid,
              status: proc.pm2_env?.status || null,
              restartTime: proc.pm2_env?.restart_time,
              cpu: proc.monit?.cpu,
              memory: proc.monit?.memory,
              monit: proc.monit,
              pm2Env: proc.pm2_env,
            }));

            resolve(processList);
          });
        });
      });
    } catch (error) {
      throw new Error(`Failed to get process list: ${error}`);
    }
  }

  /**
   * Get specific process by name or ID
   * @param identifier Process name or PM2 ID
   * @returns Promise that resolves to process information array for name, single process for ID, or null if not found
   */
  async getProcess(identifier: string | number): Promise<ProcessInfo[] | ProcessInfo | null> {
    try {
      const processes = await this.getProcessList();
      
      if (typeof identifier === 'number') {
        // For numeric ID, return single process
        return processes.find(proc => proc.pmId === identifier) || null;
      } else {
        // For string name, return all processes with that name
        const matchingProcesses = processes.filter(proc => proc.name === identifier);
        return matchingProcesses.length > 0 ? matchingProcesses : null;
      }
    } catch (error) {
      throw new Error(`Failed to get process: ${error}`);
    }
  }

  /**
   * Stop a PM2 process
   * @param identifier Process name or PM2 ID
   * @returns Promise that resolves when process is stopped
   */
  async stopProcess(identifier: string | number): Promise<void> {
    try {
      const pm2 = require('pm2');
      
      return new Promise((resolve, reject) => {
        pm2.connect((err: Error) => {
          if (err) {
            reject(err);
            return;
          }

          pm2.stop(identifier, (err: Error) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
    } catch (error) {
      throw new Error(`Failed to stop process: ${error}`);
    }
  }

  /**
   * Disconnect from PM2 daemon
   */
  disconnect(): void {
    try {
      const pm2 = require('pm2');
      pm2.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  }
}
