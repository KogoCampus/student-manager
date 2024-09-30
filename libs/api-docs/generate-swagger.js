const fs = require('fs');
const path = require('path');
const swaggerUiDist = require('swagger-ui-dist');

const openapiSource = path.join(__dirname, '../../packages/cdk/dist/openapi.yaml'); // Modify if openapi.yaml is in a different location
const openapiDestination = path.join(__dirname, 'openapi.yaml');
const swaggerDistDir = path.join(__dirname, 'dist');

if (fs.existsSync(openapiSource)) {
  fs.copyFileSync(openapiSource, openapiDestination);
  console.log('openapi.yaml copied successfully');
} else {
  console.error('openapi.yaml not found!');
  process.exit(1);
}

// Generate Swagger UI
if (!fs.existsSync(swaggerDistDir)) {
  fs.mkdirSync(swaggerDistDir);
}

fs.copyFileSync(
  path.join(swaggerUiDist.getAbsoluteFSPath(), 'swagger-ui.css'),
  path.join(swaggerDistDir, 'swagger-ui.css')
);
fs.copyFileSync(
  path.join(swaggerUiDist.getAbsoluteFSPath(), 'swagger-ui-bundle.js'),
  path.join(swaggerDistDir, 'swagger-ui-bundle.js')
);
fs.copyFileSync(
  path.join(swaggerUiDist.getAbsoluteFSPath(), 'swagger-ui-standalone-preset.js'),
  path.join(swaggerDistDir, 'swagger-ui-standalone-preset.js')
);
fs.copyFileSync(path.join(swaggerUiDist.getAbsoluteFSPath(), 'index.html'), path.join(swaggerDistDir, 'index.html'));

// Modify index.html to point to the local openapi.yaml
const indexHtml = path.join(swaggerDistDir, 'index.html');
let indexHtmlContent = fs.readFileSync(indexHtml, 'utf-8');
indexHtmlContent = indexHtmlContent.replace('https://petstore.swagger.io/v2/swagger.json', './openapi.yaml');
fs.writeFileSync(indexHtml, indexHtmlContent);
console.log('Swagger UI generated successfully');
