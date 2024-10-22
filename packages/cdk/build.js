const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

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
  sourcemap: false,
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
  console.log(color('    Found Lambda handlers:', greenText));
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
// Open API Docs Generation
const distDir = path.join(__dirname, 'dist');
const distOpenApi = path.join(distDir, 'openapi.yaml');

const assembleOpenApiDocs = () => {
  const openApiTemplate = {
    openapi: '3.0.0',
    info: {
      title: 'Student Manager API',
      description: 'API for handling student accounts. i.e email verification, registration, etc',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'https://api.staging.kogocampus.com',
        description: 'Delievered via AWS API Gateway',
      },
    ],
    paths: {},
  };

  // Merge all the path definitions into the main OpenAPI object
  const apiFiles = fs.readdirSync(lambdaDir).filter(file => file.endsWith('.yaml'));
  apiFiles.forEach(file => {
    const filePath = path.join(lambdaDir, file);
    const apiYamlContent = fs.readFileSync(filePath, 'utf8');
    const apiDoc = YAML.parse(apiYamlContent);
    // Merge OpenAPI docs
    if (apiDoc.openapi && apiDoc.openapi.paths) {
      Object.assign(openApiTemplate.paths, apiDoc.openapi.paths);
      console.log(color(`  Merged ${file}`, greenText));
    }
  });

  // Write the merged OpenAPI specification to dist/openapi.yaml
  const openApiYaml = YAML.stringify(openApiTemplate);
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(distOpenApi, openApiYaml);
  console.log(color('OpenAPI documentation assembled (dist/openapi.yaml)', blueText));
};

// =================================================================
// Serverless Application Model (SAM) Template Generation
const distSam = path.join(distDir, 'serverless.yaml');
const commonSamTemplatePath = path.join(__dirname, 'serverless.yaml');

const assembleSamTemplate = () => {
  const commonSamTemplate = YAML.parse(fs.readFileSync(commonSamTemplatePath, 'utf8'));

  const apiFiles = fs.readdirSync(lambdaDir).filter(file => file.endsWith('.yaml'));
  apiFiles.forEach(file => {
    const filePath = path.join(lambdaDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileDoc = YAML.parse(fileContent);

    // Merge SAM docs
    if (fileDoc.serverless && fileDoc.serverless.Resources) {
      // Here we are merging only the 'Resources' part of the file
      Object.assign(commonSamTemplate.Resources, fileDoc.serverless.Resources);
      console.log(color(`  Merged ${file} into SAM template`, greenText));
    }
  });

  // Write the merged SAM template to dist/serverless.yaml
  const samYaml = YAML.stringify(commonSamTemplate);
  fs.writeFileSync(distSam, samYaml);
  console.log(color('SAM template assembled (dist/serverless.yaml)', blueText));
};

// =================================================================
// Build Script
console.log(color('Building the project...', blueText));

esbuild
  .build(lambdaBuild)
  .then(() => {
    console.log(color('Lambda build complete (dist/lambda)', blueText));
    return esbuild.build(cdkBuild);
  })
  .then(() => {
    console.log(color('CDK build complete (dist/cdk)', blueText));
  })
  .then(() => {
    console.log(color('Assembling OpenAPI documentation...', blueText));
    assembleOpenApiDocs();
  })
  .then(() => {
    console.log(color('Assembling SAM template...', blueText));
    assembleSamTemplate();
  })
  .catch(err => {
    console.error(color('Build failed', redText));
    console.error(err);
    process.exit(1);
  });
