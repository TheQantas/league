window.onload = function() {
  getPlayCalls();
  document.getElementById('makeTradeCont').style.height = `${window.innerHeight}px`;
  teamAbbr = document.getElementById('roster').getAttribute('data-team');
  var rows = document.getElementsByClassName('teamPlayerRow');
  for (let row of rows) {
    let pos = row.getAttribute('data-i');
    teamRoster[pos] = {};
    teamRoster[pos].fName = row.getAttribute('data-fname');
    teamRoster[pos].lName = row.getAttribute('data-lname');
    teamRoster[pos].num = row.getAttribute('data-num');
    teamRoster[pos].pos = row.getAttribute('data-pos');
  }
  for (let sel of document.getElementsByClassName('makeTradeSelTeam')) {
    for (let attr in teamRoster) {
      player = teamRoster[attr];
      if (player.pos != 'FLX') {
        let opt = document.createElement('option');
        opt.text = `${player.fName} ${player.lName} (${player.pos}, #${player.num})`;
        opt.value = player.num;
        opt.setAttribute('data-pos',player.pos);
        sel.add(opt);
      }
    }
  }
  let mess = {method:'connectAsTeam',token:getCookie('token')};
  ws.send(JSON.stringify(mess));
};
var playCalls = [];
playCalls[0] = [0.5,0.5,0.5,0.5]; //offense
playCalls[1] = [0.5,0.5,0.5,0.5]; //defense
var temp;
var otherAbbr;
var teamAbbr;
var otherRoster;
var teamRoster = {};
var tradeRows = 0;
var dealViable = false;
var counteredDeal = false;
var counterOther = false;

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested') {
    if (response.type == 'roster') {
      //console.log(response.data);
      renderOppoRoster(response.data,response.crit);
    }
    //console.log('c');
  } else if (response.method == 'signOut') {
    signOut();
  } else if (response.method == 'confirmed') {
    temp = response.temp;
    document.getElementById('confirmPass').style.display = 'none';
    document.getElementById('changePass').style.display = 'block';
  } else if (response.method == 'passChanged') {
    document.getElementById('passTxt').textContent = 'Password changed';
  } else if (response.method == 'error') {
    if (response.type == '505') {
      location.reload();
      return false;
    } else if (response.type == 'changePass' || response.type == 'confirmPass') {
      document.getElementById('passTxt').textContent = response.mess;
    } else if (response.type == 'enable2fa' || response.type == 'verify2fa') {
      document.getElementById('factTxt').textContent = response.mess;
    } else if (response.type == 'emailValidate' || response.type == 'veriCode' || response.type == 'enableUpdates') {
      document.getElementById('eTxt').textContent = response.mess;
      if (response.success) {
        document.getElementById('emailOpt1').style.display = 'block';
        document.getElementById('emailOpt2').style.display = 'block';
        document.getElementById('emailReco').checked = true;
        document.getElementById('factReco').checked = false;
      }
    } else if (response.type == 'recoMethod') {
      document.getElementById('recTxt').textContent = response.mess;
      document.getElementById(response.to + 'Reco').checked = false;
      if (response.to == 'fact' && response.email == true) {
        document.getElementById('emailReco').checked = true;
      } else if (response.to == 'email' && response.fact == true) {
        document.getElementById('factReco').checked = true;
      }
    } else if (response.type == 'changePlayCalls') {
      let btns = document.getElementsByClassName('saveBtn');
      for (let btn of btns) {
        btn.classList.add('disabled');
        btn.textContent = 'Save Changes';
      }
      error(response.mess);
    } else {
      error(response.mess);
    }
  } else if (response.method == 'qr') {
    document.getElementById('appTxt').style.display = 'block';
    document.getElementById('qr').src = response.data;
    document.getElementById('qr').style.display = 'block';
    document.getElementById('enterTxt').style.display = 'block';
    document.getElementById('factCode').style.display = 'block';
  } else if (response.method == 'emailSent') {
    document.getElementById('eTxt').textContent = 'You have two minutes to enter the code sent to your email';
    document.getElementById('emailEnter').style.display = 'block';
    document.getElementById('veriEmail').textContent = 'Send New Code';
  } else if (response.method == 'newMethod') {
    console.log(response.to,response.from);
    document.getElementById(response.to + 'Reco').checked = true;
    document.getElementById(response.from + 'Reco').checked = false;
    document.getElementById('recTxt').textContent = 'Recovery method updated';
  } else if (response.method == 'activatedFromFlex' || response.method == 'releasedFromFlex' || response.method == 'claimedFromAgency') {
    renderPlayerRows(response.roster,document.getElementById('rosterHalfTeam'),true);
    if (response.open == false) {
      for (let svg of document.getElementsByClassName('freeAgencySign')) {
        if (!svg.classList.contains('disabled')) {
          svg.classList.add('disabled');
          let newTitle = document.createElementNS('http://www.w3.org/2000/svg','title');
          newTitle.textContent = 'You Do Not Have An Open Slot To Sign This Player';
          svg.append(newTitle);
        }
      }
    } else if (response.open == true) {
      let titles = document.querySelectorAll('.freeAgencySign title');
      titles.forEach(function(title) {
        if (title.textContent != 'Player Not Yet Available') {
          title.parentElement.classList.remove('disabled');
          title.remove();
        }
      });
    }
    if (response.num) {
      let table = document.getElementsByClassName('freeAgencyTable')[Number(response.num.substring(0,1))];
      for (let row of table.rows) {
        if (row.getAttribute('data-num') == response.num) {
          row.remove();
          break;
        }
      }
    }
  } else if (response.method == 'acceptedTrade') {
    renderPlayerRows(response.roster,document.getElementById('rosterHalfTeam'),true);
    if (response.mess) {
      error(response.mess);
    }
  } else if (response.method == 'proposedTrade') {
    resetTradeWindow();
    renderTrade(response.trade);
    if (response.trade.from == teamAbbr) {
      document.getElementById('makeTradeCont').style.display = 'none';
      changePage(2);
    } else {
      error('You have a new trade deal!');
    }
    counteredDeal = false;
  } else if (response.method == 'updateTrade') {
    updateTrade(response);
  } else if (response.method == 'hiddenTrade') {
    for (let box of document.getElementsByClassName('tradeBox')) {
      if (box.getAttribute('data-id') == response.id) {
        box.remove();
        return;
      }
    }
  } else if (response.method == 'changedPlayCalls') {
    playCalls[0] = response.calls.slice(0,4);
    playCalls[1] = response.calls.slice(4,8);
    document.getElementsByClassName('saveBtn')[response.i].textContent = 'Saved';
    setTimeout(() => {
      document.getElementsByClassName('saveBtn')[response.i].textContent = 'Save Changes';
      document.getElementsByClassName('saveBtn')[response.i].classList.add('disabled');
    },2000);
  }
}

