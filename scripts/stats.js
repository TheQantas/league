window.onload = function() {
  let req = {method:'request',type:'players',qual:'qb'};
  ws.send(JSON.stringify(req));
}

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested') {
    players[response.qual.toLowerCase()] = response.data;
    var s = ['qb','rb','wr','te','de','lb','cb','s','k','p','off','def'];
    for (let i = 0; i < s.length; i++) {
      if (response.qual.toLowerCase() == s[i]) {
        goToPageStyle(i);
        render(i);
        break;
      }
    }
  }
}

var currentPage = 0;
var players = [];
var period = -1;

function goToPage(num) {
  var s = ['qb','rb','wr','te','de','lb','cb','s','k','p','off','def'];
  var p = s[num];
  if (!players[p]) {
    let req = {method:'request',type:'players',qual:p};
    ws.send(JSON.stringify(req));
  } else {
    goToPageStyle(num);
    render(num);
  }
}

function goToPageStyle(num) {
  currentPage = num;
  var pages = document.getElementsByClassName('statPage');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementsByClassName('posSel');
  for (let btn of btns) {
    btn.classList.remove('selected');
  }
  btns[num].classList.add('selected');
  var plus = Number(document.getElementsByClassName('statTable')[num].getAttribute('data-period')) + 1;
  document.getElementById('termSel').selectedIndex = plus;
  period = plus - 1;
}

function render(num) {
  var s = ['qb','rb','wr','te','de','lb','cb','s','k','p','off','def'];
  var p = players[s[num]];
  var table = document.getElementsByClassName('statTable')[num];
  table.setAttribute('data-period',period);
  while (table.children[0].childNodes.length > 2) {
    table.children[0].lastChild.remove();
  }
  for (let player of p) {
    let stats;
    if (num < 10) {
      stats = JSON.parse(player.stats);
    } else if (num == 10) {
      stats = JSON.parse(player.offStats);
    } else {
      stats = JSON.parse(player.defStats);
    }
    for (let attr in stats) {
      if (period != -1) {
        if (stats[attr][period]) {
          player[`${attr}Per`] = stats[attr][period];
        } else {
          player[`${attr}Per`] = 0;
        }
      } else {
        let x = 0;
        for (let val of stats[attr]) {
          x += val;
        }
        player[`${attr}Per`] = x;
      }
    }
  }
  for (let player of p) {
    if (s[num] == 'qb') {
      player.sort = calcQBRating(player.compPer,player.attPer,player.ydsPer,player.tdPer,player.intPer);
    } else if (s[num] == 'rb' || s[num] == 'wr' || s[num] == 'te') {
      player.sort = player.ydsPer;
    } else if (s[num] == 'de' || s[num] == 'lb') {
      player.sort = player.sackPer;
    } else if (s[num] == 'cb' || s[num] == 's') {
      player.sort = player.intPer;
    } else if (s[num] == 'k') {
      player.sort = player.ptsPer;
    } else if (s[num] == 'p') {
      if (player.puntsPer == 0) {
        player.sort = '0.0';
      } else {
        player.sort = Number((player.ydsPer / player.puntsPer).toFixed(1));
      }
    } else if (s[num] == 'off') {
      player.sort = calcOffRating(player.playsPer,player.tdPer,player.ptsPer,player.ydsPer);
    } else {
      player.sort = calcDefRating(player.playsDefPer,player.sacksPer,player.intPer,player.tdGivenPer,player.ydsGivenPer,player.ptsGivenPer);
    }
  }
  p.sort(compare);
  for (let player of p) {
    var txt = [];
    var row = table.insertRow();
    if (s[num] == 'qb') {
      txt[0] = `${player.compPer}/${player.attPer}`;
      txt[1] = player.ydsPer;
      txt[2] = `${player.tdPer}/${player.intPer}`;
      txt[3] = calcQBRating(player.compPer,player.attPer,player.ydsPer,player.tdPer,player.intPer);
    } else if (s[num] == 'rb') {
      txt[0] = player.ydsPer;
      txt[1] = player.attPer;
      if (player.attPer == 0) {
        txt[2] = '0.0';
      } else {
        txt[2] = (Number(player.ydsPer) / Number(player.attPer)).toFixed(1);
      }
      txt[3] = player.tdPer;
    } else if (s[num] == 'wr' || s[num] == 'te') {
      txt[0] = player.ydsPer;
      txt[1] = player.recepsPer;
      if (player.recepsPer == 0) {
        txt[2] = '0.0';
      } else {
        txt[2] = (Number(player.ydsPer) / Number(player.recepsPer)).toFixed(1);
      }
      txt[3] = player.tdPer;
    } else if (s[num] == 'de' || s[num] == 'lb') {
      txt[0] = player.tacklesPer;
      txt[1] = player.sackPer;
      txt[2] = player.tAttPer;
      txt[3] = player.blitzPer;
    } else if (s[num] == 'cb' || s[num] == 's') {
      txt[0] = player.tacklesPer;
      txt[1] = player.intPer;
      txt[2] = player.tAttPer;
      txt[3] = player.targetsPer;
    } else if (s[num] == 'k') {
      txt[0] = `${player.under40Per}/${player.under40AttPer}`;
      txt[1] = `${player.over40Per}/${player.over40AttPer}`;
      txt[2] = `${player.patPer}/${player.patAttPer}`;
      txt[3] = player.ptsPer;
    } else if (s[num] == 'p') {
      if (player.puntsPer == 0) {
        txt[0] = '0.0';
        txt[1] = '0.0';
      } else {
        txt[0] = (player.ydsPer / player.puntsPer).toFixed(1);
        txt[1] = (player.netPer / player.puntsPer).toFixed(1);
      }
      txt[2] = player.in20Per;
      txt[3] = player.blockedPer;
    } else if (s[num] == 'off') {
      txt[0] = player.playsPer;
      txt[1] = player.firstPer;
      txt[2] = player.ydsPer;
      txt[3] = calcOffRating(player.playsPer,player.tdPer,player.ptsPer,player.ydsPer);
    } else {
      txt[0] = player.sacksPer;
      txt[1] = player.intPer;
      txt[2] = player.ydsGivenPer;
      txt[3] = calcDefRating(player.playsDefPer,player.sacksPer,player.intPer,player.tdGivenPer,player.ydsGivenPer,player.ptsGivenPer);
    }
    var firstCell = row.insertCell();
    var logo = buildElem('IMG','teamLogo',undefined,firstCell);
    if (num < 10) {
      player.mascot = player.teamMascot;
    }
    logo.src = `logos/${cleanObj(player)}.png`;
    var secondCell = row.insertCell();
    if (num < 10) {
      secondCell.innerHTML = `${player.fName} ${player.lName} <span class="num">#${player.id}</span>`;
    } else {
      secondCell.innerHTML = `${player.fName} ${player.lName}`;
    }
    for (let t of txt) {
      var cell = row.insertCell();
      cell.textContent = t;
    }
  }
}

function changeTerm() {
  period = Number(document.getElementById('termSel').value);
  render(currentPage);
}

//sort functions

function compare(a,b) {
  if (Number(a.sort) != Number(b.sort)) {
    return Number(b.sort) - Number(a.sort);
  } else {
    if (a.lName > b.lName) {
      return 1;
    } else  if (a.lName < b.lName) {
      return -1;
    } else if (a.fName > b.fName) {
      return 1;
    } else {
      return -1;
    }
  }
}
