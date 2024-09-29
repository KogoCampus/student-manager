const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// ANSI escape codes for colors
const greenText = '\x1b[32m';
const blueText = '\x1b[34m';
const redText = '\x1b[31m';
const resetText = '\x1b[0m';
const color = (text, color) => `${color}${text}${resetText}`;

// =================================================================
// Build Options
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['aws-sdk'], // AWS SDK v2 is provided in the Lambda runtime, no need to bundle it
  sourcemap: true,
};

// =================================================================
// CDK Build Options (bin/student-manager.ts -> dist/cdk)
const cdkBuild = {
  entryPoints: ['bin/student-manager.ts'],
  outdir: 'dist/cdk',
  format: 'cjs',
  ...commonOptions,
};

// =================================================================
// Lambda Build Options (src/lambda -> dist/lambda)
const scanLambdaHandlers = dir => {
  const handlers = fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(dir, file));

  // Print out the handlers in green
  console.log(color('Found Lambda handlers:', greenText));
  handlers.forEach(handler => {
    console.log(color(`  ${handler}`, greenText));
  });

  return handlers;
};

const lambdaDir = path.join(__dirname, 'src', 'lambda');
const lambdaBuild = {
  entryPoints: scanLambdaHandlers(lambdaDir),
  outdir: 'dist/lambda',
  format: 'cjs',
  ...commonOptions,
};

// =================================================================
// Build Script
console.log(color('Building the project...', blueText));

// Step 1: Build Lambda handlers first
esbuild
  .build(lambdaBuild)
  .then(() => {
    console.log(color('Lambda build complete (dist/lambda)', blueText));
    return esbuild.build(cdkBuild);
  })
  .then(() => {
    console.log(color('CDK build complete (dist/cdk)', blueText));
  })
  .catch(err => {
    console.error(color('Build failed', redText));
    console.error(err);
    process.exit(1);
  });
