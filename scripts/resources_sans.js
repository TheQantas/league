//var HOST = location.origin.replace(/^http/, 'ws');
var ws = {};
ws.send = function() { return; };
ws.addEventListener = function() { return; };

// ws.onmessage = message => {
//   const response = JSON.parse(message.data);
//   console.log(response);
//   if (response.method == 'requested') {
//     console.log('c');
//   }
// }

function getPeriod(num) {
  if (num < 5) {
    return ordinal(num).toUpperCase();
  } else if (num == 5) {
    return 'OT';
  } else {
    return `${num - 4}OT`;
  }
}

function cleanObj(obj) {
  return obj.mascot.replace(/\s/g,'').toLowerCase();
}

function buildSVG(d,g,t,par,btn) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  var path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',d);
  svg.append(path);
  if (t) {
    var title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = t;
    svg.append(title);
  }
  if (g) {
    svg.classList.add(g);
  }
  if (btn) {
    svg.setAttribute('role','button');
  }
  svg.setAttribute('viewBox','0 0 24 24');
  par.append(svg);
  return svg;
}

function ordinal(num) {
  if (num % 10 == 1 && num % 100 != 11) {
    return `${num}st`;
  } else if (num % 10 == 2 && num % 100 != 12) {
    return `${num}nd`;
  } else if (num % 10 == 3 && num % 100 != 13) {
    return `${num}rd`;
  } else {
    return `${num}th`;
  }
}

function buildElem(tag,group,text,parent) {
  let elem = document.createElement(tag);
  if (group) {
    elem.classList.add(group);
  }
  if (text) {
    elem.textContent = text;
  }
  if (parent) {
    parent.append(elem);
  }
  return elem;
}

function getClassFromTeam(team) {
  if (team.abbr == 'CFC') {
    return 'cfc';
  } else if (team.abbr == 'NFC') {
    return 'nfc';
  }
  return team.mascot.toLowerCase().replace(/\s/g,'');
}

function getLogoFromTeam(team) {
  if (team.abbr == 'CFC') {
    return `logos/cfc.png`;
  }
  if (team.abbr == 'NFC') {
    return `logos/nfc.png`;
  }
  return `logos/${team.mascot.replace(/\s/g,'').toLowerCase()}.png`;
}

function getFormatRecord(w,l,t) {
  if (t == 0) {
    return `(${w}-${l})`;
  } else {
    return `(${w}-${l}-${t})`;
  }
}

function getTeamFromAbbr(str) {
  if (str == 'CFC') {
    return {mascot:'TBD',abbr:'CFC',url:'cfc'};
  } else if (str == 'NFC') {
    return {mascot:'TBD',abbr:'NFC',url:'nfc'};
  }
  for (let team of teams) {
    if (team.abbr == str.toUpperCase()) {
      return team;
    }
  }
}

function getRoundAndPick(num) {
  if (num % 40 == 0) {
    return {
      r: Math.floor(num / 40),
      p: 40
    }
  }
  return {
    r: Math.floor(num / 40) + 1,
    p: num % 40
  }
}

function splitTime(time) {
  var i = time.indexOf(':');
  var h = time.substring(0,i);
  var m = time.substring(i + 1,time.length - 1);
  var s = time.substring(time.length - 1,time.length);
  if (s == 'A') {
    var a = false;
  } else {
    var a = true;
  }
  var l = h;
  if (s == 'P' && h != 12) {
    var l = String(Number(h) + 12);
  } else if (Number(l) < 10) {
    l = `0${l}`;
  }
  return {
    h: h,
    m: m,
    s: s,
    a: a,
    l: l
  };
}

function getPseudoDay(day) {
  day = day.toUpperCase();
  switch (day) {
    case 'WED':
      return 0;
    case 'THU':
      return 1;
    case 'FRI':
      return 2;
    case 'SAT':
      return 3;
    case 'SUN':
      return 4;
    case 'MON':
      return 5;
  }
}

var decodeEntities = (function() {
  var element = document.createElement('div');
  function decodeHTMLEntities (str) {
    if(str && typeof str === 'string') {
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }
    return str;
  }
  return decodeHTMLEntities;
})();

function checkRandom(lim) {
  var bins = [0,0,0,0,0,0];
  var m = 5;
  var s = 2;
  for (let i = 0; i < lim; i++) {
    let rand = normalRandom(m,s);
    if (rand < m - 2 * s) {
      bins[0]++;
    } else if (rand < m - s) {
      bins[1]++;
    } else if (rand < m) {
      bins[2]++;
    } else if (rand <= m + s) {
      bins[3]++;
    } else if (rand <= m + 2 * s) {
      bins[4]++;
    } else {
      bins[5]++;
    }
  }
  return bins;
}

