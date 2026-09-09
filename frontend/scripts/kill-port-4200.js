const { execSync } = require('child_process');

const PORT = 4200;

function findListeningPids() {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (
        parts.length >= 5 &&
        parts[0] === 'TCP' &&
        parts[1] &&
        parts[1].endsWith(':' + PORT) &&
        parts[3] === 'LISTENING'
      ) {
        pids.add(parts[4]);
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

const pids = findListeningPids();
if (pids.length === 0) {
  console.log(`Puerto ${PORT} libre.`);
} else {
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      console.log(`Puerto ${PORT} liberado (PID ${pid} terminado).`);
    } catch {
      console.log(`No se pudo terminar el proceso PID ${pid}.`);
    }
  }
}