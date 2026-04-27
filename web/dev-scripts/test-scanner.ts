import { scanContent } from '../lib/agents/tools/contentScanner';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  const result = await scanContent('scrolling instagram for an hour');
  console.log(result);
}

run();