function error(mess) {
  let cont = document.getElementById('errorCont');
  cont.style.display = 'flex';
  cont.children[0].textContent = mess;
  setTimeout(function() { cont.style.display = 'none'; },3000);
}

function getPlayCalls() {
  var conts = document.getElementsByClassName('sliderCont');
  var i = 0;
  for (let cont of conts) {
    let slider = cont.children[1];
    playCalls[Math.floor(i / 4)][i % 4] = Number((slider.value / 100).toFixed(2));
    i++;
  }
}

function checkPlayCalls(num) {
  document.getElementsByClassName('saveBtn')[num].textContent = 'Save Changes';
  if (checkIfSame(num)) {
    document.getElementsByClassName('saveBtn')[num].classList.add('disabled');
  } else {
    document.getElementsByClassName('saveBtn')[num].classList.remove('disabled');
  }
}

function checkIfSame(num) {
  var conts = document.getElementsByClassName('sliderCont');
  for (let i = num * 4; i < num * 4 + 4; i++) {
    let slider = conts[i].children[1];
    let val = Number((slider.value / 100).toFixed(2));
    if (playCalls[num][i % 4] !== val) {
      return false;
    }
  }
  return true;
}

function changePage(num) {
  var pages = document.getElementsByClassName('parent');
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

function getRoster() {
  ws.send(JSON.stringify({method:'request',type:'roster',crit:document.getElementById('rosterSel').value}));
}

function renderOppoRoster(players,abbr) {
  document.getElementById('proposeTrade').classList.remove('disabled');
  if (counteredDeal == false) {
    for (row of document.getElementsByClassName('makeTradeRow')) {
      row.style.display = 'none';
    }
  }
  tradeRows = 0;
  document.getElementById('addMorePlayers').classList.remove('disabled');
  document.getElementById('addMorePlayers').title = '';
  document.getElementById('pill').style.display = 'none';
  otherRoster = players;
  let i = 0;
  for (let sel of document.getElementsByClassName('makeTradeSelOther')) {
    while (sel.children.length > 1) {
      sel.removeChild(sel.lastChild);
    }
    for (let attr in otherRoster) {
      player = otherRoster[attr];
      if (player.pos != 'FLX') {
        let opt = document.createElement('option');
        opt.text = `${player.fName} ${player.lName} (${player.pos}, #${player.num})`;
        opt.value = player.num;
        opt.setAttribute('data-pos',player.pos);
        sel.add(opt);
      }
    }
    if (counterOther != false) {
      if (counterOther[i]) {
        sel.value = counterOther[i].num;
      }
    }
    i++;
  }
  if (counteredDeal == false) {
    for (let sel of document.getElementsByClassName('makeTradeSel')) {
      for (let opt of sel.children) {
        opt.selected = false;
      }
    }
  }
  otherAbbr = abbr;
  var par = document.getElementById('rosterHalfOppo');
  par.className = '';
  var oppo = getTeamFromAbbr(abbr);
  par.classList.add(getClassFromTeam(oppo));
  document.getElementById('rosterOppo').children[0].textContent = oppo.mascot;
  document.getElementById('rosterOppo').children[1].src = getLogoFromTeam(oppo);
  renderPlayerRows(players,par);
}

function renderPlayerRows(players,par,act) {
  while (par.children.length > 1) {
    par.removeChild(par.lastChild);
  }
  let attrs = {};
  attrs['qb'] = [{a:'acc',l:'<abbr title="Accuracy">Acc.</abbr>'},{a:'longAcc',l:'<abbr title="Accuracy Rate Over 20 Yards">Long Acc.</abbr>'},{a:'press',l:'<abbr title="Pressure">Press.</abbr>'}];
  attrs['rb'] = [{a:'yac',l:'<abbr title="Yards After Contact">YAC</abbr>'},{a:'elus',l:'<abbr title="Elusiveness">Elus.</abbr>'},{a:'speed',l:'Speed'}];
  attrs['wr'] = [{a:'recep',l:'<abbr title="Reception Rate">Recep.</abbr>'},{a:'longRecep',l:'<abbr title="Reception Rate Over 20 Yards">Long Recep.</abbr>'},{a:'speed',l:'Speed'}];
  attrs['te'] = [{a:'recep',l:'<abbr title="Reception Rate">Recep.</abbr>'},{a:'block',l:'Block'},{a:'speed',l:'Speed'}];
  attrs['de'] = [{a:'pressPerc',l:'<abbr title="Pressure Percentage">Press. Perc.</abbr>'},{a:'sack',l:'Sack'},{a:'speed',l:'Speed'}];
  attrs['lb'] = [{a:'pressPerc',l:'<abbr title="Pressure Percentage">Press. Perc.</abbr>'},{a:'sack',l:'Sack'},{a:'speed',l:'Speed'}];
  attrs['cb'] = [{a:'cover',l:'Cover'},{a:'int',l:'<abbr title="Interception">Int.</abbr>'},{a:'speed',l:'Speed'}];
  attrs['s'] = [{a:'cover',l:'Cover'},{a:'int',l:'<abbr title="Interception">Int.</abbr>'},{a:'speed',l:'Speed'}];
  attrs['k'] = [{a:'pat',l:'PAT'},{a:'fg',l:'FG'},{a:'longFg',l:'Long FG'}];
  attrs['p'] = [{a:'dist',l:'<abbr title="Punt Distance">Dist.</abbr>'},{a:'aware',l:'<abbr title="Awareness">Aware.</abbr>'},{a:'block',l:'Blocked'}];
  attrs['flx1'] = [];
  attrs['flx2'] = [];
  attrs['flx3'] = [];
  var flxs = ['flx1','flx2','flx3'];
  for (let pos in players) {
    if (pos == 'flx1') {
      buildElem('DIV','playerFlexHead','Flex Spots (Practice Squad)',par);
    }
    let player = players[pos];
    let newRow = buildElem('DIV','playerRow',undefined,par);
    newRow.classList.add('rosterRow')
    buildElem('DIV','playerPos',player.pos,newRow);
    let newCont = buildElem('DIV','playerCont',undefined,newRow);
    let newName = buildElem('DIV','playerName',undefined,newCont);
    if (player.num) {
      newName.innerHTML = `${player.fName} ${player.lName} <span class="playerNum">#${player.num}</span>`;
    } else {
      newName.innerHTML = `${player.fName} ${player.lName}`;
    }
    let newStat = buildElem('DIV','playerStat',undefined,newCont);
    let stats = [];
    if (!player.num) {
      continue;
    }
    stats[0] = `${attrs[player.pos.toLowerCase()][0].l}: ${JSON.parse(player.statA).m} (${JSON.parse(player.statA).s})`;
    stats[1] = `${attrs[player.pos.toLowerCase()][1].l}: ${JSON.parse(player.statB).m} (${JSON.parse(player.statB).s})`;
    stats[2] = `${attrs[player.pos.toLowerCase()][2].l}: ${JSON.parse(player.statC).m} (${JSON.parse(player.statC).s})`;
    newStat.innerHTML = `${stats[0]} | ${stats[1]} | ${stats[2]}`;
    if (act == true && flxs.includes(pos)) {
      let newOpt = buildElem('DIV','playerOpt',undefined,newCont);
      let newAct = buildElem('BUTTON','playerBtn','Activate',newOpt);
      newAct.addEventListener('click',function() { activate(this); });
      let newRel = buildElem('BUTTON','playerBtn','Release',newOpt);
      newRel.addEventListener('click',function() { this.nextElementSibling.style.display = 'flex'; });
      let newConf = buildElem('DIV','playerOptConf',undefined,newOpt);
      buildElem('DIV','playerRelConf','Are You Sure?',newConf);
      let newYes = buildElem('BUTTON','playerBtn','Yes',newConf);
      newYes.classList.add('relBtn');
      newYes.addEventListener('click',function() { release(this); });
      let newNo = buildElem('BUTTON','playerBtn','No',newConf);
      newNo.classList.add('relBtn');
      newNo.addEventListener('click',function() { this.parentElement.style.display = 'none'; });
    }
    if (act == true) {
      newRow.setAttribute('data-num',player.num);
      newRow.setAttribute('data-fname',player.fName);
      newRow.setAttribute('data-lname',player.lName);
      newRow.setAttribute('data-pos',player.pos);
      newRow.setAttribute('data-i',pos);
    }
  }
}

function changeFreePage(num) {
  var pages = document.getElementsByClassName('freeAgencyPage');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementsByClassName('freeAgencyBtn');
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function addTradeRow() {
  if (tradeRows == 3) {
    return;
  } else {
    tradeRows++;
  }
  document.getElementsByClassName('makeTradeRow')[tradeRows - 1].style.display = 'flex';
  document.getElementsByClassName('makeTradeRow')[tradeRows + 2].style.display = 'flex';
  if (tradeRows == 3) {
    document.getElementById('addMorePlayers').classList.add('disabled');
    document.getElementById('addMorePlayers').title = 'You can only have 3 players per team per trade';
  }
}

function minimize() {
  var par = document.getElementById('makeTradeCont');
  var h = par.offsetHeight;
  var iter = 0;
  var s = 20;
  var animate = setInterval(function() {
    par.style.opacity = 1 - iter / s;
    par.style.width = `${(s - iter) * (100 / s)}%`;
    par.style.height = `${h - h / s * iter}px`;
    if (iter == s) {
      clearInterval(animate);
      par.style.display = 'none';
      par.style.width = null;
      par.style.height = `${window.innerHeight}px`;
      par.style.opacity = 1;
      document.getElementById('pill').style.display = 'block';
      if (counteredDeal == false) {
        document.getElementById('pill').textContent = `Trade with ${otherAbbr}`;
      } else {
        document.getElementById('pill').textContent = `Counter to ${counteredDeal.from}`;
      }
    } else {
      iter++;
    }
  }, 8);
}

function maximize() {
  var par = document.getElementById('makeTradeCont');
  var h = window.innerHeight;
  var iter = 0;
  var s = 20;
  par.style.display = 'flex';
  par.style.height = '0px';
  document.getElementById('pill').style.display = 'none';
  var animate = setInterval(function() {
    par.style.opacity = iter / s;
    par.style.width = `${(iter) * (100 / s)}%`;
    par.style.height = `${h * iter / s}px`;
    if (iter == s) {
      clearInterval(animate);
    } else {
      iter++;
    }
  }, 8);
}

function closeTrade(elem) {
  document.getElementById('makeTradeCont').style.display = 'none';
  counteredDeal = false;
  resetTradeWindow();
}

function showTradeMaker() {
  if (!otherAbbr) {
    return;
  }
  document.getElementById('pill').style.display = 'none';
  document.getElementById('makeTradeCont').style.display = 'flex';
  var team = getTeamFromAbbr(teamAbbr);
  document.getElementById('makeTradeTeamHalf').className = '';
  document.getElementById('makeTradeTeamHalf').classList.add(getClassFromTeam(team));
  document.getElementsByClassName('makeTradeLogo')[0].src = getLogoFromTeam(team);
  document.getElementsByClassName('makeTradeName')[0].textContent = team.mascot;
  var other = getTeamFromAbbr(otherAbbr);
  document.getElementById('makeTradeOppoHalf').className = '';
  document.getElementById('makeTradeOppoHalf').classList.add(getClassFromTeam(other));
  document.getElementsByClassName('makeTradeLogo')[1].src = getLogoFromTeam(other);
  document.getElementsByClassName('makeTradeName')[1].textContent = other.mascot;
}

function changeTradePlayers(i,isTeam) {
  if (isTeam) {
    var elem = document.getElementsByClassName('makeTradeSelTeam')[i];
    var other = document.getElementsByClassName('makeTradeSelOther')[i];
    var tv = elem.value;
    var ov = other.value;
  } else {
    var other = document.getElementsByClassName('makeTradeSelTeam')[i];
    var elem = document.getElementsByClassName('makeTradeSelOther')[i];
    var tv = other.value;
    var ov = elem.value;
  }
  var pt = elem.children[elem.selectedIndex].getAttribute('data-pos');
  var po = other.children[other.selectedIndex].getAttribute('data-pos');
  if (pt != po) {
    let switched = false;
    for (let opt of other.children) {
      if (opt.getAttribute('data-pos') == pt && !switched) {
        opt.selected = true;
        switched = true;
      } else {
        opt.selected = false;
      }
    }
  }
  var chosen = false;
  var nps = ['NP0','NP1','NP2'];
  var btn = document.getElementById('proposeTradeBtn');
  for (let sel of document.getElementsByClassName('makeTradeSel')) {
    if (!nps.includes(sel.value)) {
      chosen = true;
      break;
    }
  }
  var conflicts = false;
  var ta = [];
  var oa = [];
  for (let sel of document.getElementsByClassName('makeTradeSelTeam')) {
    ta.push(sel.value);
  }
  for (let sel of document.getElementsByClassName('makeTradeSelOther')) {
    oa.push(sel.value);
  }
  if ((new Set(ta)).size !== ta.length || (new Set(oa)).size !== oa.length) {
    conflicts = true;
  }
  if (conflicts) {
    btn.classList.add('disabled');
    btn.title = 'You cannot have a player listed twice';
    dealViable = false;
  } else if (!chosen) {
    btn.classList.add('disabled');
    btn.title = 'You must choose a player to trade';
    dealViable = false;
  } else {
    btn.classList.remove('disabled');
    btn.title = '';
    dealViable = true;
  }
}

function showProposalConfirm() {
  if (dealViable) {
    document.getElementById('confirmProposal').style.display = 'flex';
  }
}

function resetTradeWindow() {
  for (let sel of document.getElementsByClassName('makeTradeSel')) {
    sel.selectedIndex = 0;
  }
  for (let row of document.getElementsByClassName('makeTradeRow')) {
    row.style.display = 'none';
  }
  tradeRows = 0;
}

function changePlayCalls(elem,i) {
  var hasChanged = false;
  for (let btn of document.getElementsByClassName('saveBtn')) {
    if (!btn.classList.contains('disabled')) {
      hasChanged = true;
      break;
    }
  }
  if (!hasChanged || elem.classList.contains('disabled')) {
    return;
  }
  var calls = [];
  for (let cont of document.getElementsByClassName('sliderCont')) {
    calls.push(Number(cont.children[1].value) / 100);
  }
  elem.textContent = 'Saving';
  let mess = {method:'changePlayCalls',calls:calls,token:getCookie('token'),i:i};
  ws.send(JSON.stringify(mess));
}

//roster mgmt

function activate(elem) {
  let num = elem.parentElement.parentElement.parentElement.getAttribute('data-num');
  let mess = {method:'activateFromFlex',token:getCookie('token'),num:num};
  ws.send(JSON.stringify(mess));
}

function release(elem) {
  let num = elem.parentElement.parentElement.parentElement.parentElement.getAttribute('data-num');
  let mess = {method:'releaseFromFlex',token:getCookie('token'),num:num};
  ws.send(JSON.stringify(mess));
}

function claim(elem) {
  if (elem.classList.contains('disabled')) {
    return;
  }
  var num = elem.parentElement.parentElement.getAttribute('data-num');
  let mess = {method:'claimFromAgency',token:getCookie('token'),num:num};
  ws.send(JSON.stringify(mess));
}

function proposeTrade() {
  var mess = {method:'proposeTrade',from:teamAbbr,to:otherAbbr,token:getCookie('token')};
  var teamPlayers = [];
  var otherPlayers = [];
  var invalid = ['NP0','NP1','NP2']
  for (let sel of document.getElementsByClassName('makeTradeSelTeam')) {
    if (sel.value && !invalid.includes(sel.value)) {
      teamPlayers.push(sel.value);
    }
  }
  for (let sel of document.getElementsByClassName('makeTradeSelOther')) {
    if (sel.value && !invalid.includes(sel.value)) {
      otherPlayers.push(sel.value);
    }
  }
  if (teamPlayers.length == 0 || otherPlayers.length == 0) {
    return;
  }
  if (teamPlayers.length != otherPlayers.length) {
    return;
  }
  document.getElementById('confirmProposal').style.display = 'none';
  mess.fromPlayers = teamPlayers;
  mess.toPlayers = otherPlayers;
  if (counteredDeal != false) {
    mess.counter = true;
    mess.id = counteredDeal.id;
  }
  ws.send(JSON.stringify(mess));
}

function renderTrade(trade) {
  var newBox = document.createElement('DIV');
  newBox.setAttribute('data-id',trade.id);
  newBox.classList.add('tradeBox');
  document.getElementById('tradeCont').prepend(newBox);
  var newTop = buildElem('DIV','tradeTop',undefined,newBox);
  var newStatus = buildElem('DIV','tradeStatus',trade.status.toUpperCase(),newTop);
  newStatus.classList.add(trade.status.toLowerCase());
  var newInfo = buildElem('DIV','tradeInfo',undefined,newTop);
  buildElem('DIV','tradeMeta',`${trade.date} ${trade.month} ${trade.year} ${trade.time}`,newInfo);
  buildElem('DIV','tradeMeta',`${trade.from} & ${trade.to}`,newInfo);
  var newRight = buildElem('DIV','tradeTopAbs',undefined,newTop);
  var newToggle = buildSVG('M19,13H5V11H19V13Z','tradeTopOpt','Toggle',newRight,true);
  newToggle.addEventListener('click',function() { toggle(this); });
  newToggle.setAttribute('data-hidden','false');
  var newHide = buildSVG('M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z','tradeTopOpt','Hide',newRight,true);
  newHide.addEventListener('click',function() { hide(this); });
  var newLower = buildElem('DIV','tradeLower',undefined,newBox);
  for (let i of ['from','to']) {
    let team = getTeamFromAbbr(trade[i]);
    let newHalf = buildElem('DIV','tradeLowerHalf',undefined,newLower);
    newHalf.classList.add(getClassFromTeam(team));
    let newHalfTop = buildElem('DIV','tradeLowerTop',undefined,newHalf);
    if (i == 'from') {
      let newLogo = buildElem('IMG','tradeTeamLogo',undefined,newHalfTop);
      newLogo.src = getLogoFromTeam(team);
      let newName = buildElem('DIV','tradeTeamName',team.mascot,newHalfTop);
      buildElem('DIV','tradeClarify',`${team.mascot} give & ${getTeamFromAbbr(trade.to).mascot} get`,newHalf);
    } else {
      let newName = buildElem('DIV','tradeTeamName',team.mascot,newHalfTop);
      newName.style.textAlign = 'right';
      let newLogo = buildElem('IMG','tradeTeamLogo',undefined,newHalfTop);
      newLogo.src = getLogoFromTeam(team);
      buildElem('DIV','tradeClarify',`${team.mascot} give & ${getTeamFromAbbr(trade.from).mascot} get`,newHalf);
    }
    for (let player of trade[`${i}Players`]) {
      let newRow = buildElem('DIV','tradeRow',undefined,newHalf);
      buildElem('DIV','tradePos',player.pos.toUpperCase(),newRow);
      let newNom = buildElem('DIV','tradeRowName',undefined,newRow);
      newNom.innerHTML = `${player.fName} ${player.lName} <span class="playerNum">#${player.num}</span>`;
    }
  }
  var newBot = buildElem('DIV','tradeBottom',undefined,newBox);
  newBot.setAttribute('data-id',trade.id);
  newBot.setAttribute('data-to',trade.to);
  newBot.setAttribute('data-from',trade.from);
  newBot.setAttribute('data-toplayers',JSON.stringify(trade.toPlayers));
  newBot.setAttribute('data-fromplayers',JSON.stringify(trade.fromPlayers));
  if (trade.status == 'countered') {
    buildElem('DIV','tradeCounter','This trade was countered. Counter is somewhere above.',newBox);
  } else if (trade.from == teamAbbr && trade.status == 'proposed') {
    let newRet = buildElem('BUTTON','tradeBtn','Retract',newBot);
    newRet.classList.add('retracted');
    newRet.addEventListener('click',function() { retract(this); });
  } else if (trade.status == 'proposed' || trade.status == 'counterproposal') {
    let newAcc = buildElem('BUTTON','tradeBtn','Accept',newBot);
    newAcc.classList.add('accepted','defOpt');
    newAcc.addEventListener('click',function() { show(this); });
    let newCou = buildElem('BUTTON','tradeBtn','Counter',newBot);
    newCou.classList.add('countered','defOpt');
    newCou.style.marginLeft = '5px';
    newCou.addEventListener('click',function() { counter(this); });
    let newDec= buildElem('BUTTON','tradeBtn','Decline',newBot);
    newDec.classList.add('declined','defOpt');
    newDec.style.marginLeft = '5px';
    newDec.addEventListener('click',function() { decline(this); });
    let newCan = buildElem('BUTTON','tradeBtn','Cancel',newBot);
    newCan.classList.add('cancel','confOpt');
    newCan.addEventListener('click',function() { cancel(this); });
    let newCon = buildElem('BUTTON','tradeBtn','Confirm',newBot);
    newCon.classList.add('accepted','confOpt');
    newCon.style.marginLeft = '5px';
    newCon.addEventListener('click',function() { accept(this); });
  }
}

function updateTrade(trade) {
  var cont;
  for (let box of document.getElementsByClassName('tradeBox')) {
    if (box.getAttribute('data-id') == trade.id) {
      cont = box;
      break;
    }
  }
  cont.children[0].children[0].textContent = trade.newStatus.toUpperCase();
  cont.children[0].children[0].classList.add(trade.newStatus);
  cont.children[2].remove();
  if (trade.newStatus == 'countered') {
    buildElem('DIV','tradeCounter','This trade was countered. Counter is somewhere above.',cont);
  }
}

function retract(elem) {
  var id = elem.parentElement.getAttribute('data-id');
  var mess = {method:'retractTrade',token:getCookie('token'),id:id};
  ws.send(JSON.stringify(mess));
}

function decline(elem) {
  var id = elem.parentElement.getAttribute('data-id');
  var mess = {method:'declineTrade',token:getCookie('token'),id:id};
  ws.send(JSON.stringify(mess));
}

function counter(elem) {
  var id = elem.parentElement.getAttribute('data-id');
  var to = elem.parentElement.getAttribute('data-to');
  var from = elem.parentElement.getAttribute('data-from');
  counteredDeal = {id:id,to:to,from:from};
  changePage(1);
  document.getElementById('rosterSel').value = from;
  otherAbbr = from;
  getRoster();
  resetTradeWindow();
  showTradeMaker();
  var toPlayers = JSON.parse(elem.parentElement.getAttribute('data-toplayers'));
  var fromPlayers = JSON.parse(elem.parentElement.getAttribute('data-fromplayers'));
  counterOther = fromPlayers;
  for (let i = 0; i < toPlayers.length; i++) {
    document.getElementsByClassName('makeTradeSelOther')[i].parentElement.parentElement.style.display = 'flex';
    tradeRows++;
  }
  for (let i = 0; i < toPlayers.length; i++) {
    let sel = document.getElementsByClassName('makeTradeSelTeam')[i];
    sel.value = toPlayers[i].num;
    sel.parentElement.parentElement.style.display = 'flex';
  }
}

function toggle(elem) {
  if (elem.getAttribute('data-hidden') == 'false') {
    var set = 'none';
    var d = 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z';
    elem.setAttribute('data-hidden','true');
  } else {
    var set = 'flex';
    var d = 'M19,13H5V11H19V13Z';
    elem.setAttribute('data-hidden','false');
  }
  var box = elem.parentElement.parentElement.parentElement;
  box.children[1].style.display = set;
  if (box.children[2]) {
    box.children[2].style.display = set;
  }
  elem.children[0].setAttribute('d',d);
}

function hide(elem) {
  var id = elem.parentElement.parentElement.parentElement.getAttribute('data-id');
  console.log(id);
  var mess = {method:'hideTrade',token:getCookie('token'),id:id};
  ws.send(JSON.stringify(mess));
}

function show(elem) {
  var cont = elem.parentElement;
  var set = ['none','none','none','block','block'];
  for (let i = 0; i < cont.children.length; i++) {
    cont.children[i].style.display = set[i];
  }
}

function cancel(elem) {
  var cont = elem.parentElement;
  var set = ['block','block','block','none','none'];
  for (let i = 0; i < cont.children.length; i++) {
    cont.children[i].style.display = set[i];
  }
}

function accept(elem) {
  var id = elem.parentElement.getAttribute('data-id');
  var mess = {method:'acceptTrade',token:getCookie('token'),id:id};
  ws.send(JSON.stringify(mess));
}

//sign in stuff

function signOut() {
  let mess = {method:'signOut',token:getCookie('token')};
  ws.send(JSON.stringify(mess));
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  document.cookie = 'board=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  location.reload();
  return false;
}

function univSignOut() {
  let mess = {method:'univSignOut',token:getCookie('token')};
  ws.send(JSON.stringify(mess));
}

function confirmPass() {
  let mess = {method:'confirmPass',token:getCookie('token'),password:document.getElementById('currPass').value};
  ws.send(JSON.stringify(mess));
}

function changePass() {
  let one = document.getElementById('newPass1').value;
  let two = document.getElementById('newPass2').value;
  if (one.length < 12) {
    document.getElementById('passTxt').textContent = 'Password must be at least 12 characters';
    return;
  }
  if (one != two) {
    document.getElementById('passTxt').textContent = 'Passwords must match';
    return;
  }
  let mess = {method:'changePass',token:getCookie('token'),password:one,temp:temp};
  ws.send(JSON.stringify(mess));
}

function enableFact() {
  ws.send(JSON.stringify({method:'enable2fa',token:getCookie('token')}));
}

function checkFact(val) {
  if (val.length == 6) {
    let mess = {method:'verify2fa',token:getCookie('token'),code:val};
    ws.send(JSON.stringify(mess));
  }
}

function getEmailCode() {
  var e = document.getElementById('emailInp').value;
  if (validateEmail(e)) {
    let mess = {method:'emailValidate',email:e,token:getCookie('token')};
    ws.send(JSON.stringify(mess));
  } else {
    document.getElementById('eTxt').textContent = 'Email is not valid';
  }
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function checkECode(val) {
  if (val.length == 6) {
    let mess = {method:'veriCode',token:getCookie('token'),code:val};
    ws.send(JSON.stringify(mess));
  }
}

function fakeSett(check) {
  if (check) {
    document.getElementById('eTxt').textContent = 'This is not an actual setting (Also, why would you select this?)';
  } else {
    document.getElementById('eTxt').textContent = '';
  }
}

function changeRecovery(from,to) {
  let mess = {method:'recoMethod',token:getCookie('token'),from:from,to:to};
  ws.send(JSON.stringify(mess));
}

function enableUpdates(x) {
  let mess = {method:'enableUpdates',token:getCookie('token'),x:x};
  ws.send(JSON.stringify(mess));
}
