//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromIndex } = require("../clubs");

function reqUpdates() {
  showBox();
  if (!started) {
    ws.send(JSON.stringify({method:'connectToUpdates'}));
  }
}

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'init') {
    initUpdateBox(response);
  } else if (response.method == 'startClock') {
    startClock(response);
  } else if (response.method == 'stopClock') {
    stopClock();
  } else if (response.method == 'updateScore') {
    updateScore(response);
  } else if (response.method == 'statUpdate') {
    updatePlayerStats(response);
    updateStats(response);
  } else if (response.method == 'updateDown') {
    updateDown(response);
  } else if (response.method == 'updatePoss') {
    updatePoss(response);
  } else if (response.method == 'newEvent') {
    renderUpdate(response);
  } else if (response.method == 'declareFinal') {
    if (response.q < 5) {
      document.getElementById('updateTime').textContent = 'FINAL';
    } else {
      document.getElementById('updateTime').textContent = `FINAL-${getPeriod(response.q)}`;
    }
  } else if (response.method == 'eor') {
    document.getElementById('updateTime').textContent = 'END OF REG';
  } else if (response.method == 'newGame') {
    if (document.getElementById('updateCont').style.display == 'flex') {
      document.cookie = 'update=true';
      setTimeout(() => {
        location.reload();
        return false;
      },1000);
    }
  }
}

var clock = 900;
var clockInt = false;
var period = 1;
var awayAbbr;
var homeAbbr;
var started = false;
var goalToGo = false;

