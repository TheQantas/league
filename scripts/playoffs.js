window.onload = () => {
  for (let i = 11; i < 15; i++) {
    let req = {method:'request',type:'games',qual:'week',crit:i};
    ws.send(JSON.stringify(req));
  }
  let requ = {method:'request',type:'playoffOrder',qual:'CFC'};
  ws.send(JSON.stringify(requ));
}

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested') {
    if (response.type == 'games') {
      cacheGames[response.crit - 11] = response;
      renderGames(response);
    } else if (response.type == 'playoffOrder') {
      cachePlayoffs[response.qual.toLowerCase()] = response.data;
      playoffs = response.data;
      if (wildCard) {
        updateWildCard();
      }
      updateHunt();
      updateStandings();
    }
  }
}

var currConf = 'CFC';
var wildCard = false;
var playoffs = [];
var needRefresh = false;
var cachePlayoffs = {cfc:[],nfc:[]};
var cacheGames = [];

function renderGames(data) {
  if (needRefresh) {
    for (let cont of document.getElementsByClassName('playoffGroup')) {
      cont.innerHTML = '';
    }
    needRefresh = false;
  }
  var par = document.getElementsByClassName('playoffGroup')[13 - data.crit];
  if (data.crit == 14) {
    updateChamp(data.data[0]);
    return;
  }
  for (let i = 0; i < data.data.length; i++) {
    let game = data.data[i];
    if (currConf == 'CFC' && i % 2 == 0) {
      if (data.crit == 11) {
        renderGame(game,par,i);
      } else {
        renderGame(game,par);
      }
    } else if (currConf == 'NFC' && i % 2 == 1) {
      if (data.crit == 11) {
        renderGame(game,par,i);
      } else {
        renderGame(game,par);
      }
    }
  }
  if (data.crit == 11) {
    wildCard = true;
    if (playoffs.length != 0) {
      updateWildCard();
    }
  }
}

function updateChamp(game) {
  if (game.away == 'CFC' || game.home == 'NFC') {
    return;
  }
  var rows = document.getElementsByClassName('champMatchup');
  rows[0].classList.remove('cfc');
  rows[0].classList.add(cleanObj(game.awayTeam.mascot));
  rows[0].children[0].src = `logos/${cleanObj(game.awayTeam.mascot)}.png`;
  rows[0].children[1].textContent = game.awayTeam.mascot;
  rows[0].children[2].textContent = game.awayTeam.abbr;
  //
  rows[1].classList.remove('nfc');
  rows[1].classList.add(cleanObj(game.homeTeam.mascot));
  rows[1].children[0].src = `logos/${cleanObj(game.homeTeam.mascot)}.png`;
  rows[1].children[1].textContent = game.homeTeam.mascot;
  rows[1].children[2].textContent = game.homeTeam.abbr;
  if (game.status != 'upcoming') {
    rows[0].children[3].textContent = game.awayScore;
    rows[1].children[3].textContent = game.homeScore;
  }
}

function renderGame(game,par,index) {
  var newRow = buildElem('DIV','gameRow',undefined,par);
  var d = new Date(game.schedule);
  buildElem('DIV','gameTime',`${numToDay(d.getDay())} ${d.getDate()} ${numToMon(d.getMonth())} ${game.time}`,newRow);
  var newMain = buildElem('DIV','gameMain',undefined,newRow);
  var awayHalf = buildElem('DIV','gameHalf',undefined,newMain);
  awayHalf.classList.add(cleanObj(game.awayTeam));
  var awayLogo = buildElem('IMG','gameLogo',undefined,awayHalf);
  awayLogo.src = `logos/${cleanObj(game.awayTeam)}.png`;
  buildElem('DIV','gameName',game.awayTeam.mascot,awayHalf);
  buildElem('DIV','gameAbbr',game.away,awayHalf);
  if (game.status == 'upcoming') {
    buildElem('DIV','gameScore','-',awayHalf);
  } else {
    buildElem('DIV','gameScore',game.awayScore,awayHalf);
  }
  //
  var homeHalf = buildElem('DIV','gameHalf',undefined,newMain);
  homeHalf.classList.add(cleanObj(game.homeTeam));
  if (game.status == 'upcoming') {
    buildElem('DIV','gameScore','-',homeHalf);
  } else {
    buildElem('DIV','gameScore',game.homeScore,homeHalf);
  }
  buildElem('DIV','gameName',game.homeTeam.mascot,homeHalf);
  buildElem('DIV','gameAbbr',game.home,homeHalf);
  var homeLogo = buildElem('IMG','gameLogo',undefined,homeHalf);
  homeLogo.src = `logos/${cleanObj(game.homeTeam)}.png`;
  if (game.away == 'CFC' || game.away == 'NFC') {
    newRow.setAttribute('data-fixable','true');
  } else {
    newRow.setAttribute('data-fixable','false');
  }
  //seeds
  if (index != undefined) {
    index = Math.floor(index / 2);
    buildElem('DIV','gameSeed',8 - index,awayHalf);
    buildElem('DIV','gameSeed',index + 1,homeHalf);
  }
}

