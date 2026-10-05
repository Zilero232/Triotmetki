import fkill from 'fkill';
import { spawnSync } from 'node:child_process';

const DEV = {
  port: 1420,
  debugBinary: 'target/debug/otmetki-manager'
} as const;

const stopDebugBuild = () => {
  if (process.platform === 'win32') {
    const binary = DEV.debugBinary.replaceAll('/', '\\');
    const command = `Get-Process otmetki-manager -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*\\${binary}.exe' } | Stop-Process -Force`;

    spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'ignore' });

    return;
  }

  spawnSync('pkill', ['-f', DEV.debugBinary], { stdio: 'ignore' });
};

stopDebugBuild();

await fkill(`:${DEV.port}`, { force: true, silent: true });
