const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { glob } = require('glob');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

// ANSI color codes for prettier console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

const log = {
  info: msg => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}${msg}${colors.reset}`),
};

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('docs', {
    type: 'string',
    description: 'Directory containing OpenAPI documentation YAML files',
    default: 'cdk/src/docs',
  })
  .option('output', {
    type: 'string',
    description: 'Output directory for the assembled OpenAPI documentation',
    default: 'swagger',
  })
  .example([
    ['$0', 'Use default paths'],
    ['$0 --docs=api/docs --output=public/swagger', 'Custom input and output paths'],
  ])
  .help().argv;

async function assembleOpenApiDocs() {
  log.info('Assembling OpenAPI documentation...');

  const openApiTemplate = {
    openapi: '3.0.0',
    info: {
      title: 'Student Manager API',
      description: 'API for managing student accounts and related operations',
      version: process.env.npm_package_version || '1.0.0',
    },
    servers: [
      {
        url: 'https://api.staging.kogocampus.com',
        description: 'Staging environment',
      },
    ],
    paths: {},
  };

  const apiFiles = glob.sync(path.join(argv.docs, '*.yaml'));

  if (apiFiles.length === 0) {
    log.error(`No YAML files found in ${argv.docs}`);
    process.exit(1);
  }

  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const doc = YAML.parse(content);

      if (doc.paths) {
        Object.assign(openApiTemplate.paths, doc.paths);
        log.success(`Merged ${path.basename(file)}`);
      }
    } catch (error) {
      log.error(`Failed to process ${file}: ${error.message}`);
    }
  }

  // Ensure output directory exists
  const outputDir = argv.output;
  fs.mkdirSync(outputDir, { recursive: true });

  // Write assembled OpenAPI spec
  const openApiPath = path.join(outputDir, 'openapi.yaml');
  fs.writeFileSync(openApiPath, YAML.stringify(openApiTemplate));
  log.success(`OpenAPI documentation written to ${openApiPath}`);
}

assembleOpenApiDocs().catch(error => {
  log.error(`Failed to assemble OpenAPI documentation: ${error.message}`);
  process.exit(1);
});
