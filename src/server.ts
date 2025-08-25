import { ProcessManagerAPI } from './process-manager-api';

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || 'localhost';

// Create and start the API server
const api = new ProcessManagerAPI(PORT);

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  await api.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  await api.shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log(`🚀 Process Manager API Server starting...`);
console.log(`📍 Server will be available at: http://${HOST}:${PORT}`);
console.log(`🔧 API endpoints: http://${HOST}:${PORT}/api`);
console.log(`💚 Health check: http://${HOST}:${PORT}/api/health`);
console.log(`\n📋 Available endpoints:`);
console.log(`   POST   /api/processes     - Create new process`);
console.log(`   GET    /api/processes     - List all processes`);
console.log(`   GET    /api/processes/:id - Get specific process`);
console.log(`   DELETE /api/processes/:id - Stop process`);
console.log(`   GET    /api/health        - Health check`);
console.log(`\n⏹️  Press Ctrl+C to stop the server`);
