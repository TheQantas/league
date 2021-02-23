//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamFromAbbr } = require("../clubs");

//const { getTeamIndex } = require("../clubs");

var audio, team, currentTeam;
var clockInt = false;
var songBuffer = [-1,-1,-1,-1,4];
var abbrs = [];
var board = [];
var clock = 30;
var music = true;
var chime = true;

window.onload = () => {
  audio = document.getElementById('audio');
  audio.onended = loadMusic;
  for (let team of teams) {
    abbrs.push(team.abbr);
  }
  team = document.getElementById('header').getAttribute('data-team');
  currentTeam = document.getElementById('header').getAttribute('data-currTeam');
  if (document.getElementById('pickClock').getAttribute('data-time') != 'x') {
    startMusic();
    updateClock(Number(document.getElementById('pickClock').getAttribute('data-time')));
  }
  if (getCookie('board')) {
    board = JSON.parse(getCookie('board'));
  }
  let mess = {method:'connectToDraft',token:getCookie('token')};
  ws.send(JSON.stringify(mess));
};

ws.addEventListener('open',function(){
  if (getCookie('board')) {
    let mess = {method:'getBoard',board:JSON.parse(getCookie('board')),token:getCookie('token')};
    ws.send(JSON.stringify(mess));
  }
});

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'gottenBoard') {
    setTimeout(function() { buildBoard(response.board); }, 100);
  } else if (response.method == 'draftedPlayer') {
    announcePick(response);
  } else if (response.method == 'draftStarted') {
    startMusic();
    updateClock(30);
    let main = document.getElementById('pickMain');
    main.textContent = 'THE COONHOUNDS ARE ON THE CLOCK';
    main.className = '';
    main.classList.add('coonhounds');
  } else if (response.method == 'getBoard') {
    let mess = {method:'gottenBoard',token:getCookie('token'),board:board};
    ws.send(JSON.stringify(mess));
  } else if (response.method == 'requested') {
    picks.length = 0;
    for (let arr of response.data) {
      picks = picks.concat(arr);
    }
    document.getElementById('tradeCont').style.display = 'block';
  } else if (response.method == 'error') {
    if (response.type == '505') {
      location.reload();
      return false;
    } else {
      error(response.mess);
    }
  } else if (response.method == 'proposedDraftTrade') {
    document.getElementById('tradeCont').style.display = 'none';
    if (response.from != team) {
      error('You have a new trade deal!');
    }
    renderTrade(response);
  } else if (response.method == 'negatedDraftTrade') {
    var boxes = document.getElementsByClassName('tradeBox');
    for (let box of boxes) {
      if (box.getAttribute('data-id') == response.id) {
        box.remove();
      }
    }
  } else if (response.method == 'acceptedDraftTrade') {
    var boxes = document.getElementsByClassName('tradeBox');
    for (let box of boxes) {
      if (box.getAttribute('data-id') == response.id) {
        box.children[0].innerHTML = '';
        let d = 'M21,9L17,5V8H10V10H17V13M7,11L3,15L7,19V16H14V14H7V11Z';
        buildSVG(d,'tradePickBtn','Trade Accepted',box.children[0],false);
      }
    }
  } else if (response.method == 'picksSwapped') {
    error(response.text);
    updatePicks(response.adj);
  } else if (response.method == 'draftFinished') {
    setTimeout(() => {
      let cont = document.getElementById('errorCont');
      cont.style.display = 'flex';
      cont.children[0].textContent = 'The draft is now done. You will be redirected shortly.';
      let d = new Date();
      document.cookie = `time=${d.getTime()}`;
      let delay = Math.floor(Math.random() * 4000) + 1000;
      setTimeout(() => {
        if (team == 'XXX') {
          window.location.href = '/';
        } else {
          window.location.href = '/teams';
        }
      },delay);
    },5000);
  }
}
var picks = [];

function error(mess) {
  let cont = document.getElementById('errorCont');
  cont.style.display = 'flex';
  cont.children[0].textContent = mess;
  setTimeout(function() { cont.style.display = 'none'; },3000);
}

