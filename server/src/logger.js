const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(dir, { recursive: true });
const write = (file, text) => fs.appendFileSync(path.join(dir, file), `[${new Date().toISOString()}] ${text}\n`);
module.exports = { info: (t) => write('app.log', t), error: (t) => write('error.log', t) };
