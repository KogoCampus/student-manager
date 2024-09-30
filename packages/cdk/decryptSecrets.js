const fs = require('fs');
const path = require('path');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const yargs = require('yargs');

// Initialize yargs to accept named arguments
const argv = yargs
  .option('directories', {
    alias: 'd',
    type: 'array',
    description: 'List of directories to scan for JSON files',
    demandOption: true,
  })
  .option('region', {
    alias: 'r',
    type: 'string',
    description: 'AWS region for Secrets Manager',
    demandOption: true,
  })
  .option('secret-name', {
    alias: 's',
    type: 'string',
    description: 'Secret name in Secrets Manager (e.g., /stg/student-manager/secrets/)',
    demandOption: true,
  })
  .help()
  .alias('help', 'h').argv;

// Initialize the Secrets Manager client
const client = new SecretsManagerClient({ region: argv.region });

// Function to fetch the secret with key-value pairs from AWS Secrets Manager
async function fetchSecrets(secretName) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const secretValueResponse = await client.send(command);

    // Parse the SecretString as JSON to extract key-value pairs
    const secrets = JSON.parse(secretValueResponse.SecretString);
    return secrets;
  } catch (error) {
    console.error(`Failed to fetch secret ${secretName}:`, error);
    throw new Error(`Halt: Failed to fetch secret ${secretName}`);
  }
}

// Function to recursively map secrets to the JSON object
function mapSecretsToJSON(obj, secrets) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recurse into nested objects
      mapSecretsToJSON(obj[key], secrets);
    } else if (typeof obj[key] === 'string' && obj[key].startsWith('secret:')) {
      // Map the secret value to the placeholder
      const secretKey = obj[key].replace('secret:', '');
      if (secrets[secretKey]) {
        obj[key] = secrets[secretKey];
      } else {
        console.error(`Secret for key ${secretKey} not found`);
        throw new Error(`Halt: Secret for key ${secretKey} not found`);
      }
    }
  }
}

// Function to process a single .json file and create a .decrypted.json file
async function decryptEnvFile(filePath, secrets) {
  const decryptedFilePath = filePath.replace('.json', '.decrypted.json');

  // Read the .json file
  let envFile;
  try {
    envFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    throw new Error(`Halt: Failed to parse JSON file ${filePath}`);
  }

  // Map the secrets to the JSON object
  mapSecretsToJSON(envFile, secrets);

  // Write the decrypted file as .decrypted.json
  fs.writeFileSync(decryptedFilePath, JSON.stringify(envFile, null, 2));
  console.log(`Decrypted ${filePath} written to ${decryptedFilePath}`);
}

// Function to scan directories and decrypt .json files
async function decryptSecretsInDirectories(directories, secrets) {
  for (const dir of directories) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('.decrypted')) {
        const filePath = path.join(dir, file);
        await decryptEnvFile(filePath, secrets);
      }
    }
  }
}

// Run the decryption process
fetchSecrets(argv['secret-name'])
  .then(secrets => decryptSecretsInDirectories(argv.directories, secrets))
  .then(() => console.log('Decryption process completed'))
  .catch(err => {
    console.error('Decryption process halted:', err);
    process.exit(1); // Exit the process with a failure status
  });
