import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Auto-answer prompts - create new columns
child.stdin.write('+\n'); // Select create column
setTimeout(() => child.stdin.write('y\n'), 2000); // Confirm
setTimeout(() => child.stdin.end(), 3000);

child.on('exit', (code) => {
  console.log(`Database push completed with code: ${code}`);
  process.exit(code);
});