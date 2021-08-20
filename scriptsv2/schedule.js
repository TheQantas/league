ws.onmessage = message => {
  var response = JSON.parse(message.data);
  if (typeof response.spec == 'number') {
    byWeek[response.spec] = response.data;
  } else {
    byTeam[response.spec] = response.data;
  }
  renderGames(response.data);
}

window.onresize = () => {
  document.getElementById('sideGame').style.display = 'none';
}

window.addEventListener('dark',() => { 
  updateImage(document.getElementById('logoCont').children[0]);
}, false);

var byWeek = [];
var byTeam = {};

function changeMethod(elem) {
  document.getElementById('sideGame').style.display = 'none';
  elem.parentElement.children[Number(elem.value) + 1].style.display = 'block';
  elem.parentElement.children[(1 - Number(elem.value)) + 1].style.display = 'none';
  elem.parentElement.children[(1 - Number(elem.value)) + 1].selectedIndex = 0;
}

function getWeek(num) {
  document.getElementById('sideGame').style.display = 'none';
  if (num > 20 || num == 0) {
    document.getElementById('logoCont').style.display = 'flex';
    var src = 'images/';
    if (num == 0) {
      src += 'preseason';
    } else if (num == 21) {
      src += 'wildcard';
    } else if (num == 22) {
      src += 'divisional';
    } else if (num == 23) {
      src += 'conference';
    } else {
      src += 'championship';
    }
    if (getCookie('dark') == 'true') {
      src += '_dark';
    }
    src += '.png';
    document.getElementById('logoCont').children[0].src = src;
  } else {
    document.getElementById('logoCont').style.display = 'none';
  }
  if (byWeek[num]) {
    return renderGames(byWeek[num]);
  }
  ws.mail({method:'requestGames',type:'games',spec:Number(num)});
}

function getTeam(str) {
  document.getElementById('logoCont').style.display = 'none';
  document.getElementById('sideGame').style.display = 'none';
  if (byTeam[str]) {
    return renderGames(byTeam[str]);
  }
  ws.mail({method:'requestGames',type:'games',spec:str});
}

function renderGames(list) {
  var e = document.getElementById('gameCont');
  var l = e.children.length;
  for (let i = 1; i < l; i++) {
    e.children[1].remove();
  }
  for (let g of list) {
    let cont = buildElem('DIV','gameCell',undefined,document.getElementById('gameCont'));
    cont.addEventListener('click',function(){ showDetails(this); });
    cont.setAttribute('data-stats',g.stats);
    cont.setAttribute('data-away',g.awayMascot);
    cont.setAttribute('data-home',g.homeMascot);
    cont.setAttribute('data-awaysbq',g.awaySbq);
    cont.setAttribute('data-homesbq',g.homeSbq);
    cont.setAttribute('data-status',g.status);
    let d = new Date(g.schedule);
    let h,r;
    if (d.getHours() == 0) {
      h = 12;
      r = 'A';
    } else if (d.getHours() < 12) {
      h = d.getHours();
      r = 'A';
    } else if (d.getHours() == 12) {
      h = 12;
      r = 'P';
    } else {
      h = d.getHours() - 12;
      r = 'P';
    }
    let f = `${numToDay(d.getDay()).toUpperCase()} ${d.getDate()} ${numToMonth(d.getMonth()).toUpperCase()} ${h}${r}`;
    if (g.primetime) {
      cont.classList.add('primetime');
      f += ' - PRIMETIME';
    }
    buildElem('DIV','gameTop',f,cont);
    let bot = buildElem('DIV','gameBot',undefined,cont);
    buildElem('IMG',undefined,`logos/${g.awayTeam}_g.png`,buildElem('DIV','gameBotCell',undefined,bot));
    buildElem('DIV','gameBotCell',g.awayMascot.toUpperCase(),bot);
    let as,hs
    if (g.status == 'upcoming') {
      as = buildElem('DIV','gameBotCell','-',bot);
    } else {
      as = buildElem('DIV','gameBotCell',g.awayScore,bot);
    }
    buildElem('IMG',undefined,`logos/${g.homeTeam}_g.png`,buildElem('DIV','gameBotCell',undefined,bot));
    buildElem('DIV','gameBotCell',g.homeMascot.toUpperCase(),bot);
    if (g.status == 'upcoming') {
      hs = buildElem('DIV','gameBotCell','-',bot);
    } else {
      hs = buildElem('DIV','gameBotCell',g.homeScore,bot);
    }
    if (g.status.indexOf('FINAL') != -1) {
      if (g.awayScore > g.homeScore) {
        as.style.fontWeight = 'bold';
      } else if (g.awayScore < g.homeScore) {
        hs.style.fontWeight = 'bold';
      }
    }
  }
}

