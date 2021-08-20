ws.onmessage = message => {
  var response = JSON.parse(message.data);
  if (response.type == 'score') {
    localGame[`${response.team}Score`] += response.pts;
    document.getElementById('centerTop').textContent = `${localGame.awayScore} - ${localGame.homeScore}`;
    if (response.team == 'away') {
      document.getElementsByClassName('updateScore')[0].textContent = localGame.awayScore;
    } else {
      document.getElementsByClassName('updateScore')[1].textContent = localGame.homeScore;
    }
    if (document.getElementById('gamesAwayScore')) {
      document.getElementById('gamesAwayScore').textContent = localGame.awayScore;
      document.getElementById('deskAwayScore').textContent = localGame.awayScore;
      document.getElementById('mobileAwayScore').textContent = localGame.awayScore;
      document.getElementById('gamesHomeScore').textContent = localGame.homeScore;
      document.getElementById('deskHomeScore').textContent = localGame.homeScore;
      document.getElementById('mobileHomeScore').textContent = localGame.homeScore;
    }
  } else if (response.type == 'stopClock') {
    stopClock();
  } else if (response.type == 'startClock') { //remove timeout
    setTimeout(() => { startClock(response.s)},20);
  } else if (response.type == 'poss') {
    if (response.team == 'away') {
      document.getElementsByClassName('ball')[0].style.display = 'block';
      document.getElementsByClassName('ball')[1].style.display = 'none';
      document.getElementsByClassName('updateBall')[0].style.display = 'block';
      document.getElementsByClassName('updateBall')[1].style.display = 'none';
    } else {
      document.getElementsByClassName('ball')[1].style.display = 'block';
      document.getElementsByClassName('ball')[0].style.display = 'none';
      document.getElementsByClassName('updateBall')[1].style.display = 'block';
      document.getElementsByClassName('updateBall')[0].style.display = 'none';
    }
  } else if (response.type == 'down') {
    if (response.conv) {
      document.getElementById('centerDown').textContent = '2PT ATTEMPT';
      document.getElementById('updateDown').textContent = '2PT ATTEMPT';
    } else {
      document.getElementById('centerDown').textContent = `${ordinal(response.down).toUpperCase()} & ${toGo(response.los,response.toGo)} AT ${los(response.los,response.off,response.def)}`;
      document.getElementById('updateDown').textContent = `${ordinal(response.down).toUpperCase()} & ${toGo(response.los,response.toGo)} AT ${los(response.los,response.off,response.def)}`;
    }
  } else if (response.type == 'update') {
    newUpdate(response);
  } else if (response.type == 'newPeriod') {
    localGame.q = response.q;
    if (localGame.q < 5) {
      document.getElementById('centerBot').textContent = `${period(localGame.q)} ${decodeEntities('&bull;')} 15:00`;
      document.getElementById('updateTime').textContent = `${period(localGame.q)} ${decodeEntities('&bull;')} 15:00`;
    } else {
      localGame.s = Infinity;
      document.getElementById('centerBot').textContent = period(localGame.q);
      document.getElementById('updateTime').textContent = period(localGame.q);
    }
  } else if (response.type == 'teamStats') {
    updateTeamStats(response.as,response.hs);
  } else if (response.type == 'final') {
    document.getElementById('centerBot').textContent = 'FINAL';
    document.getElementById('updateTime').textContent = 'FINAL';
  } else if (response.type == 'stats') {
    updatePlayers(response.players);
  } else if (response.type == 'newGame') {
    if (localGame) {
      location.reload();
      return false;
    }
    resetField(response.game);
  }
}

var clockInt = false;
var localGame;
var playerStats = {};
playerStats['QB'] = ['qbr','c/a','t/i','yds'];
playerStats['RB'] = ['yds','att','avg','td'];
playerStats['WR'] = ['yds','att','avg','td'];
playerStats['TE'] = ['yds','att','avg','td'];
playerStats['OL'] = ['sacks','holding','defended'];
playerStats['DL'] = ['tackles','sacks'];
playerStats['LB'] = ['tackles','sacks'];
playerStats['CB'] = ['tackles','int','targets'];
playerStats['S'] = ['tackles','int','targets'];
playerStats['K'] = ['u40','o40','pat','pts'];
playerStats['P'] = ['yds','netYds','in20','blocked'];

function showUpdates() {
  document.getElementById('updateCont').style.display = 'block';
  document.body.style.overflowY = 'hidden';
}

function hideUpdates() {
  document.getElementById('updateCont').style.display = 'none';
  document.body.style.overflowY = 'auto';
}

