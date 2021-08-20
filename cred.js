const crypto = require('crypto');
const QRCS = require('./qrcs.js');

exports.sql = () => {
  return {p:'5$nm12@kbV9)',d:'fantasy'};
}

exports.key = () => {return '38571967'; }

exports.encrypt = (text,key) => {
  key = crypto.createHash('sha256').update(key).digest('hex');
  let iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

exports.decrypt = (text,key) => {
  key = crypto.createHash('sha256').update(key).digest('hex');
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

exports.getCode = mascot => {
  let hash = crypto.createHash('sha256').update(mascot).digest('hex');
  let p = parseInt(hash.substring(0,2),16);
  while (!QRCS.isPrime(p)) {
    p++;
  }
  let int = parseInt(QRCS.scramble(hash,p).substring(0,5),16);
  int = (int>1e7)?int-1e7:int;
  let code = String(parseInt(hash,16) % int);
  while (code.length < 6) {
    code = `0${code}`;
  }
  return code;
}