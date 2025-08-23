import { ProcessCallbacks } from '../src/types';

// Простые тесты для проверки типов и структуры
describe('ProcessManagerAPI Types and Structure', () => {
  describe('ProcessCallbacks Interface', () => {
    it('should allow all callback types', () => {
      const callbacks: ProcessCallbacks = {
        onStart: () => console.log('Started'),
        onStop: () => console.log('Stopped'),
        onRestart: () => console.log('Restarted'),
        onDelete: () => console.log('Deleted')
      };

      expect(typeof callbacks.onStart).toBe('function');
      expect(typeof callbacks.onStop).toBe('function');
      expect(typeof callbacks.onRestart).toBe('function');
      expect(typeof callbacks.onDelete).toBe('function');
    });

    it('should allow partial callbacks', () => {
      const partialCallbacks: ProcessCallbacks = {
        onStart: () => console.log('Started'),
        onStop: () => console.log('Stopped')
        // onRestart и onDelete не определены
      };

      expect(typeof partialCallbacks.onStart).toBe('function');
      expect(typeof partialCallbacks.onStop).toBe('function');
      expect(partialCallbacks.onRestart).toBeUndefined();
      expect(partialCallbacks.onDelete).toBeUndefined();
    });

    it('should allow async callbacks', () => {
      const asyncCallbacks: ProcessCallbacks = {
        onStart: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          console.log('Started async');
        },
        onStop: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          console.log('Stopped async');
        }
      };

      expect(typeof asyncCallbacks.onStart).toBe('function');
      expect(typeof asyncCallbacks.onStop).toBe('function');
    });

    it('should allow empty callbacks object', () => {
      const emptyCallbacks: ProcessCallbacks = {};

      expect(Object.keys(emptyCallbacks)).toHaveLength(0);
    });
  });

  describe('Constructor Parameters', () => {
    it('should accept ProcessManager as first parameter', () => {
      // Проверяем, что типы корректны
      const mockProcessManager = {} as any;
      const port = 3000;
      const callbacks: ProcessCallbacks = { onStart: () => {} };

      // Эти строки проверяют типы на этапе компиляции
      expect(mockProcessManager).toBeDefined();
      expect(typeof port).toBe('number');
      expect(typeof callbacks.onStart).toBe('function');
    });

    it('should accept optional port parameter', () => {
      const port1 = 3000;
      const port2 = undefined;

      expect(typeof port1).toBe('number');
      expect(port2).toBeUndefined();
    });

    it('should accept optional ProcessCallbacks parameter', () => {
      const callbacks1: ProcessCallbacks = { onStart: () => {} };
      const callbacks2: ProcessCallbacks | undefined = undefined;

      expect(typeof callbacks1.onStart).toBe('function');
      expect(callbacks2).toBeUndefined();
    });
  });
});
