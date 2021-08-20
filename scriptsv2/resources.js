var ws;

function startSocket() {
  var HOST = location.origin.replace(/^http/,'ws');
  ws = new WebSocket(HOST);
  ws.onclose = () => {
    setTimeout(startSocket,5000);
  }
  ws.mail = obj => { 
    if (typeof obj != 'object') {
      throw `Message is not object; is of type '${typeof obj}'`;
    }
    obj.token = getCookie('token');
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      if (obj.method != 'getDelegates' && obj.solo != true) {
        error('Message could not be sent');
      }
    } 
  }
}
startSocket();

function buildElem(tag,group,text,parent) {
  tag = tag.toLowerCase();
  var ns = false;
  if (tag == 'svg' || tag == 'path' || tag == 'title') {
    ns = true;
    var elem = document.createElementNS('http://www.w3.org/2000/svg',tag.toLowerCase());
    if (tag == 'svg' && text) {
      elem.setAttribute('viewBox',text);
    } else if (tag == 'path') {
      elem.setAttribute('d',text);
    } else {
      elem.textContent = text;
    }
  } else {
    var elem = document.createElement(tag);
  }
  if (group) {
    if (typeof group == 'string') {
      elem.classList.add(group);
    } else {
      for (let g of group) {
        elem.classList.add(g);
      }
    }
  }
  if (text != undefined && tag != 'img' && !ns) {
    elem.textContent = text;
  } else if (text && !ns) {
    elem.src = text;
  }
  if (parent) {
    parent.append(elem);
  }
  return elem;
}

function toggleDark() {
  document.body.classList.toggle('dark');
  if (getCookie('dark') == 'true') {
    document.cookie = 'dark=false';
  } else {
    document.cookie = 'dark=true';
  }
  window.dispatchEvent(new Event('dark'));
  if (document.getElementById('promptCont')) {
    document.getElementById('promptCont').style.display = 'none';
  }
}

function declineDark() {
  document.getElementById('promptCont').style.display = 'none';
  document.cookie = 'prompt=false;expires=Mon, 01 Jan 2024 00:00:00 UTC';
}

function error(mess) {
  let cont = document.getElementById('errorCont');
  cont.style.display = 'flex';
  cont.children[0].textContent = mess;
  setTimeout(function() { cont.style.display = 'none'; },3000);
}

function enableDark() {
  document.getElementById('promptCont').style.display = 'none';
  document.cookie = 'prompt=false;expires=Mon, 01 Jan 2024 00:00:00 UTC';
  if (!document.body.classList.contains('dark')) {
    error('To turn off dark mode, double click the logo in the header');
    toggleDark();
  }
}

function updateImage(elem) {
  if (elem.src.indexOf('_dark') != -1) {
    elem.src = elem.src.replace('_dark','');
  } else {
    elem.src = elem.src.replace('.png','_dark.png');
  }
}