function resetField(game) {
  document.getElementsByClassName('updatePage')[0].innerHTML = '';
  for (let e of document.getElementsByClassName('playerRow')) {
    e.remove();
  }
  for (let i = 0, t = 'away'; i < 2; i++, t = 'home') {
    let a = game[t];
    let clean = a.mascot.toLowerCase().replace(/\s/g,'');
    document.getElementsByClassName('topOuter')[i].classList.add(clean);
    document.getElementsByClassName('topRecord')[i].classList.add(clean);
    document.getElementsByClassName('updateLeft')[i].classList.add(clean);
    document.getElementsByClassName('updateScore')[i].classList.add(clean);
    document.getElementsByClassName('updateLogo')[i].classList.add(clean);
    for (let e of document.getElementsByClassName('statsBar')) {
      e.children[i].classList.add(clean);
    }
    document.getElementsByClassName('updateLeft')[i].textContent = a.abbr;
    document.getElementsByClassName('topRecord')[i].textContent = `(${a.w}-${a.l}) | (${a.dw}-${a.dl})`;
    if (i == 0) {
      document.getElementById('topLeft').classList.add(clean);
    } else {
      document.getElementById('botRight').classList.add(clean);
    }
    if (game.off == t) {
      document.getElementsByClassName('ball')[i].style.display = 'block';
      document.getElementsByClassName('updateBall')[i].style.display = 'block';
    } else {
      document.getElementsByClassName('ball')[i].style.display = 'none';
      document.getElementsByClassName('updateBall')[i].style.display = 'none';
    }
    document.getElementsByClassName('topOuter')[i].textContent = a.abbr;
    document.getElementsByClassName('topLogo')[i].src = `logos/${clean}_t.png`;
    document.getElementsByClassName('updateLogo')[i].src = `logos/${clean}_t.png`;
    document.getElementsByClassName('updateScore')[i].textContent = game[`${t}Score`];
    for (let p of a.fieldPlayers) { //build player rows
      let div;
      if (['WR','TE'].includes(p.pos)) {
        div = document.getElementById('recCont');
      } else if (['DL','LB'].includes(p.pos)) {
        div = document.getElementById('lnCont');
      } else if (['CB','S'].includes(p.pos)) {
        div = document.getElementById('dbCont');
      } else {
        div = document.getElementById(`${p.pos.toLowerCase()}Cont`);
      }
      if (!div) {
        continue;
      }
      let row = buildElem('DIV','playerRow',undefined,div);
      row.id = `row${p.id}`;
      buildElem('IMG',undefined,`logos/${getAttrFromAbbr('clean',p.team)}.png`,row);
      let name = buildElem('DIV',undefined,undefined,row);
      name.innerHTML = `${p.fName} ${p.lName} <span class="num">#${p.id}</span>`;
      for (let s of playerStats[p.pos]) {
        buildElem('DIV',undefined,renderStat(s,p),row);
      }
    }
  }
  document.getElementById('centerTop').textContent = `${game.awayScore} - ${game.homeScore}`;
  var a = Math.floor(game.s / 10);
  var m = Math.floor(a / 60);
  var s = a % 60;
  s = (s<10)?`0${s}`:s;
  document.getElementById('centerBot').textContent = `${period(game.q)} ${decodeEntities('&bull;')} ${m}:${s}`;
  document.getElementById('updateTime').textContent = `${period(game.q)} ${decodeEntities('&bull;')} ${m}:${s}`;
  if (game.los < 50) {
    var los = `${game[game.off].abbr} ${game.los}`;
  } else if (game.los > 50) {
    var los = `${game[game.def].abbr} ${100 - game.los}`;
  } else {
    var los = 50;
  }
  document.getElementById('centerDown').textContent = `${ordinal(game.down).toUpperCase()} & ${toGo(game.los,game.toGo)} AT ${los}`;
  document.getElementById('updateDown').textContent = `${ordinal(game.down).toUpperCase()} & ${toGo(game.los,game.toGo)} AT ${los}`;
  localGame = game;
  startClock();
  for (let p of game.plays) {
    newUpdate(p);
  }
  updateTeamStats(game.away.s,game.home.s);
}

function updateTeamStats(as,hs) {
  let stats = ['off','def','yds','passYds','rushYds','ypp','firstDowns','sacks','int'];
  let rows = document.getElementsByClassName('statsRow');
  for (let i = 0, e = rows[0], s = stats[0]; i < stats.length; i++, e = rows[i], s = stats[i]) {
    let av, hv;
    if (s == 'off') {
      av = calcOffRating(as.plays,as.td,as.pts,as.yds);
      hv = calcOffRating(hs.plays,hs.td,hs.pts,hs.yds);
    } else if (s == 'def') {
      av = calcDefRating(as.defPlays,as.sacks,as.int,as.allowTd,as.defYds,as.allowPts);
      hv = calcDefRating(hs.defPlays,hs.sacks,hs.int,hs.allowTd,hs.defYds,hs.allowPts);
    } else if (s == 'ypp') {
      if (as.plays == 0) {
        av = '0.0';
      } else {
        av = (as.yds / as.plays).toFixed(1);
      }
      if (hs.plays == 0) {
        hv = '0.0';
      } else {
        hv = (hs.yds / hs.plays).toFixed(1);
      }
    } else {
      av = as[s];
      hv = hs[s];
    }
    e.children[0].textContent = av;
    e.children[2].textContent = hv;
    if (av < 0) {
      hv -= av;
      av = 0;
    } else if (hv < 0) {
      av -= hv;
      hv = 0;
    }
    if (av == 0 && hv == 0) {
      document.getElementsByClassName('statsBar')[i].children[0].style.width = 'calc(50% - 6px)';
    } else {
      document.getElementsByClassName('statsBar')[i].children[0].style.width = `calc(${Number(av)/(Number(av)+Number(hv))*100}% - 6px)`;
    }
  }
}

