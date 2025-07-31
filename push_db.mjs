import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push', '--force'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Auto-answer prompts
setTimeout(() => child.stdin.write('\n'), 1000);
setTimeout(() => child.stdin.write('y\n'), 2000);
setTimeout(() => child.stdin.end(), 3000);

child.on('exit', (code) => {
  console.log(`Database push completed with code: ${code}`);
  process.exit(code);
});