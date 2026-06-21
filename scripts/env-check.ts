import { spawn } from 'child_process';

const REQUIRED = [
  { cmd: 'node --version', label: 'Node.js >= 20', async check(out) { return parseInt(out.replace('v', '').split('.')[0]) >= 20; } },
  { cmd: 'pnpm --version', label: 'pnpm >= 9', async check(out) { return parseInt(out.split('.')[0]) >= 9; } },
  { cmd: 'psql --version', label: 'PostgreSQL client', async check() { return true; } },
];

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('lsof', ['-i', `:${port}`]);
    let hasOutput = false;
    proc.stdout.on('data', () => { hasOutput = true; });
    proc.on('close', (code) => {
      resolve(hasOutput || (code === 0));
    });
  });
}

async function main() {
  console.log('=== Haa Stores Core — Environment Check ===\n');
  let allPass = true;

  for (const req of REQUIRED) {
    try {
      const proc = spawn(req.cmd.split(' ')[0], req.cmd.split(' ').slice(1));
      const stdout = await new Promise<string>((resolve, reject) => {
        let out = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', (_code) => { resolve(out.trim()); });
        proc.on('error', reject);
      });
      const ok = await req.check(stdout);
      console.log(`${ok ? '✓' : '✗'} ${req.label}`);
      if (!ok) allPass = false;
    } catch {
      console.log(`✗ ${req.label} — not found`);
      allPass = false;
    }
  }

  console.log();
  const ports = [3000, 5173, 5174, 5432];
  for (const port of ports) {
    const listening = await checkPort(port);
    const label = port === 5432 ? 'PostgreSQL' : port === 3000 ? 'API' : port === 5173 ? 'Dashboard' : 'Storefront';
    console.log(`${listening ? '✓' : '○'} Port ${port} (${label})${listening ? '' : ' — not running'}`);
  }

  console.log();
  const storageDriver = process.env.STORAGE_DRIVER || 'local';
  console.log(`✓ STORAGE_DRIVER=${storageDriver}`);
  if (storageDriver === 's3') {
    const s3Vars = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];
    for (const v of s3Vars) {
      console.log(`${process.env[v] ? '✓' : '✗'} ${v}${process.env[v] ? '' : ' — required for S3'}`);
    }
  } else {
    console.log('○ S3 vars not required (STORAGE_DRIVER=local)');
  }

  console.log(`\n${allPass ? '✓ All checks passed' : '✗ Some checks failed'}`);
  process.exit(allPass ? 0 : 1);
}

main();
