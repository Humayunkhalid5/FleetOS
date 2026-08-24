const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
// npm exposes the JavaScript CLI path while running package scripts. Launching
// that file through the current Node executable is reliable on Windows Node 24,
// where spawning npm.cmd directly can fail with EINVAL.
const npmCli = process.env.npm_execpath;
const npmCommand = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const children = [];
let shuttingDown = false;

function run(prefix, cwd, args) {
  const childArgs = npmCli ? [npmCli, ...args] : args;
  const child = spawn(npmCommand, childArgs, { cwd, stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
  child.stdout.on('data', (chunk) => process.stdout.write(`[${prefix}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${prefix}] ${chunk}`));
  child.on('exit', (code) => {
    if (code && !shuttingDown) shutdown(code);
  });
  children.push(child);
}

function waitForApi(attempts = 240) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get('http://127.0.0.1:5000/api/health', (response) => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retry();
      });
      request.on('error', retry);
      request.setTimeout(1000, () => request.destroy());
    };
    const retry = () => {
      attempts -= 1;
      if (attempts <= 0) return reject(new Error('FleetOS API did not become ready within 4 minutes. Check MongoDB and the server output.'));
      setTimeout(check, 1000);
    };
    check();
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('api', path.join(root, 'server'), ['run', 'dev']);
waitForApi()
  .then(() => {
    run('portal', path.join(root, 'client'), ['run', 'dev']);
    run('admin', path.join(root, 'admin'), ['run', 'dev']);
  })
  .catch((error) => {
    console.error(error.message);
    shutdown(1);
  });