function updateWildCard() {
  fixWCRow(playoffs[7],playoffs[0],0);
  fixWCRow(playoffs[6],playoffs[1],1);
  fixWCRow(playoffs[5],playoffs[2],2);
  fixWCRow(playoffs[4],playoffs[3],3);
}

function fixWCRow(away,home,index) {
  var row = document.getElementsByClassName('playoffGroup')[2].children[index];
  if (row.getAttribute('data-fixable') == 'false') {
    return;
  }
  var awayHalf = row.children[1].children[0];
  awayHalf.className = '';
  awayHalf.classList.add('gameHalf',cleanObj(away));
  awayHalf.children[0].src = `logos/${cleanObj(away)}.png`;
  awayHalf.children[1].textContent = away.mascot;
  awayHalf.children[2].textContent = away.abbr;
  if (away.clinchedDiv) {
    buildElem('DIV','gameClinch','xy',awayHalf);
  } else if (away.clinched) {
    buildElem('DIV','gameClinch','x',awayHalf);
  }
  //
  var homeHalf = row.children[1].children[1];
  homeHalf.className = '';
  homeHalf.classList.add('gameHalf',cleanObj(home));
  homeHalf.children[3].src = `logos/${cleanObj(home)}.png`;
  homeHalf.children[1].textContent = home.mascot;
  homeHalf.children[2].textContent = home.abbr;
  if (home.clinchedDiv) {
    buildElem('DIV','gameClinch','xy',homeHalf);
  } else if (home.clinched) {
    buildElem('DIV','gameClinch','x',homeHalf);
  }
}

function updateHunt() {
  document.getElementsByClassName('playoffGroup')[3].innerHTML = '';
  document.getElementsByClassName('playoffGroup')[4].innerHTML = '';
  for (let i = 8; i < 20; i++) {
    let team = playoffs[i];
    if (team.eliminated) {
      var newRow = buildElem('DIV','gameHunt',undefined,document.getElementsByClassName('playoffGroup')[4]);
    } else {
      var newRow = buildElem('DIV','gameHunt',undefined,document.getElementsByClassName('playoffGroup')[3]);
    }
    newRow.classList.add(cleanObj(team));
    var newLogo = buildElem('IMG','gameLogo',undefined,newRow);
    newLogo.src = `logos/${cleanObj(team)}.png`;
    buildElem('DIV','gameName',team.mascot,newRow);
    buildElem('DIV','gameAbbr',team.abbr,newRow);
    buildElem('DIV','gameSeed',i + 1,newRow);
  }
}

function updateStandings() {
  for (let elem of document.getElementsByClassName('standingsGroup')) {
    elem.innerHTML = '';
  }
  for (let team of playoffs) {
    for (let elem of document.getElementsByClassName('standingsGroup')) {
      if (team.division.indexOf(elem.getAttribute('data-div')) != -1) {
        var par = elem;
        break;
      }
    }
    var newRow = buildElem('DIV','standingsRow',undefined,par);
    newRow.classList.add(cleanObj(team));
    var newLogo = buildElem('IMG','standingsLogo',undefined,newRow);
    newLogo.src = `logos/${cleanObj(team)}.png`;
    var newTont = buildElem('DIV','standingsTont',undefined,newRow);
    buildElem('SPAN','standingsAbbr',team.abbr,newTont);
    buildElem('SPAN','standingsName',team.mascot,newTont);
    if (team.clinchedDiv) {
      buildElem('SPAN','standingsClinch','[xy]',newTont);
    } else if (team.clinched) {
      buildElem('SPAN','standingsClinch','[x]',newTont);
    } else if (team.eliminated) {
      buildElem('SPAN','standingsClinch','[*]',newTont);
    }
    buildElem('DIV','standingsRecord',getFormatRecord(team.w,team.l,team.t),newRow);
  }
}

function goToCon(conf,elem) {
  if (conf == currConf) {
    return;
  }
  elem.style.textDecoration = 'underline';
  if (conf == 'CFC') {
    elem.nextElementSibling.style.textDecoration = 'none';
  } else {
    elem.previousElementSibling.style.textDecoration = 'none';
  }
  needRefresh = true;
  currConf = conf;
  if (cachePlayoffs[conf.toLowerCase()].length > 0) {
    playoffs = cachePlayoffs[conf.toLowerCase()];
    for (let i = 0; i < 3; i++) {
      renderGames(cacheGames[i]);
      playoffs = cachePlayoffs[conf.toLowerCase()];
      updateHunt();
      updateStandings();
    }
    return;
  }
  for (let i = 11; i < 15; i++) {
    let req = {method:'request',type:'games',qual:'week',crit:i};
    ws.send(JSON.stringify(req));
  }
  let requ = {method:'request',type:'playoffOrder',qual:currConf};
  ws.send(JSON.stringify(requ));
}