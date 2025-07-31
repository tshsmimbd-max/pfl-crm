import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Auto-answer the prompts
child.stdin.write('+\n'); // Choose create column
child.stdin.write('y\n'); // Confirm
child.stdin.end();

child.on('exit', (code) => {
  process.exit(code);
});