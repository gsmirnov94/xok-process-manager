#!/usr/bin/env node

console.log('Example script started');
console.log('Process ID:', process.pid);
console.log('Node version:', process.version);

// Имитируем работу процесса
let counter = 0;
const interval = setInterval(() => {
  counter++;
  console.log(`Counter: ${counter}`);
  
  if (counter >= 10) {
    console.log('Script completed');
    clearInterval(interval);
    process.exit(0);
  }
}, 1000);

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  clearInterval(interval);
  process.exit(0);
});

console.log('Script is running...');
