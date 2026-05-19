const crypto = require('crypto');
const password = '1wq2w12q';
const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(hash);
