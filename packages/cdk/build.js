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
// Recursively scan for .ts files in subfolders
const scanLambdaHandlers = dir => {
  const handlers = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      handlers.push(...scanLambdaHandlers(filePath)); // Recursively add handlers from subdirectories
    } else if (file.endsWith('.ts')) {
      handlers.push(filePath);
    }
  });

  // Print out the handlers in green
  console.log(color('Found Lambda handlers:', blueText));
  handlers.forEach(handler => {
    console.log(color(`  ${handler}`, greenText));
  });

  return handlers;
};

// =================================================================
// Lambda Handlers
const lambdaDir = path.join(__dirname, 'src', 'lambda');
const lambdaHandlers = scanLambdaHandlers(lambdaDir);

// =================================================================
// Build Lambda Handlers
const buildLambdaHandlers = () => {
  const buildPromises = lambdaHandlers.map(handler => {
    const relativePath = path.relative(lambdaDir, handler);
    const handlerName = path.basename(handler, '.ts'); // e.g., emailVerification
    const subfolder = path.dirname(relativePath); // Preserve subfolder structure
    const outDir = path.join('dist', 'lambda', subfolder); // e.g., dist/lambda/api/emailVerification

    return esbuild
      .build({
        entryPoints: [handler],
        outdir: outDir,
        format: 'cjs',
        ...commonOptions,
      })
      .then(() => {
        console.log(color(`Lambda build complete for ${handlerName} (${outDir})`, blueText));
      })
      .catch(err => {
        console.error(color(`Build failed for ${handlerName}`, redText));
        console.error(err);
      });
  });

  return Promise.all(buildPromises);
};

// =================================================================
// Open API Docs Generation
const distDir = path.join(__dirname, 'dist');
const distOpenApi = path.join(distDir, 'openapi.yaml');

// Recursively scan for .yaml files in subfolders
const scanYamlFiles = dir => {
  const yamlFiles = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      yamlFiles.push(...scanYamlFiles(filePath)); // Recursively add YAML files from subdirectories
    } else if (file.endsWith('.yaml')) {
      yamlFiles.push(filePath);
    }
  });

  return yamlFiles;
};

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
        description: 'Delivered via AWS API Gateway',
      },
    ],
    paths: {},
  };

  const yamlFiles = scanYamlFiles(lambdaDir);
  yamlFiles.forEach(file => {
    const apiYamlContent = fs.readFileSync(file, 'utf8');
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

  const yamlFiles = scanYamlFiles(lambdaDir);
  yamlFiles.forEach(file => {
    const fileContent = fs.readFileSync(file, 'utf8');
    const fileDoc = YAML.parse(fileContent);

    // Merge SAM docs
    if (fileDoc.serverless && fileDoc.serverless.Resources) {
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

buildLambdaHandlers()
  .then(() => {
    console.log(color('All Lambda builds complete', blueText));
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