function startClock(num) {
  if (clockInt !== false || num < 0) {
    clearInterval(clockInt);
  }
  if (num != undefined) {
    localGame.s = num;
  }
  clockInt = setInterval(() => {
    localGame.s--;
    var a = Math.floor(localGame.s / 10);
    var str;
    if (a <= 0) {
      clearInterval(clockInt);
      if (localGame.q == 4) {
        str = 'END OF REG';
      } else {
        str = `END ${period(localGame.q)}`;
        if (localGame.q == 2) {
          setTimeout(() => {
            str = 'HALFTIME';
          },10000);
        }
      }
    } else {
      var m = Math.floor(a / 60);
      var s = a % 60;
      s = (s<10)?`0${s}`:s;
      if (localGame.q < 5) {
        str = `${period(localGame.q)} ${decodeEntities('&bull;')} ${m}:${s}`;
      } else {
        str = period(localGame.q);
      }
    }
    document.getElementById('centerBot').textContent = str;
    document.getElementById('updateTime').textContent = str;
    if (document.getElementById('gamesTime')) {
      document.getElementById('gamesTime').textContent = str;
    }
  },100);
}

function stopClock() {
  clearInterval(clockInt);
  clockInt = false;
}

function newUpdate(res) {
  let div = document.createElement('DIV');
  div.classList.add('updateRow');
  var a = Math.floor(res.s / 10);
  var m = Math.floor(a / 60);
  var s = a % 60;
  s = (s<10)?`0${s}`:s;
  if (res.conv === true) {
    buildElem('DIV','updateRowTop',`${period(res.q)} ${decodeEntities('&bull;')} 2PT ATTEMPT`,div);
  } else if (res.use === false) {
    if (res.q < 5) {
      buildElem('DIV','updateRowTop',`${period(res.q)} ${m}:${s}`,div);
    } else {
      buildElem('DIV','updateRowTop',period(res.q),div);
    }
  } else {
    if (res.q < 5) {
      buildElem('DIV','updateRowTop',`${period(res.q)} ${m}:${s} ${decodeEntities('&bull;')} ${ordinal(res.down).toUpperCase()} & ${toGo(res.los,res.toGo)} AT ${los(res.los,res.off,res.def)}`,div);
    } else {
      buildElem('DIV','updateRowTop',`${period(res.q)} ${decodeEntities('&bull;')} ${ordinal(res.down).toUpperCase()} & ${toGo(res.los,res.toGo)} AT ${los(res.los,res.off,res.def)}`,div);
    }
  }
  document.getElementsByClassName('updatePage')[0].prepend(div);
  let bot = buildElem('DIV','updateRowBot',undefined,div);
  let logo = buildElem('DIV','updateRowLogo',undefined,bot)
  buildElem('IMG',undefined,`logos/${localGame[res.side].mascot.toLowerCase().replace(/\s/g,'')}.png`,logo);
  buildElem('DIV','updateRowText',res.txt,bot);
}

function los(line,off,def) {
  if (line < 50) {
    return `${localGame[off].abbr} ${line}`;
  } else if (line > 50) {
    return `${localGame[def].abbr} ${100 - line}`;
  } else {
    return 50;
  }
}

function toGo(line,toGo) {
  if (line + toGo >= 100) {
    return 'GOAL';
  } else {
    return toGo;
  }
}

function period(num) {
  if (num < 5) {
    return ordinal(num).toUpperCase();
  } else if (num == 5) {
    return 'OT';
  } else {
    return `${num - 4}OT`;
  }
}

function updatePlayers(list) {
  for (let p of list) {
    if (!p) {
      continue;
    }
    let row = document.getElementById(`row${p.id}`);
    if (!row) {
      continue;
    }
    for (let i = 2; i < row.children.length; i++) {
      row.children[i].textContent = renderStat(playerStats[p.pos][i-2],p);
    }
  }
}

function renderStat(s,p) {
  if (s == 'qbr') {
    return calcQBRating(p.s.comp,p.s.att,p.s.yds,p.s.td,p.s.int);
  } else if (s == 'c/a') {
    return `${p.s.comp}/${p.s.att}`;
  } else if (s == 't/i') {
    return `${p.s.td}/${p.s.int}`;
  } else if (s == 'avg') {
    if (p.s.att == 0) {
      return '0.0';
    } else {
      return (p.s.yds/p.s.att).toFixed(1);
    }
  } else if (s == 'u40') {
    return `${p.s.under40}/${p.s.under40Att}`;
  } else if (s == 'o40') {
    return `${p.s.over40}/${p.s.over40Att}`;
  } else if (s == 'pat') {
    return `${p.s.pat}/${p.s.patAtt}`;
  } else {
    return p.s[s];
  }
}