function showDetails(elem) {
  sideBox(elem,'sideGame');
  if (document.getElementById('sideGame').offsetWidth < 600) {
    document.getElementById('sideRight').style.display = 'none';
    document.getElementById('sideLeft').style.width = 'calc(100% - 40px)';
  } else {
    document.getElementById('sideRight').style.display = 'block';
    document.getElementById('sideLeft').style.width = 'calc(50% - 20px)';
  }
  var awaySbq = JSON.parse(elem.getAttribute('data-awaysbq'));
  var homeSbq = JSON.parse(elem.getAttribute('data-homesbq'));
  var table = document.getElementById('gameTable');
  table.innerHTML = '';
  var mainRow = table.insertRow();
  var awayRow = table.insertRow();
  var homeRow = table.insertRow();
  var mainText = ['Team'];
  var awayText = [elem.getAttribute('data-away')];
  var homeText = [elem.getAttribute('data-home')];
  var awayScore = 0;
  var homeScore = 0;
  for (let i = 0; i < awaySbq.length; i++) {
    if (elem.getAttribute('data-status') == 'upcoming') {
      awayText.push('-');
      homeText.push('-');
    } else {
      awayText.push(awaySbq[i]);
      homeText.push(homeSbq[i]);
      awayScore += awaySbq[i];
      homeScore += homeSbq[i];
    }
    mainText.push(getPeriod(i));
  }
  mainText.push('T');
  if (elem.getAttribute('data-status') != 'upcoming') {
    awayText.push(awayScore);
    homeText.push(homeScore);
  } else {
    awayText.push('-');
    homeText.push('-');
  }
  for (let i = 0; i < mainText.length; i++) {
    let mainCell = mainRow.insertCell();
    mainCell.textContent = mainText[i];
    let awayCell = awayRow.insertCell();
    awayCell.textContent = awayText[i];
    let homeCell = homeRow.insertCell();
    homeCell.textContent = homeText[i];
  }
  var stats = JSON.parse(elem.getAttribute('data-stats'));
  document.getElementsByClassName('sideNum')[0].textContent = stats.awayOff;
  document.getElementsByClassName('sideNum')[1].textContent = stats.homeOff;
  document.getElementsByClassName('sideNum')[2].textContent = stats.awayDef;
  document.getElementsByClassName('sideNum')[3].textContent = stats.homeDef;
  document.getElementsByClassName('sideNum')[4].textContent = stats.awayYpp;
  document.getElementsByClassName('sideNum')[5].textContent = stats.homeYpp;
  for (let a in stats) {
    stats[a] = Number(stats[a]);
  }
  if (stats.awayOff + stats.homeOff == 0) {
    var offPerc = 50;
  } else {
    var offPerc = stats.awayOff / (stats.awayOff + stats.homeOff) * 100;
  }
  if (stats.awayDef + stats.homeDef == 0) {
    var defPerc = 50;
  } else {
    var defPerc = stats.awayDef / (stats.awayDef + stats.homeDef) * 100;
  }
  if (stats.awayYpp + stats.homeYpp == 0) {
    var yppPerc = 50;
  } else {
    var yppPerc = stats.awayYpp / (stats.awayYpp + stats.homeYpp) * 100;
  }
  document.getElementsByClassName('sideBar')[0].style.width = `calc(${offPerc}% - 4px)`;
  document.getElementsByClassName('sideBar')[2].style.width = `calc(${defPerc}% - 4px)`;
  document.getElementsByClassName('sideBar')[4].style.width = `calc(${yppPerc}% - 4px)`;
  let awayClean = elem.getAttribute('data-away').toLowerCase().replace(/\s/g,'');
  let homeClean = elem.getAttribute('data-home').toLowerCase().replace(/\s/g,'');
  for (let i = 0; i < 6; i += 2) {
    document.getElementsByClassName('sideBar')[i].className = `sideBar ${awayClean}`;
  }
  for (let i = 1; i < 6; i += 2) {
    document.getElementsByClassName('sideBar')[i].className = `sideBar ${homeClean}`;
  }
}

function sideBox(elem,id) {
  var w = elem.offsetWidth;
  var s = document.getElementById(id);
  var horizLim = elem.parentElement.offsetWidth;
  if (horizLim <= w + 10) {
    var hoverWidth = w;
  } else {
    var hoverWidth = w * 2;
  }
  var hoverHeight = elem.offsetHeight;
  var leftMargin = elem.offsetLeft;
  var rightMargin = elem.parentElement.offsetWidth - elem.offsetLeft - elem.offsetWidth;
  var bottomMargin = elem.parentElement.offsetHeight - elem.offsetTop - elem.offsetHeight;
  if (rightMargin >= hoverWidth) { //put to right
    s.style.left = `${elem.offsetLeft + w}px`;
    s.style.top = `${elem.offsetTop}px`;
  } else if (leftMargin >= hoverWidth) { //put to left
    s.style.left = `${elem.offsetLeft - hoverWidth}px`;
    s.style.top = `${elem.offsetTop}px`;
  } else if (bottomMargin >= hoverHeight) { //put below
    if (leftMargin >= hoverWidth) {
      s.style.left = `${elem.offsetLeft}px`;
    } else {
      s.style.left = '0px';
    }
    s.style.top = `${elem.offsetTop + elem.offsetHeight}px`;
  } else { //put on top
    if (leftMargin >= hoverWidth) {
      s.style.left = `${elem.offsetLeft}px`;
    } else {
      s.style.left = '0px';
    }
    s.style.top = `${elem.offsetTop - elem.offsetHeight}px`;
  }
  s.style.width = `${hoverWidth}px`;
  s.style.height = `${hoverHeight}px`;
  s.style.display = 'block';
}