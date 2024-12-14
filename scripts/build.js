const esbuild = require('esbuild');

// ANSI escape codes for colors
const blueText = '\x1b[34m';
const redText = '\x1b[31m';
const resetText = '\x1b[0m';
const color = (text, color) => `${color}${text}${resetText}`;

// =================================================================
// Build Options
const buildOptions = {
  entryPoints: ['cdk/bin/student-manager.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'dist/cdk',
  sourcemap: true,
  external: ['aws-sdk'], // AWS SDK is provided in the Lambda runtime
};

// =================================================================
// Build Script
console.log(color('Building CDK app...', blueText));

esbuild
  .build(buildOptions)
  .then(() => {
    console.log(color('CDK build complete (dist/cdk)', blueText));
  })
  .catch(err => {
    console.error(color('Build failed', redText));
    console.error(err);
    process.exit(1);
  });
