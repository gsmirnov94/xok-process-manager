#!/usr/bin/env node

/**
 * Example process script for ProcessManager
 * This script demonstrates how to create a process that can be managed by PM2
 * 
 * Usage: node example-process.js <numberOfFiles> [outputDirectory]
 * Example: node example-process.js 5
 * Example: node example-process.js 5 /path/to/output
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

// Debug: Log all arguments received
console.log('🔍 Debug: process.argv =', process.argv);
console.log('🔍 Debug: args received =', args);
console.log('🔍 Debug: args[0] =', args[0], 'type:', typeof args[0]);
console.log('🔍 Debug: args[1] =', args[1], 'type:', typeof args[1]);

// Validate required arguments
if (args.length === 0 || !args[0]) {
  console.error('❌ Error: Number of files to create is required');
  console.error('Usage: node example-process.js <numberOfFiles> <outputDirectory>');
  console.error('Example: node example-process.js 5 /path/to/output');
  process.exit(1);
}

if (args.length < 2 || !args[1]) {
  console.error('❌ Error: Output directory is required');
  console.error('Usage: node example-process.js <numberOfFiles> <outputDirectory>');
  console.error('Example: node example-process.js 5 /path/to/output');
  process.exit(1);
}

const numberOfFiles = parseInt(args[0]);
if (isNaN(numberOfFiles) || numberOfFiles <= 0) {
  console.error('❌ Error: Number of files must be a positive integer');
  console.error(`Received: "${args[0]}"`);
  process.exit(1);
}

const outputDirPath = args[1];

// Process information
const processId = process.pid;
const startTime = new Date().toISOString();

console.log(`🚀 Example Process started at ${startTime}`);
console.log(`📁 Process ID: ${processId}`);
console.log(`📊 Number of files to create: ${numberOfFiles}`);
console.log(`📝 Starting file creation process...`);

// Start file creation immediately
(async () => {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
      console.log(`📁 Created output directory: ${outputDirPath}`);
    }
    
    // Create files
    const createdFiles = [];
    for (let i = 1; i <= numberOfFiles; i++) {
      const fileName = `file-${i}-${Date.now()}.txt`;
      const filePath = path.join(outputDirPath, fileName);
      const content = `File ${i} created by Example Process
Process ID: ${processId}
Created at: ${new Date().toISOString()}
File number: ${i} of ${numberOfFiles}
Random data: ${Math.random().toString(36).substring(7)}
`;
      
      fs.writeFileSync(filePath, content);
      createdFiles.push(fileName);
      console.log(`✅ Created file: ${fileName}`);
      
      // 1 second delay between file creations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 File creation completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total files created: ${createdFiles.length}`);
    console.log(`   - Output directory: ${outputDirPath}`);
    console.log(`   - Process duration: ${Date.now() - new Date(startTime).getTime()}ms`);
    
    console.log(`\n✅ Process completed successfully. Exiting...`);
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error during file creation:`, error);
    process.exit(1);
  }
})();

// Handle process termination
process.on('SIGTERM', () => {
  console.log(`\n🛑 Received SIGTERM signal. Shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`\n🛑 Received SIGINT signal. Shutting down gracefully...`);
  process.exit(0);
});


