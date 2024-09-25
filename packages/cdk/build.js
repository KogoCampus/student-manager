const esbuild = require('esbuild');
const chalk = require('chalk');

console.log('\x1b[34mBuilding the project...\x1b[0m');

esbuild
  .build({
    entryPoints: ['bin/student-manager.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'build/student-manager.js',
    external: ['aws-sdk'], // Exclude AWS SDK since it's available in the Lambda runtime
    sourcemap: true,
  })
  .then(() => {
    console.log('\x1b[34mBuild completed successfully.\x1b[0m');
  })
  .catch(() => {
    console.error('\x1b[31mBuild failed.\x1b[0m');
    process.exit(1);
  });
