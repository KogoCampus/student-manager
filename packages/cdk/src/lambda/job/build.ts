import * as esbuild from 'esbuild';
import * as path from 'path';

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'handlePushNotificationMessage.ts')],
      bundle: true,
      outfile: path.join(__dirname, 'handlePushNotificationMessage.js'),
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      external: ['aws-sdk'],
      minify: false,
      sourcemap: true,
    });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