function normalRandom(n,l,h) {
  var m = n.m;
  var s = n.s;
  if (l == undefined) {
    l = m - 2 * s;
  }
  if (h == undefined) {
    h = m + 2 * s;
  }
  var u = 0, v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  var x = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) * s + m;
  if (x < l) {
    return l;
  } else if (x > h) {
    return h;
  } else {
    return x;
  }
}

function toMins(time) {
  var s = time % 60;
  var m = (time - s) / 60;
  if (s < 10) {
    s = `0${s}`;
  }
  return {s:s,m:m};
}

function calcQBRating(comp,att,yards,tdPasses,int) {
  if (att == 0) {
    return '0.0';
  }
	var a = ((comp / att) - 0.3) * 5;
	a = (a>2.375)?2.375:a;
	a = (a<0)?0:a;
	var b = ((yards / att) - 3) * .25;
	b = (b>2.375)?2.375:b;
	b = (b<0)?0:b;
	var c = (tdPasses / att) * 20;
	c = (c>2.375)?2.375:c;
	c = (c<0)?0:c;
	var d = 2.375 - ((int / att) * 25);
	d = (d>2.375)?2.375:d;
	d = (d<0)?0:d;
	var rating = (a + b + c + d) / 6 * 100;
  rating = Number(rating.toFixed(1));
  if (rating < 0) {
    return 0;
  } else if (rating > 158.3) {
    return 158.3
  }
	return rating.toFixed(1);
}

function calcOffRating(plays,td,pts,yds) {
  if (plays == 0) {
    return '0.0';
  }
  var l = 9.5 / 3;
	var a = td / plays * 50;
	a = (a>l)?l:a;
	a = (a<0)?0:a;
	var b = pts / plays * 6.25;
	b = (b>l)?l:b;
	b = (b<0)?0:b;
	var c = yds / plays - 3;
	c = (c>l)?l:c;
	c = (c<0)?0:c;
	var rating = (a + b + c) / 6 * 100;
  rating = Number(rating.toFixed(1));
  if (rating < 0) {
    return 0;
  } else if (rating > 158.3) {
    return 158.3
  }
	return rating.toFixed(1);
}

function calcDefRating(plays,sacks,int,td,yds,pts) {
  if (plays == 0) {
    return '0.0';
  }
	var a = sacks * 0.5;
	a = (a>1.9)?1.9:a;
	a = (a<0)?0:a;
	var b = int * 0.7;
	b = (b>1.9)?1.9:b;
	b = (b<0)?0:b;
	var c = 1.9 - (td - 2) / 4;
	c = (c>1.9)?1.9:c;
	c = (c<0)?0:c;
  var d = (yds - 250) * 0.01;
  d = (d>1.9)?1.9:d;
	d = (d<0)?0:d;
  var e = (pts - 250) * 0.01;
  e = (e>1.9)?1.9:e;
	e = (e<0)?0:e;
	var rating = (a + b + c + d + e) / 6 * 100;
  rating = Number(rating.toFixed(1));
  if (rating < 0) {
    return 0;
  } else if (rating > 158.3) {
    return 158.3
  }
	return rating.toFixed(1);
}

function getCurrentWeek() {
  var d = new Date();
  var m = d.getMonth();
  var t = d.getDate();
  if (m == 0) { //jan
    return 0;
  } else if (m == 1) { //feb
    if (t <= 23) {
      return 0;
    } else {
      return 1;
    }
  } else if (m == 2) { //mar
    if (t <= 2) {
      return 1;
    } else if (t <= 9) {
      return 2;
    } else if (t <= 16) {
      return 3;
    } else if (t <= 23) {
      return 4;
    } else if (t <= 30) {
      return 5;
    } else {
      return 6;
    }
  } else if (m == 3) { //apr
    if (t <= 6) {
      return 6;
    } else if (t <= 13) {
      return 7;
    } else if (t <= 20) {
      return 8;
    } else if (t <= 27) {
      return 9;
    } else {
      return 10;
    }
  } else if (m == 4) { //may
    if (t <= 3) {
      return 10;
    } else if (t <= 6) {
      return 11;
    } else if (t <= 10) {
      return 12;
    } else if (t <= 13) {
      return 13;
    } else {
      return 14;
    }
  }
  return 14;
}

function getCookie(cname) {
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}
