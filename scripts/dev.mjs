import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
let closing = false;
function closeAll(signal = 'SIGTERM') {
  if (closing) return;
  closing = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
}
for (const child of children) {
  child.on('error', (error) => { console.error(error); closeAll(); process.exitCode = 1; });
  child.on('exit', (code) => { if (!closing) { closeAll(); process.exitCode = code ?? 1; } });
}
process.on('SIGINT', () => closeAll('SIGINT'));
process.on('SIGTERM', () => closeAll('SIGTERM'));