function showBox() {
  document.getElementById('updateCont').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideBox() {
  document.getElementById('updateCont').style.display = 'none';
  document.body.style.overflow = 'auto';
}

function initUpdateBox(msg) {
  started = true;
  awayAbbr = msg.away;
  homeAbbr = msg.home;
  period = msg.q;
  //console.log(msg,msg.away);
  var awayTeam = getTeamFromAbbr(msg.away);
  var homeTeam = getTeamFromAbbr(msg.home);
  var top = document.getElementById('updateTop');
  top.children[0].src = `logos/${cleanObj(awayTeam)}.png`;
  top.children[4].src = `logos/${cleanObj(homeTeam)}.png`;
  var table = document.getElementById('updateTable');
  table.innerHTML = '';
  let row = table.insertRow();
  row.insertCell();
  for (let i = 0; i < msg.awaySbq.length; i++) {
    let cell = row.insertCell();
    if (i < 4) {
      cell.textContent = i + 1;
    } else {
      cell.textContent = getPeriod(i + 1);
    }
  }
  let cell = row.insertCell();
  cell.textContent = 'T';
  let sbqs = [msg.awaySbq,msg.homeSbq];
  let scores = [msg.awayScore,msg.homeScore];
  var mascots = [awayTeam.mascot,homeTeam.mascot];
  for (let i = 0, sbq = sbqs[0]; i < 2; i++, sbq = sbqs[i]) {
    let row = table.insertRow();
    let firstCell = row.insertCell();
    firstCell.textContent = mascots[i];
    for (let j = 0; j < sbq.length; j++) {
      let cell = row.insertCell();
      if (j < msg.q) {
        cell.textContent = sbq[j];
      } else {
        cell.textContent = '-';
      }
    }
    let finalCell = row.insertCell();
    finalCell.textContent = scores[i];
  }
  for (let u of msg.updates) {
    u.sort = u.time + u.q * 900;
  }
  msg.updates.sort(function(a,b) {
    return b.sort - a.sort;
  });
  for (let u of msg.updates) {
    renderUpdate(u);
  }
  updatePoss({poss:msg.poss});
  startClock(msg);
  updatePlayerStats(msg);
  updateStats(msg);
  updateDown(msg);
  updateScore(msg);
}

function renderUpdate(obj) {
  var row = document.createElement('DIV');
  row.classList.add('eventRow');
  document.getElementsByClassName('updatePage')[0].prepend(row);
  var left = buildElem('DIV','eventLeft',undefined,row);
  var logo = buildElem('IMG','eventLogo',undefined,left);
  if (obj.team == 'away') {
    logo.src = `logos/${cleanObj(getTeamFromAbbr(awayAbbr))}.png`;
  } else {
    logo.src = `logos/${cleanObj(getTeamFromAbbr(homeAbbr))}.png`;
  }
  var right = buildElem('DIV','eventRight',undefined,row);
  if (obj.q < 5) {
    buildElem('SPAN','eventTime',decodeEntities(`${getPeriod(obj.q)} &middot; ${toMins(obj.t).m}:${toMins(obj.t).s}`),right);
  } else {
    buildElem('SPAN','eventTime',getPeriod(obj.q),right);
  }
  buildElem('BR',undefined,undefined,right);
  buildElem('SPAN','eventText',obj.text,right);
}

function updateStats(msg) {
  var as = msg.awayStats;
  var hs = msg.homeStats;
  as.offRating = calcOffRating(as.off.plays,as.off.td,as.off.pts,as.off.yds);
  as.defRating = calcDefRating(as.def.playsDef,as.def.sacks,as.def.int,as.def.tdGiven,as.def.ydsGiven,as.def.ptsGiven);
  hs.offRating = calcOffRating(hs.off.plays,hs.off.td,hs.off.pts,hs.off.yds);
  hs.defRating = calcDefRating(hs.def.playsDef,hs.def.sacks,hs.def.int,hs.def.tdGiven,hs.def.ydsGiven,as.def.ptsGiven);
  if (as.off.plays != 0) {
    as.off.ypp = (as.off.yds / as.off.plays).toFixed(1);
  } else {
    as.off.ypp = '0.0';
  }
  if (hs.off.plays != 0) {
    hs.off.ypp = (hs.off.yds / hs.off.plays).toFixed(1);
  } else {
    hs.off.ypp = '0.0';
  }
  var teamStats = ['offRating','defRating','yds','passYds','rushYds','ypp','first','sacks','int'];
  var heads = document.getElementsByClassName('updateStatHeader');
  for (let i = 0, head = heads[0]; i < heads.length; i++, head = heads[i]) {
    if (i < 2) {
      head.children[0].textContent = as[teamStats[i]];
      head.children[2].textContent = hs[teamStats[i]];
      var a = Number(as[teamStats[i]]);
      var h = Number(hs[teamStats[i]]);
    } else if (i < 7) {
      head.children[0].textContent = as.off[teamStats[i]];
      head.children[2].textContent = hs.off[teamStats[i]];
      var a = Number(as.off[teamStats[i]]);
      var h = Number(hs.off[teamStats[i]]);
    } else {
      head.children[0].textContent = as.def[teamStats[i]];
      head.children[2].textContent = hs.def[teamStats[i]];
      var a = Number(as.def[teamStats[i]]);
      var h = Number(hs.def[teamStats[i]]);
    }
    if (a + h != 0) {
      var perc = a / (a + h);
      head.nextElementSibling.children[0].style.width = `calc(${perc * 100}% - 3px)`;
    } else {
      head.nextElementSibling.children[0].style.width = 'calc(50% - 3px)';
    }
  }
  for (let box of document.getElementsByClassName('updateStatBox')) {
    box.children[0].className = '';
    box.children[0].classList.add('updateStatBar',cleanObj(getTeamFromAbbr(msg.away)));
    box.children[1].className = '';
    box.children[1].classList.add('updateStatBar',cleanObj(getTeamFromAbbr(msg.home)));
  }
}

function updatePoss(obj) {
  //console.log('curr off',obj.poss);
  var conts = document.getElementsByClassName('updateBallCont');
  goalToGo = false;
  if (obj.poss == 'away') {
    conts[0].children[0].style.display = 'block';
    conts[1].children[0].style.display = 'none';
  } else {
    conts[1].children[0].style.display = 'block';
    conts[0].children[0].style.display = 'none';
  }
}

function updateScore(obj) {
  var top = document.getElementById('updateTop');
  top.children[1].textContent = obj.awayScore;
  top.children[3].textContent = obj.homeScore;
  var table = document.getElementById('updateTable');
  var awayRow = table.rows[1];
  //console.log(awayRow.cells[awayRow.cells.length - 1],obj.awayScore);
  awayRow.cells[awayRow.cells.length - 1].textContent = obj.awayScore;
  //console.log(awayRow.cells[awayRow.cells.length - 1].textContent);
  for (let i = 1; i < awayRow.cells.length; i++) {
    if (i <= obj.q) {
      awayRow.cells[i].textContent = obj.awaySbq[i - 1];
    }
  }
  var homeRow = table.rows[2];
  for (let i = 1; i < homeRow.cells.length; i++) {
    if (i <= obj.q) {
      homeRow.cells[i].textContent = obj.homeSbq[i - 1];
    }
  }
  homeRow.cells[homeRow.cells.length - 1].textContent = obj.homeScore;
}

function startClock(obj) {
  var top = document.getElementById('updateTime');
  if (obj.q != period) {
    var table = document.getElementById('updateTable');
    if (obj.q > 4) {
      let top = table.rows[0].insertCell(obj.q);
      top.textContent = getPeriod(obj.q);
      let a = table.rows[1].insertCell(obj.q);
      a.textContent = 0;
      let h = table.rows[2].insertCell(obj.q);
      h.textContent = 0;
    }
    table.rows[1].cells[obj.q].textContent = 0;
    table.rows[2].cells[obj.q].textContent = 0;
  }
  if (obj.q > 4) {
    top.textContent = getPeriod(obj.q);
    return;
  }
  if (obj.t <= 0) {
    return;
  }
  if (clockInt == false) {
    clock = obj.t;
    period = obj.q;
    top.textContent = decodeEntities(`${getPeriod(obj.q)} &middot; ${toMins(obj.t).m}:${toMins(obj.t).s}`);
    clockInt = setInterval(() => {
      clock--;
      top.textContent = decodeEntities(`${getPeriod(obj.q)} &middot; ${toMins(clock).m}:${toMins(clock).s}`);
      if (clock <= 0) {
        stopClock();
        top.textContent = decodeEntities(`END ${getPeriod(obj.q)}`);
      }
    },1000);
  }
}

function stopClock() {
  clearInterval(clockInt);
  clockInt = false;
}

function updatePlayerStats(obj) {
  var groups = [];
  groups[0] = [obj.awayPlayers.qb,obj.homePlayers.qb];
  for (let p of groups[0]) {
    p.txt0 = `${p.stats.comp}/${p.stats.att}`;
    p.txt1 = p.stats.yds;
    p.txt2 = `${p.stats.td}/${p.stats.int}`;
    p.txt3 = calcQBRating(p.stats.comp,p.stats.att,p.stats.yds,p.stats.td,p.stats.int);
  }
  groups[1] = [obj.awayPlayers.rb,obj.homePlayers.rb];
  for (let p of groups[1]) {
    p.txt0 = p.stats.yds;
    p.txt1 = p.stats.att;
    if (p.stats.att != 0) {
      p.txt2 = (p.stats.yds / p.stats.att).toFixed(1);
    } else {
      p.txt2 = '0.0';
    }
    p.txt3 = p.stats.td;
  }
  groups[2] = [obj.awayPlayers.wr,obj.awayPlayers.te,obj.homePlayers.wr,obj.homePlayers.te];
  for (let p of groups[2]) {
    p.txt0 = p.stats.yds;
    p.txt1 = p.stats.receps;
    if (p.stats.receps != 0) {
      p.txt2 = (p.stats.yds / p.stats.receps).toFixed(1);
    } else {
      p.txt2 = '0.0';
    }
    p.txt3 = p.stats.td;
  }
  groups[3] = [obj.awayPlayers.de,obj.awayPlayers.lb,obj.homePlayers.de,obj.homePlayers.lb];
  for (let p of groups[3]) {
    p.txt0 = p.stats.tackles;
    p.txt1 = p.stats.tAtt;
    p.txt2 = p.stats.sack;
    p.txt3 = p.stats.blitz;
  }
  groups[4] = [obj.awayPlayers.cb,obj.awayPlayers.s,obj.homePlayers.cb,obj.homePlayers.s];
  for (let p of groups[4]) {
    p.txt0 = p.stats.tackles;
    p.txt1 = p.stats.tAtt;
    p.txt2 = p.stats.int;
    p.txt3 = p.stats.targets;
  }
  groups[5] = [obj.awayPlayers.k,obj.homePlayers.k];
  for (let p of groups[5]) {
    p.txt0 = `${p.stats.under40}/${p.stats.under40Att}`;
    p.txt1 = `${p.stats.over40}/${p.stats.over40Att}`;
    p.txt2 = `${p.stats.pat}/${p.stats.patAtt}`;
    p.txt3 = p.stats.pts;
  }
  groups[6] = [obj.awayPlayers.p,obj.homePlayers.p];
  for (let p of groups[6]) {
    if (p.stats.punts != 0) {
      p.txt0 = (p.stats.yds / p.stats.punts).toFixed(1);
      p.txt1 = (p.stats.net / p.stats.punts).toFixed(1);
    } else {
      p.txt0 = '0.0';
      p.txt1 = '0.0';
    }
    p.txt2 = p.stats.in20;
    p.txt3 = p.stats.blocked;
  }
  var tables = document.getElementsByClassName('updatePositionTable');
  for (let i = 0, t = tables[0], g = groups[0]; i < tables.length; i++, t = tables[i], g = groups[i]) {
    while (t.rows.length > 1) {
      t.deleteRow(1);
    }
    for (let j = 0, p = g[0]; j < g.length; j++, p = g[j]) {
      let newRow = t.insertRow();
      let newFirst = newRow.insertCell();
      let newLogo = buildElem('IMG',undefined,undefined,newFirst);
      let team = teams[p.team];
      newLogo.src = `logos/${cleanObj(team)}.png`;
      let newSecond = newRow.insertCell();
      newSecond.textContent = `${p.fName} ${p.lName}`;
      for (let k = 0; k < 4; k++) {
        let newCell = newRow.insertCell();
        newCell.textContent = p[`txt${k}`];
      }
    }
  }
}

function updatePage(num) {
  var pages = document.getElementsByClassName('updatePage');
  var btns = document.getElementsByClassName('updateTab');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function updateDown(obj) {
  if (obj.down > 4) {
    return;
  }
  if (obj.down == 1 && obj.los >= 90) {
    goalToGo = true;
  }
  if (obj.los == 50) {
    var los = 50;
  } else if (obj.poss == 'away' && obj.los < 50) {
    var los = `${awayAbbr} ${obj.los}`
  } else if (obj.poss == 'home' && obj.los < 50) {
    var los = `${homeAbbr} ${obj.los}`
  } else if (obj.poss == 'away' && obj.los > 50) {
    var los = `${homeAbbr} ${100 - obj.los}`
  } else if (obj.poss == 'home' && obj.los > 50) {
    var los = `${awayAbbr} ${100 - obj.los}`
  }
  if (goalToGo) {
    document.getElementById('updateDown').textContent = `${ordinal(obj.down).toUpperCase()} & GOAL AT ${los}`;
  } else {
    document.getElementById('updateDown').textContent = `${ordinal(obj.down).toUpperCase()} & ${obj.toGo} AT ${los}`;
  }
}