function toPage(pc,bc,i,flex) {
  var pages = document.getElementsByClassName(pc);
  for (let page of pages) {
    page.style.display = 'none';
  }
  if (pages[i]) {
    if (flex === true) {
      pages[i].style.display = 'flex';
    } else if (flex) {
      pages[i].style.display = flex;
    } else {
      pages[i].style.display = 'block';
    }
  }
  if (bc) {
    var btns = document.getElementsByClassName(bc);
    for (let btn of btns) {
      btn.style.textDecoration = 'none';
    }
    if (btns[i]) {
      btns[i].style.textDecoration = 'underline';
    }
  }
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

function toggleNav() {
  var nav = document.getElementById('mobileNav');
  if (nav.style.display == 'block') {
    nav.style.display = 'none';
    document.body.style.overflow = '';
  } else {
    nav.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

function getAttrFromAbbr(attr,abbr) {
  if (abbr == 'LEA' || abbr == 'UFA') {
    return {mascot:'League',abbr:'LEA',clean:'league'}[attr];
  }
  for (let x of t) {
    if (x.abbr == abbr) {
      if (attr == 'clean') {
        return x.mascot.toLowerCase().replace(/\s/g,'');
      }
      return x[attr];
    }
  }
}

function ordinal(num) {
  if (num % 10 == 1 && num % 100 != 11) {
    return `${num}st`;
  } else if (num % 10 == 2 && num % 100 != 12) {
    return `${num}nd`;
  } else if (num % 10 == 3 && num % 100 != 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

function numToDay(num) {
  switch(num) {
    case 0:
      return 'Sun';
    case 1:
      return 'Mon';
    case 2:
      return 'Tue';
    case 3:
      return 'Wed';
    case 4:
      return 'Thu';
    case 5:
      return 'Fri';
    case 6:
      return 'Sat';
    default:
      return 'Www';
  }
}

function getPeriod(num) {
  if (num < 4) {
    return num + 1;
  } else if (num == 4) {
    return 'OT';
  } else {
    return `${num - 3}OT`;
  }
}

function numToMonth(num) {
  switch(num) {
    case 0:
      return 'Jan';
    case 1:
      return 'Feb';
    case 2:
      return 'Mar';
    case 3:
      return 'Apr';
    case 4:
      return 'May';
    case 5:
      return 'Jun';
    case 6:
      return 'Jul';
    case 7:
      return 'Aug';
    case 8:
      return 'Sep';
    case 9:
      return 'Oct';
    case 10:
      return 'Nov';
    case 11:
      return 'Dec';
    default:
      return 'Mmm';
  }
}

function getFormatHour(unix) {
  var d = new Date(unix);
  var r = 'A';
  var h = d.getHours();
  if (h > 12) {
    r = 'P';
  }
  if (h == 0) {
    h = 12;
  } else if (h > 12) {
    h -= 12;
  }
  var m = d.getMinutes();
  if (m < 10) {
    m = `0${m}`;
  }
  return `${h}:${m}${r}`;
}

function getFormatTime(unix,upper) {
  var d = new Date(unix);
  var s = `${numToDay(d.getDay())} ${d.getDate()} ${numToMonth(d.getMonth())} ${getFormatHour(unix)}`;
  if (upper) { s = s.toUpperCase() }
  return s;
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
	return rating.toFixed(1);
}

function calcOffRating(plays,td,pts,yds) {
  if (plays == 0) {
    return '0.0';
  }
	var a = (pts/plays - 0.05) * 12;
	a = (a>4.5)?4.5:a;
	a = (a<0)?0:a;
	var b = (yds/plays - 1) / 2;
	b = (b>2.5)?2.5:b;
	b = (b<0)?0:b;
	var c = td/plays * 50;
	c = (c>2.5)?2.5:c;
	c = (c<0)?0:c;
	var rating = (a + b + c) / 6 * 100;
	return rating.toFixed(1);
}

function calcDefRating(plays,sacks,int,td,yds,pts) {
  if (plays == 0) {
    return '0.0';
  }
	var a = sacks/plays * 32;
	a = (a>1.9)?1.9:a;
	a = (a<0)?0:a;
	var b = int/plays * 24;
	b = (b>1.9)?1.9:b;
	b = (b<0)?0:b;
	var c = (0.14 - td/plays) * 16;
	c = (c>1.9)?1.9:c;
	c = (c<0)?0:c;
  var d = (12 - yds/plays) * 0.24;
  d = (d>1.9)?1.9:d;
	d = (d<0)?0:d;
  var e = (1.2 - pts/plays) * 1.9;
  e = (e>1.9)?1.9:e;
	e = (e<0)?0:e;
	var rating = (a + b + c + d + e) / 6 * 100;
	return rating.toFixed(1);
}

var t = [];
t[0] = {abbr:'FLA',mascot:'Flamingos',division:'CFC North'};
t[1] = {abbr:'FOX',mascot:'Foxes',division:'CFC North'};
t[2] = {abbr:'NAT',mascot:'Nationals',division:'CFC North'};
t[3] = {abbr:'PEN',mascot:'Penguins',division:'CFC North'};
t[4] = {abbr:'GRE',mascot:'Greats',division:'CFC South'};
t[5] = {abbr:'PAN',mascot:'Pandas',division:'CFC South'};
t[6] = {abbr:'PIR',mascot:'Pirates',division:'CFC South'};
t[7] = {abbr:'SNA',mascot:'Snakes',division:'CFC Central'};
t[8] = {abbr:'DRA',mascot:'Dragons',division:'CFC Central'};
t[9] = {abbr:'PIO',mascot:'Pioneers',division:'CFC Central'};
t[10] = {abbr:'RED',mascot:'Red Pandas',division:'CFC Central'};
t[11] = {abbr:'ENG',mascot:'Engineers',division:'CFC North'};
t[12] = {abbr:'COU',mascot:'Cougars',division:'CFC East'};
t[13] = {abbr:'FAL',mascot:'Falcons',division:'CFC East'};
t[14] = {abbr:'GRI',mascot:'Grizzlies',division:'CFC East'};
t[15] = {abbr:'WAR',mascot:'Warriors',division:'CFC East'};
t[16] = {abbr:'AAR',mascot:'Aardvarks',division:'CFC West'};
t[17] = {abbr:'COO',mascot:'Coonhounds',division:'CFC West'};
t[18] = {abbr:'ROT',mascot:'Rottweilers',division:'CFC West'};
t[19] = {abbr:'SEN',mascot:'Senators',division:'CFC West'};
t[20] = {abbr:'BAD',mascot:'Badgers',division:'NFC North'};
t[21] = {abbr:'HUM',mascot:'Hummingbirds',division:'NFC North'};
t[22] = {abbr:'LON',mascot:'Longhorns',division:'NFC North'};
t[23] = {abbr:'WOL',mascot:'Wolves',division:'NFC North'};
t[24] = {abbr:'AVI',mascot:'Aviators',division:'NFC South'};
t[25] = {abbr:'CHA',mascot:'Chameleons',division:'NFC South'};
t[26] = {abbr:'EAG',mascot:'Eagles',division:'NFC South'};
t[27] = {abbr:'GAL',mascot:'Galaxy',division:'NFC South'};
t[28] = {abbr:'CHE',mascot:'Cheetahs',division:'NFC Central'};
t[29] = {abbr:'PEG',mascot:'Pegasi',division:'NFC Central'};
t[30] = {abbr:'STR',mascot:'Stars',division:'NFC Central'};
t[31] = {abbr:'ZEB',mascot:'Zebras',division:'NFC Central'};
t[32] = {abbr:'COL',mascot:'Collies',division:'NFC East'};
t[33] = {abbr:'HUS',mascot:'Huskies',division:'NFC East'};
t[34] = {abbr:'LYN',mascot:'Lynx',division:'NFC East'};
t[35] = {abbr:'STA',mascot:'Stallions',division:'NFC East'};
t[36] = {abbr:'GOL',mascot:'Goldens',division:'NFC West'};
t[37] = {abbr:'REB',mascot:'Rebels',division:'NFC West'};
t[38] = {abbr:'SHA',mascot:'Sharks',division:'NFC West'};
t[39] = {abbr:'SQU',mascot:'Squirrels',division:'NFC West'};