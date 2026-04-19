const fs = require('fs');
const fp = 'frontend/login-student.html';
let txt = fs.readFileSync(fp, 'utf8');
const idx = txt.indexOf('</html>');
if (idx === -1) {
  console.error('NO END TAG');
  process.exit(1);
}
const trimmed = txt.slice(0, idx + '</html>'.length) + '\n';
fs.writeFileSync(fp, trimmed, 'utf8');
console.log('trimmed after first </html>, length', trimmed.length);
