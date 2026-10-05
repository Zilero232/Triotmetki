import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const DEV = {
  port: 1420,
  viteMarker: 'vite',
  binary: 'otmetki-manager',
  targetDir: process.env.CARGO_TARGET_DIR ?? resolve(import.meta.dirname, '../tauri/target'),
  windowsScript: [
    'Get-Process $env:OTM_BINARY_NAME -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:OTM_BINARY_PATH } | Stop-Process -Force',
    'Get-NetTCPConnection -LocalPort $env:OTM_PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId=$_" } | Where-Object { $_.CommandLine -like "*$env:OTM_VITE*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
  ].join('; ')
} as const;

const debugBinary = resolve(DEV.targetDir, 'debug', process.platform === 'win32' ? `${DEV.binary}.exe` : DEV.binary);

const output = ([command, ...args]: [string, ...string[]]) => spawnSync(command, args, { encoding: 'utf8' }).stdout ?? '';

const stopOnWindows = () => {
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', DEV.windowsScript], {
    stdio: 'ignore',
    env: { ...process.env, OTM_BINARY_NAME: DEV.binary, OTM_BINARY_PATH: debugBinary, OTM_PORT: String(DEV.port), OTM_VITE: DEV.viteMarker }
  });
};

const stopOnUnix = () => {
  const pids = [...output(['pgrep', '-x', DEV.binary]).split('\n'), ...output(['lsof', '-t', `-iTCP:${DEV.port}`, '-sTCP:LISTEN']).split('\n')]
    .map(Number)
    .filter((pid) => pid > 0);

  for (const pid of new Set(pids)) {
    const command = output(['ps', '-o', 'command=', '-p', String(pid)]);

    if (command.startsWith(debugBinary) || command.includes(DEV.viteMarker)) {
      process.kill(pid, 'SIGKILL');
    }
  }
};

if (process.platform === 'win32') {
  stopOnWindows();
} else {
  stopOnUnix();
}
