const { execFileSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const devPorts = [5000, 5173, 5174];
// npm exposes the JavaScript CLI path while running package scripts. Launching
// that file through the current Node executable is reliable on Windows Node 24,
// where spawning npm.cmd directly can fail with EINVAL.
const npmCli = process.env.npm_execpath;
const npmCommand = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const children = [];
let shuttingDown = false;

function normalizePath(value) {
  return String(value || '').toLowerCase().replace(/\\/g, '/');
}

function findWindowsPortOwners(ports) {
  const output = execFileSync('netstat.exe', ['-ano'], { encoding: 'utf8' });
  const owners = [];

  for (const line of output.split(/\r?\n/)) {
    if (!/\bLISTENING\b/i.test(line)) continue;

    for (const port of ports) {
      if (!new RegExp(`:${port}\\s`).test(line)) continue;
      const match = line.match(/\bLISTENING\b\s+(\d+)\s*$/i);
      if (match) owners.push({ port, pid: Number(match[1]) });
    }
  }

  return owners;
}

function getWindowsCommandLine(pid) {
  try {
    return execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    return '';
  }
}

function getWindowsProcessName(pid) {
  try {
    const output = execFileSync('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/access denied|no tasks/i.test(output)) return '';
    const match = output.match(/^"([^"]+)"/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function isFleetOsDevProcess(commandLine, processName) {
  const normalizedCommand = normalizePath(commandLine);
  const normalizedRoot = normalizePath(root);
  const normalizedName = String(processName || '').toLowerCase();
  if (/access denied/i.test(normalizedCommand) || /access denied/i.test(normalizedName)) return true;
  if (!normalizedCommand && !normalizedName) return true;
  if (!normalizedCommand && ['node.exe', 'npm.exe', 'cmd.exe'].includes(normalizedName)) return true;
  return normalizedCommand.includes(normalizedRoot)
    && /\b(node|npm|nodemon|vite)\b/i.test(normalizedCommand);
}

function killWindowsProcessTree(pid) {
  try {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // The process may already have exited.
    }
  }
}

function clearStaleDevPorts() {
  if (process.platform !== 'win32') return;

  const ownersByPid = new Map();
  for (const owner of findWindowsPortOwners(devPorts)) {
    if (!ownersByPid.has(owner.pid)) ownersByPid.set(owner.pid, new Set());
    ownersByPid.get(owner.pid).add(owner.port);
  }

  for (const [pid, ports] of ownersByPid.entries()) {
    const portList = [...ports].join(', ');

    killWindowsProcessTree(pid);
    console.log(`Cleared old FleetOS dev process on port(s) ${portList} (PID ${pid}).`);
  }
}

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

clearStaleDevPorts();
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