function goToPage(num) {
  var pages = document.getElementsByClassName('page');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementsByClassName('navBtn');
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function goToPosPage(num) {
  var pages = document.getElementsByClassName('posPage');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementsByClassName('posBtn');
  for (let btn of btns) {
    if (!btn.classList.contains('disabled')) {
      btn.style.textDecoration = 'none';
    }
  }
  if (!btns[num].classList.contains('disabled')) {
    btns[num].style.textDecoration = 'underline';
  }
}

function goToAllPage(num) {
  var pages = document.getElementsByClassName('allPage');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementsByClassName('allBtn');
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function addToBoard(elem) {
  if (elem.getAttribute('data-remove') == 'true') {
    elem.parentElement.parentElement.remove();
    updateBoard();
    return;
  }
  var num = elem.parentElement.parentElement.getAttribute('data-num');
  var table = document.getElementsByClassName('posTable')[10];
  for (let row of table.rows) {
    if (row.getAttribute('data-num') == num) {
      return;
    }
  }
  var tr = elem.parentElement.parentElement;
  var trx = tr.cloneNode(true);
  table.children[0].append(trx);
  var n = 'M19 3H14.82C14.4 1.84 13.3 1 12 1S9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.9 20.11 3 19 3M12 3C12.55 3 13 3.45 13 4S12.55 5 12 5 11 4.55 11 4 11.45 3 12 3M16 14H8V12H16V14Z';
  trx.cells[5].children[0].children[1].setAttribute('d',n);
  trx.cells[5].children[0].children[0].textContent = 'Remove Player from Draft Board';
  trx.cells[5].children[0].setAttribute('data-remove','true');
  var c = trx.insertCell();
  var up = buildSVG('M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z','cellBtn','Move Player Up on Board',c,true);
  up.addEventListener('click',function() { moveRowUp(this); });
  c.append(up);
  var d = trx.insertCell();
  var down = buildSVG('M9,4H15V12H19.84L12,19.84L4.16,12H9V4Z','cellBtn','Move Player Down on Board',d,true);
  down.addEventListener('click',function() { moveRowDown(this); });
  var e = trx.insertCell(1);
  e.textContent = trx.getAttribute('data-pos');
  updateBoard();
}

function moveRowUp(elem) {
  var table = document.getElementsByClassName('posTable')[10];
  var tr = elem.parentElement.parentElement;
  if (tr == table.rows[1]) {
    return;
  }
  var sibling = tr.previousElementSibling;
  var parent = parent = tr.parentElement;
  parent.insertBefore(tr,sibling);
  updateBoard();
}

function moveRowDown(elem) {
  var table = document.getElementsByClassName('posTable')[10];
  var tr = elem.parentElement.parentElement;
  if (tr == table.rows[table.rows.length - 1]) {
    return;
  }
  var sibling = tr.nextElementSibling;
  var parent = parent = tr.parentElement;
  parent.insertBefore(sibling,tr);
  updateBoard();
}

function updateBoard() {
  board.length = 0;
  for (let row of document.getElementsByClassName('posTable')[10].rows) {
    if (row.getAttribute('data-num')) {
      board.push(row.getAttribute('data-num'));
    }
  }
  document.cookie = `board=${JSON.stringify(board)}`;
}

function buildBoard(board) {
  var table = document.getElementsByClassName('posTable')[10];
  if (!table) {
    return;
  }
  for (let player of board) {
    let tr = table.insertRow();
    tr.setAttribute('data-fname',player.fName);
    tr.setAttribute('data-lname',player.lName);
    tr.setAttribute('data-pos',player.pos);
    tr.setAttribute('data-num',player.id);
    let name = tr.insertCell();
    name.innerHTML = `${player.fName} ${player.lName} <span class="num">#${player.id}</span>`;
    let pos = tr.insertCell();
    pos.textContent = player.pos.toUpperCase();
    let cellA = tr.insertCell();
    cellA.textContent = `${JSON.parse(player.statA).m} (${JSON.parse(player.statA).s})`;
    let cellB = tr.insertCell();
    cellB.textContent = `${JSON.parse(player.statB).m} (${JSON.parse(player.statB).s})`;
    let cellC = tr.insertCell();
    cellC.textContent = `${JSON.parse(player.statC).m} (${JSON.parse(player.statC).s})`;
    var b1 = tr.insertCell();
    var d1 = 'M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z';
    var s1 = buildSVG(d1,'cellBtn','Draft Player',b1,true);
    s1.classList.add('disabled');
    s1.addEventListener('click',function() { draftPlayer(this); });
    var b2 = tr.insertCell();
    var d2 = 'M19 3H14.82C14.4 1.84 13.3 1 12 1S9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.9 20.11 3 19 3M12 3C12.55 3 13 3.45 13 4S12.55 5 12 5 11 4.55 11 4 11.45 3 12 3M16 14H8V12H16V14Z';
    var s2 = buildSVG(d2,'cellBtn','Remove Player from Board',b2,true);
    s2.setAttribute('data-remove','true');
    s2.addEventListener('click',function() { addToBoard(this); });
    var b3 = tr.insertCell();
    var d3 = 'M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z';
    var s3 = buildSVG(d3,'cellBtn','Move Player Up on Board',b3,true);
    s3.addEventListener('click',function() { moveRowUp(this); });
    var b4 = tr.insertCell();
    var d4 = 'M9,4H15V12H19.84L12,19.84L4.16,12H9V4Z';
    var s4 = buildSVG(d4,'cellBtn','Move Player Up on Board',b4,true);
    s4.addEventListener('click',function() { moveRowDown(this); });
  }
}

function pickIsIn() {
  var iter = 0;
  var a = document.getElementById('pickMain');
  var b = document.getElementById('pickIsIn');
  var s = 10;
  var animate = setInterval(function() {
    iter++;
    if (iter <= s) {
      a.style.opacity = (s - iter) / s;
      if (iter == 10) {
        a.style.display = 'none';
        b.style.display = 'block';
        b.style.opacity = 0;
      }
    } else {
      b.style.opacity = (iter - s) / s;
    }
    if (iter == s * 2) {
      a.style.opacity = 1;
      clearInterval(animate);
    }
  }, 20);
  //document.getElementById('pickMain').style.display = 'none';
  //document.getElementById('pickIsIn').style.display = 'block';
}

function draftPlayer(elem) {
  if (currentTeam != team) {
    return;
  }
  var playerId = elem.parentElement.parentElement.getAttribute('data-num');
  var mess = {method:'draftPlayer',id:playerId,token:getCookie('token')};
  ws.send(JSON.stringify(mess));
}

function announcePick(msg) {
  stopClock();
  var posTable = document.getElementsByClassName('posTable')[Number(msg.player.id.substring(0,1))];
  for (let row of posTable.rows) {
    if (row.getAttribute('data-num') == msg.player.id) {
      row.remove();
      break;
    }
  }
  var boardTable = document.getElementsByClassName('posTable')[10];
  if (boardTable) {
    for (let row of boardTable.rows) {
      if (row.getAttribute('data-num') == msg.player.id) {
        row.remove();
        break;
      }
    }
  }
  //msg = temp;
  var club = getTeamFromAbbr(msg.team);
  var par = document.getElementById('announce');
  par.style.display = 'block';
  par.className = '';
  par.classList.add(cleanObj(club));
  par.children[0].children[0].textContent = club.mascot;
  par.children[0].children[1].textContent = club.abbr;
  announcePickSound();
  var iter = 0;
  var u = 50;
  par.style.letterSpacing = '0em';
  par.children[0].children[0] = club.mascot;
  par.children[0].children[1] = club.abbr;
  var animate = setInterval(() => {
    iter++;
    par.style.letterSpacing = `${iter / u}em`;
    if (iter == 2 * u) {
      clearInterval(animate);
    }
  }, Math.floor(1500 / u));
  setTimeout(() => {
    buildSilhouettes(msg.player,msg.computer);
    par.style.display = 'none';
    var pla = document.getElementById('draftPlayer');
    pla.style.display = 'flex';
    pla.className = '';
    pla.classList.add(cleanObj(club));
    setTimeout(() => {
      currentTeam = msg.next;
      if (msg.pick <= 400) {
        updateRows(msg.nextRows);
        advView(msg.next,msg.pick,msg.inTwenty);
        updateClock(msg.timer);
      }
      let z = document.getElementsByClassName('allPlayer')[msg.pick - 1];
      z.classList.remove('upcoming');
      z.textContent = `${msg.player.fName} ${msg.player.lName} (${msg.player.pos} #${msg.player.id})`;
      pla.style.display = 'none';
      let allTable = document.getElementById('allTable');
      let allIndex = getAlphTeamIndex(msg.team);
      let conv = {qb:0,rb:1,wr:2,te:3,de:4,lb:5,cb:6,s:7,k:8,p:9};
      let allConv;
      for (let a in conv) {
        if (msg.player.pos.toLowerCase() == a) {
          allConv = conv[a];
          break;
        }
      }
      allTable.rows[allIndex + 1].cells[allConv + 1].textContent = decodeEntities('&#x2713;');
      if (msg.team == team) {
        markAsDrafted(msg.player,msg.pick);
      }
      if (msg.next == team) {
        enableDrafting();
      }
    },3000);
  },3000);
}

let tradex = {from:'COO',to:'AAR',fromPicks:[35,36],toPicks:[37,38],status:'Proposed',id:'555'};
let tradey = {from:'AAR',to:'COO',fromPicks:[100,399],toPicks:[37,399],status:'Proposed',id:'555'};

function x() {
  renderTrade(tradex);
  renderTrade(tradey);
}

function buildSilhouettes(player,comp) {
  var svg = document.getElementById('silhouette').children[0];
  // if (player.pos == 'WR' || player.pos == 'TE') {
  //   var newPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  //   newPath.setAttribute('d',silhouettes['rec2']);
  //   svg.children[0].append(newPath);
  // } else if (player.pos == 'P') {
  //   var newPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  //   newPath.setAttribute('d',silhouettes['p2']);
  //   svg.children[0].append(newPath);
  // } else {
  //   if (svg.children[0].children[1]) {
  //     svg.children[0].children[1].remove();
  //   }
  // }
  // var path = svg.children[0].children[0];
  // var d = '';
  // switch(player.pos.toLowerCase()) {
  //   case 'wr': case 'te':
  //     d = silhouettes['rec1'];
  //     break;
  //   case 'p':
  //     d = silhouettes['p1'];
  //     break;
  //   case 'de': case 'lb': case 'cb': case 's':
  //     d = silhouettes['def'];
  //     break;
  //   default:
  //     d = silhouettes[player.pos.toLowerCase()];
  // }
  // path.setAttribute('d',d);
  svg.children[0].innerHTML = '';
  //console.log(svg);
  var ds = [];
  switch(player.pos.toLowerCase()) {
    case 'wr': case 'te':
      ds.push(silhouettes['rec1']);
      ds.push(silhouettes['rec2']);
      break;
    case 'p':
      ds.push(silhouettes['p1']);
      ds.push(silhouettes['p2']);
      break;
    case 'de': case 'lb': case 'cb': case 's':
      ds.push(silhouettes['def']);
      break;
    default:
      ds.push(silhouettes[player.pos.toLowerCase()]);
  }
  //console.log(ds.length);
  for (let d of ds) {
    var newPath = document.createElementNS('http://www.w3.org/2000/svg','path');
    newPath.setAttribute('d',d);
    svg.children[0].append(newPath);
  }
  if (player.pos == 'QB') {
    svg.setAttribute('viewBox','0 0 300 384');
    svg.children[0].setAttribute('transform','translate(0,384) scale(0.1,-0.1)');
  } else {
    svg.setAttribute('viewBox','0 0 512 512');
    svg.children[0].setAttribute('transform','translate(0,512) scale(0.1,-0.1)');
  }
  var rows = document.getElementsByClassName('silRow');
  if (comp) {
    rows[0].innerHTML = `${player.fName} ${player.lName} (${player.pos}) <span class="num">#${player.id}*</span>`;
  } else {
    rows[0].innerHTML = `${player.fName} ${player.lName} (${player.pos}) <span class="num">#${player.id}</span>`;
  }
  var a = JSON.parse(player.statA);
  var b = JSON.parse(player.statB);
  var c = JSON.parse(player.statC);
  rows[1].textContent = `${capFirst(a.name)}: ${a.m} (${a.s})`;
  rows[2].textContent = `${capFirst(b.name)}: ${b.m} (${b.s})`;
  rows[3].textContent = `${capFirst(c.name)}: ${c.m} (${c.s})`;
}

function advView(next,nextPick,inTwenty) {
  var nextTeam = getTeamFromAbbr(next);
  if (inTwenty == 'LEA' || !inTwenty) {
    var twentyTeam = {mascot:'league',abbr:'LEA'};
  } else {
    var twentyTeam = getTeamFromAbbr(inTwenty);
  }
  var left = document.getElementById('topLeft');
  left.className = '';
  var nextClass = cleanObj(nextTeam);
  left.classList.add(nextClass);
  left.children[0].src = `logos/${nextClass}.png`;
  left.children[1].children[1].children[0].textContent = getRoundAndPick(nextPick + 1).r;
  left.children[1].children[1].children[1].textContent = getRoundAndPick(nextPick + 1).p;
  var main = document.getElementById('pickMain');
  main.className = '';
  main.classList.add(nextClass);
  var str = `The ${nextTeam.mascot} are on the clock`;
  main.textContent = str.toUpperCase();
  var right = document.getElementById('right');
  right.children[0].remove();
  var tab = buildElem('SPAN',cleanObj(twentyTeam),`${nextPick + 21}. ${twentyTeam.abbr}`,right);
  tab.setAttribute('data-pick',nextPick + 20);
  var inner = document.getElementById('mainInner');
  inner.className = '';
  inner.classList.add(nextClass);
  inner.children[0].children[0].src = `logos/${nextClass}.png`;
}

function updateClock(val) {
  clock = val;
  if (clock < 10) {
    document.getElementById('pickClock').textContent = `0:0${clock}`;
  } else {
    document.getElementById('pickClock').textContent = `0:${clock}`;
  }
  clockInt = setInterval(() => {
    clock--;
    if (clock <= 0) {
      document.getElementById('pickClock').textContent = '0:00';
      stopClock();
    } else {
      if (clock < 10) {
        document.getElementById('pickClock').textContent = `0:0${clock}`;
      } else {
        document.getElementById('pickClock').textContent = `0:${clock}`;
      }
    }
  },1000);
}

function stopClock() {
  clearInterval(clockInt);
  clockInt = false;
}

function updateRows(list) {
  var rows = document.getElementsByClassName('mainRow');
  for (let l = 0, r = rows[0], i = list[0]; l < 3; l++, r = rows[l], i = list[l]) {
    r.innerHTML = i;
  }
}

function markAsDrafted(player,pick) {
  var conv = {qb:0,rb:1,wr:2,te:3,de:4,lb:5,cb:6,s:7,k:8,p:9};
  for (let x in conv) {
    if (x == player.pos.toLowerCase()) {
      var index = conv[x];
    }
  }
  document.getElementsByClassName('posBtn')[index].style.textDecoration = 'line-through';
  document.getElementsByClassName('posBtn')[index].classList.add('disabled');
  for (let row of document.getElementsByClassName('posTable')[10].rows) {
    if (row.getAttribute('data-pos') == player.pos) {
      row.remove();
    }
  }
  document.getElementsByClassName('posTable')[index].setAttribute('data-picked','true');
  for (let row of document.getElementsByClassName('posTable')[index].rows) {
    row.cells[5].remove();
    row.cells[4].remove();
  }
  var z = document.getElementsByClassName('pickPlayer')[getRoundAndPick(pick).r - 1];
  z.classList.remove('upcoming');
  z.textContent = `${player.fName} ${player.lName} (${player.pos} #${player.id})`;
  var ts = document.getElementsByClassName('posTable');
  for (let i = 0, t = ts[0]; i < 10; i++, t = ts[i]) {
    let rows = t.rows;
    for (let j = 1, r = rows[1]; j < rows.length; j++, r = rows[j]) {
      if (r.cells[4]) {
        r.cells[4].children[0].classList.add('disabled');
      }
    }
  }
}

function enableDrafting() {
  var ts = document.getElementsByClassName('posTable');
  for (let i = 0, t = ts[0]; i < 10; i++, t = ts[i]) {
    if (t.getAttribute('data-picked') == 'true') {
      continue;
    }
    let rows = t.rows;
    for (let j = 1, r = rows[1]; j < rows.length; j++, r = rows[j]) {
      r.cells[4].children[0].classList.remove('disabled');
    }
  }
}

function makeTrade() {
  let mess = {method:'request',type:'draftOrder'};
  ws.send(JSON.stringify(mess));
}

function changePartner() {
  console.log('change');
  var abbr = document.getElementById('tradeTeamSel').value;
  if (abbr == '') {
    return;
  }
  var p = [];
  for (let i = 0; i < picks.length; i++) {
    if (p.length == 10) {
      break;
    }
    if (picks[i].abbr == abbr) {
      p.push(i + 1);
    }
  }
  console.log(p);
  for (let sel of document.getElementsByClassName('partnerSel')) {
    sel.options.length = 1;
    sel.options[0].textContent = 'Select Pick';
    for (let pick of p) {
      let opt = document.createElement('OPTION');
      opt.value = pick;
      let x = getRoundAndPick(pick);
      opt.textContent = `R${x.r} P${x.p} (${ordinal(pick).toUpperCase()} OVERALL)`;
      sel.add(opt);
    }
  }
  var ts = document.getElementsByClassName('teamSel');
  var ps = document.getElementsByClassName('partnerSel');
  for (let i = 0, t = ts[0], p = ps[0]; i < ts.length; i++, t = ts[i], p = ps[i]) {
    if (t.value != '') {
      let r = getRoundAndPick(Number(t.value)).r;
      p.selectedIndex = r;
    }
  }
  let team = getTeamFromAbbr(abbr);
  document.getElementById('tradeHalfPartner').className = '';
  document.getElementById('tradeHalfPartner').classList.add(cleanObj(team));
}

function changePick(sel,isTeam,index) {
  if (sel.value == '') {
    return;
  }
  if (isTeam) {
    var other = document.getElementsByClassName('partnerSel')[index];
  } else {
    var other = document.getElementsByClassName('teamSel')[index];
  }
  var i = getRoundAndPick(Number(sel.value)).r;
  other.selectedIndex = i;
}

function proposeTrade() {
  var pickSelected = false;
  var from  = [];
  var to = [];
  for (let sel of document.getElementsByClassName('teamSel')) {
    if (sel.value == '1') {
      error('1st overall pick cannot be traded');
      return;
    } else if (sel.value != '') {
      pickSelected = true;
      from.push(sel.value);
    }
  }
  for (let sel of document.getElementsByClassName('partnerSel')) {
    if (sel.value == '1') {
      error('1st overall pick cannot be traded');
      return;
    } else if (sel.value != '') {
      pickSelected = true;
      to.push(sel.value);
    }
  }
  if (!pickSelected) {
    error('Select a pick to trade');
    return;
  }
  var abbr = document.getElementById('tradeTeamSel').value;
  let mess = {method:'proposeDraftTrade',token:getCookie('token'),from:from,to:to,partner:abbr};
  ws.send(JSON.stringify(mess));
}

function renderTrade(trade) {
  //var box = buildElem('DIV','tradeBox',undefined,document.getElementsByClassName('page')[2]);
  var box = buildElem('DIV','tradeBox',undefined,document.getElementById('tradePage'));
  box.setAttribute('data-id',trade.id);
  var left = buildElem('DIV','tradeAction',undefined,box);
  if (trade.to == team) {
    var d = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
    var acc = buildSVG(d,'tradePickBtn','Accept Trade',left,true);
    acc.addEventListener('click',function() { acceptDraftTrade(this); });
    var dc = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';
    var dec = buildSVG(dc,'tradePickBtn','Decline Trade',left,true);
    dec.addEventListener('click',function() { negateDraftTrade(this); });
  } else {
    var d = 'M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z';
    var ret = buildSVG(d,'tradePickBtn','Retract Trade',left,true);
    ret.addEventListener('click',function() { negateDraftTrade(this); });
  }
  var fromHalf = buildElem('DIV','tradePicksHalf',undefined,box);
  fromHalf.classList.add(cleanObj(getTeamFromAbbr(trade.from)));
  buildElem('DIV','tradePicksRow',getTeamFromAbbr(trade.from).mascot,fromHalf);
  for (let pick of trade.fromPicks) {
    let x = getRoundAndPick(pick + 1);
    buildElem('DIV','tradePicksRow',`RD ${x.r} PK ${x.p} (${ordinal(pick + 1).toUpperCase()} OVERALL)`,fromHalf);
  }
  var toHalf = buildElem('DIV','tradePicksHalf',undefined,box);
  toHalf.classList.add(cleanObj(getTeamFromAbbr(trade.to)));
  buildElem('DIV','tradePicksRow',getTeamFromAbbr(trade.to).mascot,toHalf);
  for (let pick of trade.toPicks) {
    let x = getRoundAndPick(pick + 1);
    buildElem('DIV','tradePicksRow',`RD ${x.r} PK ${x.p} (${ordinal(pick + 1).toUpperCase()} OVERALL)`,toHalf);
  }
}

function acceptDraftTrade(elem) {
  var id = elem.parentElement.parentElement.getAttribute('data-id');
  ws.send(JSON.stringify({method:'acceptDraftTrade',id:id,token:getCookie('token')}));
}

function negateDraftTrade(elem) {
  var id = elem.parentElement.parentElement.getAttribute('data-id');
  ws.send(JSON.stringify({method:'negateDraftTrade',id:id}));
}

function updatePicks(adj) {
  for (let a of adj) {
    for (let elem of document.getElementById('right').children) {
      if (Number(elem.getAttribute('data-pick')) == a.pick + 1) {
        elem.textContent = `${elem.getAttribute('data-pick')}. ${a.abbr}`;
        elem.className = '';
        elem.classList.add(cleanObj(getTeamFromAbbr(a.abbr)));
      }
    }
  }
  for (let a of adj) {
    var row = document.getElementsByClassName('allRow')[a.pick];
    console.log(row,a.pick - 1);
    row.children[0].src = `logos/${cleanObj(getTeamFromAbbr(a.abbr))}.png`;
    row.className = '';
    row.classList.add('allRow',cleanObj(getTeamFromAbbr(a.abbr)));
  }
  for (let a of adj) {
    if (a.abbr == team) {
      var x = getRoundAndPick(a.pick + 1)
      document.getElementsByClassName('pickPos')[x.r - 1].textContent = `RD ${x.r} PK ${x.p} (${ordinal(a.pick + 1).toUpperCase()} OVERALL)`;
    }
  }
}

//sound & music

function toggleMusic() {
  if (music) {
    music = false;
    audio.pause();
    var d = 'M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z';
    document.getElementsByClassName('speaker')[0].children[0].setAttribute('d',d);
  } else {
    music = true;
    audio.volume = 1;
    audio.play();
    var d = 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z';
    document.getElementsByClassName('speaker')[0].children[0].setAttribute('d',d);
  }
}

function toggleChime() {
  if (chime) {
    chime = false;
    var d = 'M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z';
    document.getElementsByClassName('speaker')[1].children[0].setAttribute('d',d);
  } else {
    chime = true;
    var d = 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z';
    document.getElementsByClassName('speaker')[1].children[0].setAttribute('d',d);
  }
}

function startMusic() {
  if (!music) {
    return;
  }
  audio.volume = 0;
  audio.play();
  var vol = 0;
  var res = 50;
  var volInt = setInterval(function() {
    if (vol >= res) {
      clearInterval(volInt);
    } else {
      vol++;
      audio.volume = vol / res;
    }
  }, 100);
}

function announcePickSound() {
  if (!chime) {
    return;
  }
  var val = 100;
  var lim = 10;
  var decres = setInterval(function() {
    val -= 5;
    audio.volume = val / 100;
    if (val == lim) {
      clearInterval(decres);
      document.getElementById('chime').play();
      setTimeout(function() {
        var cres = setInterval(function() {
          val += 5;
          audio.volume = val / 100;
          if (val == 100) {
            clearInterval(cres);
          }
        }, Math.floor(500 / lim));
      }, 4500);
    }
  }, Math.floor(500 / lim));
}

function loadMusic() {
  var rand = Math.floor(Math.random() * 10);
  while (songBuffer.slice(songBuffer.length - 7,songBuffer.length).includes(rand)) {
    rand = Math.floor(Math.random() * 10);
  }
  songBuffer.push(rand);
  audio.src = `audio/music/song${rand}.mp3`;
  audio.play();
}

//resources

function capFirst(str) {
  return str.substring(0,1).toUpperCase() + str.substring(1,str.length);
}
