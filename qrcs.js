exports.getCodes = (abbr,num) => {
  if (num == 0) {
    return [];
  }
  if (typeof num != 'number') {
    num = 8;
  }
  let primes = [];
  let codes = [];
  while (codes.length < num) {
    let p = Math.floor(Math.random() * 1296);
    while (!isPrime(p) || p < 80) {
      p = Math.floor(Math.random() * 1296);
    }
    let q = Math.floor(Math.random() * 1296);
    while (!isPrime(q) || q < 80 || p == q) {
      q = Math.floor(Math.random() * 1296);
    }
    if (p * q > 46655 || primes.includes(p * q) || (p * q).toString(36).length != 3) {
      continue;
    }
    primes.push(p * q);
    if (p < q) {
      p = [q,q = p][0];
    }
    let r = hash(abbr,p,q);
    let a = Math.floor(Math.random() * 24) + 6;
    let c = Math.floor(Math.random() * 24) + 6;
    let b = Math.floor(Math.random() * Math.sqrt(4 * a * c));
    while (b + a*r > 1295 || b*r + c > 1295 || c*r > 1295) {
      a = Math.floor(Math.random() * 24) + 6;
      c = Math.floor(Math.random() * 24) + 6;
      b = Math.floor(Math.random() * Math.sqrt(4 * a * c));
    }
    let d = cd((b + a*r).toString(36));
    let e = cd((b*r + c).toString(36));
    let f = cd((c*r).toString(36));
    let str = a.toString(36) + d + e + f;
    let code = (p * q).toString(36);
    if (parseInt(code.charAt(0),36) % 2 == 0) {
      code += scramble(str,p);
    } else {
      code += scramble(str,q);
    }
    code = code.toUpperCase();
    if (code.length == 10) {
      let safe = true;
      for (let x of ['ABCD','1234','FUCK','SHIT','SH1T','PISS','P1SS','CRAP','DICK','D1CK','COCK','C0CK']) {
        if (code.indexOf(x) != -1) {
          safe = false;
          break;
        }
      }
      if (safe) {
        codes.push(code);
      }
    }
  }
  return codes;
}

exports.checkCode = (abbr,code) => {
  let primes = fact(parseInt(code.substring(0,3),36)).sort();
  if (parseInt(code.charAt(0),36) % 2 == 0) {
    var un = unscramble(code.substring(3,10),primes[1]);
  } else {
    var un = unscramble(code.substring(3,10),primes[0]);
  }
  var a = parseInt(un.charAt(0),36);
  var b = parseInt(un.substring(1,3),36);
  var c = parseInt(un.substring(3,5),36);
  var d = parseInt(un.substring(5,7),36);
  var x = -hash(abbr,primes[1],primes[0]);
  if (a * x ** 3 + b * x ** 2 + c * x + d == 0) {
    return true;
  }
  return false;
}

function cd(s) {
  if (s.length == 1) {
    return `0${s}`;
  }
  return s;
}

exports.scramble = (str,key) => {
  return scramble(str,key);
}

function scramble(str,key) {
  let p = 0;
  let s = '';
  for (let i = 0; i < str.length; i++) {
    p = (p + key) % str.length;
    s += str.charAt(p);
  }
  return s;
}

function unscramble(str,key) {
  let map = scramble('0123456',key);
  let ori = [];
  for (let i = 0, m = map[0]; i < str.length; i++, m = map[i]) {
    ori[m] = str[i];
  }
  return ori.toString().replaceAll(',','');
}

function hash(str,a,b) {
  var x = 1;
  for (let i = 0, c = str.charAt(0); i < str.length; i++, c = str.charAt(i)) {
    x *= (parseInt(c,36) ** (Math.abs(a - b) + i) % b);
  }
  return (x % 34) + 2;
}

function fact(num) {
  let b = 2;
  let ans = [];
  while (num > b){
    while (num % b == 0) {
      num /= b;
      ans.push(b);
    }
    b++;
    if (num == b){
      ans.push(b);
    }
  }
  return(ans);
}

exports.isPrime = num => {
  return isPrime(num);
}

function isPrime(num) {
  if (num % 2 == 0) {
    return false;
  }
  for (let i = 3, s = Math.sqrt(num); i <= s; i += 2) {
    if(num % i === 0) {
      return false; 
    }
  }
  return num > 1;
}