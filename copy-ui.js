import fs from 'fs';
import path from 'path';

const src = path.resolve('app/trattoria/webapp/index.html');
if (fs.existsSync(src)) {
  const targets = [
    'gen/srv/app/trattoria/webapp',
    'gen/srv/app/trattoria',
    'gen/srv/app/webapp',
    'gen/srv/app'
  ];

  for (const t of targets) {
    fs.mkdirSync(t, { recursive: true });
    fs.copyFileSync(src, path.join(t, 'index.html'));
  }
  console.log('[copy-ui] Successfully copied index.html to all runtime targets.');
} else {
  console.warn('[copy-ui] Source file not found:', src);
}
