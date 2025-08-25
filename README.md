# XOK Process Manager

A powerful Node.js process management system built with TypeScript that provides both programmatic and REST API interfaces for managing PM2 processes.

## Features

- 🚀 **Process Management**: Start, stop, restart, and monitor Node.js processes using PM2
- 🔌 **REST API**: HTTP endpoints for remote process management
- 📊 **Process Monitoring**: Real-time process information including CPU, memory, and status
- 🎯 **TypeScript Support**: Full TypeScript support with type definitions
- 🛠️ **Flexible Configuration**: Support for various PM2 configuration options
- 📁 **Process Scripts**: Example scripts and process management utilities

## Installation

```bash
npm install xok-process-manager
```

**Note**: This package requires PM2 as a peer dependency. Make sure you have PM2 installed globally:

```bash
npm install -g pm2
```

## Quick Start

### Using the Process Manager directly

```typescript
import { ProcessManager } from 'xok-process-manager';

const processManager = new ProcessManager();

// Start a new process
await processManager.createProcess({
  name: 'my-app',
  script: './app.js',
  instances: 2,
  watch: true,
  autorestart: true
});

// Get all processes
const processes = await processManager.getProcessList();
console.log(processes);
```

### Using the REST API

```typescript
import { ProcessManagerAPI } from 'xok-process-manager';

// Start the API server on port 3000
const api = new ProcessManagerAPI(3000);
```

## API Reference

### ProcessManager Class

#### `createProcess(config: ProcessConfig): Promise<void>`

Creates and starts a new PM2 process.

```typescript
interface ProcessConfig {
  name?: string;           // Process name
  script: string;          // Path to script file
  args?: string | string[]; // Command line arguments
  interpreter?: string;    // Interpreter (e.g., 'node', 'python')
  cwd?: string;           // Working directory
  env?: Record<string, string>; // Environment variables
  instances?: number | 'max'; // Number of instances
  watch?: boolean | string[]; // Watch for file changes
  autorestart?: boolean;   // Auto-restart on crash
  maxMemoryRestart?: string; // Memory limit for restart
}
```

#### `getProcessList(): Promise<ProcessInfo[]>`

Returns information about all running processes.

#### `getProcess(identifier: string | number): Promise<ProcessInfo | ProcessInfo[]>`

Returns information about a specific process by name or ID.

#### `stopProcess(identifier: string | number): Promise<void>`

Stops a running process.

#### `restartProcess(identifier: string | number): Promise<void>`

Restarts a running process.

#### `deleteProcess(identifier: string | number): Promise<void>`

Deletes a process from PM2.

### REST API Endpoints

The ProcessManagerAPI provides the following HTTP endpoints:

- `POST /api/processes` - Create a new process
- `GET /api/processes` - Get all processes
- `GET /api/processes/:identifier` - Get specific process
- `DELETE /api/processes/:identifier` - Stop a process
- `GET /api/health` - Health check endpoint

## Example Usage

### Basic Process Management

```typescript
import { ProcessManager } from 'xok-process-manager';

async function manageProcesses() {
  const pm = new ProcessManager();
  
  try {
    // Start a web server
    await pm.createProcess({
      name: 'web-server',
      script: './server.js',
      instances: 2,
      watch: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    });
    
    // Start a worker process
    await pm.createProcess({
      name: 'worker',
      script: './worker.js',
      instances: 'max',
      autorestart: true
    });
    
    // Get process list
    const processes = await pm.getProcessList();
    console.log('Running processes:', processes);
    
  } catch (error) {
    console.error('Error managing processes:', error);
  }
}
```

### Using the REST API

```typescript
import { ProcessManagerAPI } from 'xok-process-manager';

// Start API server
const api = new ProcessManagerAPI(3000);

// Now you can use HTTP requests to manage processes:

// Start a process
fetch('http://localhost:3000/api/processes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'my-app',
    script: './app.js',
    instances: 1
  })
});

// Get all processes
fetch('http://localhost:3000/api/processes')
  .then(res => res.json())
  .then(data => console.log(data.processes));
```

### Example Process Script

The package includes an example process script that demonstrates how to create processes that can be managed by PM2:

```bash
# Run the example process
node process-scripts/example-process.js 5 /path/to/output

# Or manage it through PM2
pm2 start process-scripts/example-process.js --name "file-creator" -- 5 /path/to/output
```

## Development

### Building the Project

```bash
npm run build
```

### Running the API Server

```bash
# Production
npm run start:api

# Development with auto-reload
npm run dev:api
```

### Running Tests

```bash
npm test
```

## Project Structure

```
xok-process-manager/
├── src/
│   ├── index.ts              # Main exports
│   ├── process-manager.ts    # Core ProcessManager class
│   ├── process-manager-api.ts # REST API implementation
│   ├── server.ts             # API server
│   └── types.ts              # TypeScript type definitions
├── process-scripts/           # Example process scripts
├── process-results/           # Process output and results
└── dist/                     # Compiled JavaScript output
```

## Requirements

- Node.js >= 16.0.0
- PM2 >= 5.0.0 (peer dependency)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

If you encounter any issues or have questions, please:

1. Check the [issues page](https://github.com/gsmirnov94/xok-process-manager/issues)
2. Create a new issue with detailed information about your problem
3. Include your Node.js version, PM2 version, and any error messages
