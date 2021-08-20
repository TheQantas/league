ws.onmessage = message => {
  var response = JSON.parse(message.data);
  if (response.method == 'error') {
    if (response.type == '505') {
      location.reload();
    } else if (['changePass','verifyEmail','verifyCode','enable2fa','verify2fa','removeEmail','removeFactor'].includes(response.type)) {
      custom(response.text,response.type,response.good);
    } else {
      error(response.text);
    }
  } else if (response.method == 'tradeOffered') {
    if (response.to == document.body.getAttribute('data-abbr')) {
      error('You have a new trade offer!');
    }
    newTrade = response.trade;
    renderTrade(response.trade)
  } else if (response.method == 'tradeUpdate') {
    updateTrade(response);
  } else if (response.method == 'gottenChannel') {
    loadChannel(response.chats);
  } else if (response.method == 'postedMessage') {
    newMessage(response);
  } else if (response.method == 'gottenDelegates') {
    if (response.solo) {
      for (let d of response.dele) {
        updateDelegate(d);
      }
    } else {
      loadDelegates(response.gamesLeft,response.dele);
    }
  } else if (response.method == 'gottenOffense' || response.method == 'gottenDefense') {
    if (response.method == 'gottenOffense') {
      if (response.num == 0) {
        offPlays[response.playId] = response.play;
        if (response.play.type == 'pass') {
          toPass(response.play);
          //routes(response.play);
        } else {
          fromPass();
          ctx.clearRect(0,0,document.getElementById('routeCanvas').width,document.getElementById('routeCanvas').height);
        }
      }
    } else { //defense
      if (response.num == 1) {
        defPlays[response.playId] = response.play;
      }
    }
    loadPlayPage(response.play,response.num,response.roster);
  } else if (response.method == 'searched') {
    renderSearch(response.matches,response.canTrade,response.canSign);
  } else if (response.method == 'updateDelegate') {
    updateDelegate(response.delegate);
  } else if (response.method == 'negotiated') {
    document.getElementById('callAni').style.display = 'none';
    document.getElementById('callResult').style.display = 'block';
    if (response.success) {
      document.getElementById('callResult').textContent = 'Negotiation Sucessful';
    } else {
      document.getElementById('callResult').textContent = 'Negotiation Unsucessful';
    }
    for (let d of response.deles) {
      updateDelegate(d);
    }
    setTimeout(() => { document.getElementById('negoCont').style.display = 'none'; },1500);
  } else if (response.method == 'updatePlayer') {
    updatePlayer(response.player);
  } else if (response.method == 'gottenFullRoster') {
    fullRoster = response.players;
  } else if (response.method == 'signOut') {
    signOut();
  } else if (response.method == 'qr') {
    document.getElementById('factorCodeCont').style.display = 'flex';
    document.getElementById('qrCont').style.display = 'flex';
    document.getElementById('qrCode').src = response.data;
  } else if (response.method == 'gottenCodes') {
    let cells = document.getElementsByClassName('codeCell');
    for (let i = 0; i < cells.length; i++) {
      cells[i].style.display = 'block';
      cells[i].textContent = response.codes[i];
    }
  } else if (response.method == 'gottenAssets') {
    handleAssets(response);
  } else if (response.method == 'brokenDown') {
    updateRoster(response.breakdown,response.spending);
  }
}

window.onload = () => {
  ctx = document.getElementById('routeCanvas').getContext('2d');
  if (document.getElementById('chatMain')) {
    document.getElementById('chatMain').addEventListener('keydown',function(e) {
      var evtobj = window.event ? event : e;
      if (evtobj.keyCode == 13 && evtobj.ctrlKey) {
        post();
      }
    });
  }
  setInterval(() => {
    ws.mail({method:'getDelegates',solo:true});
  },1000*60);
}

ws.onopen = () => {
  ws.mail({method:'connectAsTeam',needed:true});
}

//roster & players

function updateRoster(list,spend) {
  if (spend > 200000) {
    document.getElementById('overTheCap').style.display = 'block';
  } else {
    document.getElementById('overTheCap').style.display = 'none';
  }
  document.getElementById('diagram').innerHTML = '';
  document.getElementById('gridCont').innerHTML = '';
  document.getElementById('gridLowerCont').innerHTML = '';
  var offset = 0;
  var ids = [];
  for (let i = 0, item = list[0] ; i < list.length; i++, item = list[i]) {
    if (item.id) {
      ids.push(item.id);
    }
    let rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',`${offset}%`);
    rect.setAttribute('width',`${item.perc}%`);
    rect.setAttribute('height',150);
    rect.setAttribute('fill',item.color);
    rect.onmouseover = function() { showGridPage(i); }
    document.getElementById('diagram').append(rect);
    offset += item.perc;
    let grid = buildElem('DIV','gridPage',undefined,document.getElementById('gridCont'));
    if (i == 0) {
      grid.style.display = 'grid';
    }
    let name = buildElem('DIV','gridCell',undefined,grid);
    name.innerHTML = item.name;
    if (item.type == 'player') {
      buildElem('DIV','gridCell','Cap Hit:',grid);
    } else {
      buildElem('DIV','gridCell','Amount:',grid);
    }
    buildElem('DIV','gridCell',item.render,grid);
    buildElem('DIV','gridCell','Percent:',grid);
    buildElem('DIV','gridCell',`${item.frac.toFixed(2)}%`,grid);
    if (item.type == 'player') {
      buildElem('DIV','gridCell','Base:',grid);
      buildElem('DIV','gridCell',item.renderBase,grid);
      buildElem('DIV','gridCell','Guaranteed:',grid);
      buildElem('DIV','gridCell',item.renderGuar,grid);
      renderPlayerRow(item,document.getElementById('gridLowerCont'),true);
    }
  }
  for (let play in offPlays) {
    for (let attr in offPlays[play]) {
      if (['name','wr1r','wr2r','ter','type','cases','first','second','third'].includes(offPlays[play][attr])) {
        continue;
      }
      if (!ids.includes(offPlays[play][attr])) {
        offPlays[play][attr] = '';
      }
    }
  }
  for (let play in defPlays) {
    for (let attr in defPlays[play]) {
      if (['name','wr1r','wr2r','ter','type','cases','first','second','third'].includes(defPlays[play][attr])) {
        continue;
      }
      if (!ids.includes(defPlays[play][attr])) {
        defPlays[play][attr] = '';
      }
    }
  }
  for (let e of document.getElementsByClassName('playerSel')) {
    if (!ids.includes(e.value)) {
      e.value = 'none';
    }
  }
}

function changePosition(pos) {
  let a = ['A','B','C','D'];
  for (let i = 0; i < 4; i++) {
    document.getElementById(`sel${a[i]}`).placeholder = attrs[pos][i].ln;
    document.getElementById(`sel${a[i]}`).value = '';
  }
}

function search() {
  let req = {method:'search'};
  let ids = ['selPos','selTeam','selDraft','selId','selA','selB','selC','selD','selName','selBase','selGuar'];
  let att = ['pos','team','draftable','id','a','b','c','d','name','base','guar'];
  for (let i = 0, d = ids[0], a = att[0]; i < ids.length; i++, d = ids[i], a = att[i]) {
    let v = document.getElementById(d).value;
    if (v != '') {
      req[a] = v;
    }
  }
  ws.mail(req);
}

function renderSearch(list,trade,sign) {
  document.getElementById('searchCont').innerHTML = '';
  for (let p of list) {
    renderPlayerRow(p,document.getElementById('searchCont'),false,trade,sign);
  }
}

function sort() {
  for (let e of document.getElementsByClassName('sortRow')) {
    if (document.getElementById('selPos').value != e.getAttribute('data-pos')) {
      e.style.display = 'none';
      continue; //
    }
    if (document.getElementById('selTeam').value != e.getAttribute('data-team') && document.getElementById('selTeam').value != 'ALL') {
      e.style.display = 'none';
      continue; //
    }
    if (Number(document.getElementById('selBase').value) < Number(e.getAttribute('data-base')) && document.getElementById('selBase').value != '') {
      e.style.display = 'none';
      continue; //
    }
    if (Number(document.getElementById('selGuar').value) < Number(e.getAttribute('data-guar')) && document.getElementById('selGuar').value != '') {
      e.style.display = 'none';
      continue; //
    }
    if (document.getElementById('selDraft').value != e.getAttribute('data-able') && document.getElementById('selDraft').value != 'ANY') {
      e.style.display = 'none';
      continue; //
    }
    if (e.getAttribute('data-id').toLowerCase().indexOf(document.getElementById('selId').value.toLowerCase()) == -1) {
      e.style.display = 'none';
      continue; //
    }
    if (e.getAttribute('data-name').toLowerCase().indexOf(document.getElementById('selName').value.toLowerCase()) == -1) {
      e.style.display = 'none';
      continue; //
    }
    let match = true;
    let al = attrs[document.getElementById('selPos').value];
    let pa = Number(e.getAttribute('data-stat1'));
    let pb = Number(e.getAttribute('data-stat2'));
    let pc = Number(e.getAttribute('data-stat3'));
    let pd = Number(e.getAttribute('data-stat4'));
    let sa = Number(document.getElementById('selA').value);
    let sb = Number(document.getElementById('selB').value);
    let sc = Number(document.getElementById('selC').value);
    let sd = Number(document.getElementById('selD').value);
    let pl = [pa,pb,pc,pd];
    let sl = [sa,sb,sc,sd];
    for (let i = 0, a = al[0], p = pl[0], s = sl[0]; i < al.length; i++, a = al[i], p = pl[i], s = sl[i]) {
      if (s == 0) {
        continue;
      }
      if (a.flip) {
        p = -p;
        s = -s;
      }
      if (p < s) {
        match = false;
        e.style.display = 'none';
        break;
      }
    }
    if (!match) {
      continue;
    }
    e.style.display = 'block';
  }
}

function inquire(elem) {
  var row = elem.parentElement.parentElement.parentElement;
  var abbr = row.getAttribute('data-team');
  var id = row.getAttribute('data-id');
  var name = row.getAttribute('data-name');
  var pos = row.getAttribute('data-pos');
  document.getElementById('sortPage').style.display = 'none';
  document.getElementById('chatCont').style.display = 'block';
  document.getElementById('sortBtn').style.textDecoration = 'none';
  document.getElementById('chatBtn').style.textDecoration = 'underline';
  showChat(abbr);
  document.getElementById('chatBox').value = `I wanted to talk to you about ${name} (${pos} #${id}).`;
}

function offerPlayerTrade(elem) {
  var abbr = elem.parentElement.parentElement.parentElement.getAttribute('data-team');
  getAssets(abbr);
  document.getElementById('tradeSel').value = abbr;
  document.getElementById('sortPage').style.display = 'none';
  document.getElementById('tradeCont').style.display = 'block';
  document.getElementById('sortBtn').style.textDecoration = 'none';
  document.getElementById('tradeBtn').style.textDecoration = 'underline';
  makeTrade();
}

function updatePlayer(p) {
  if (contract.id == p.id && p.id != 'UFA' && p.team != document.body.getAttribute('data-abbr')) {
    error(`This player was just taken by the ${getAttrFromAbbr('mascot',p.team)}`);
  }
  if (document.getElementById(`player${p.id}`)) {
    let el = document.getElementById(`player${p.id}`);
    el.children[0].innerHTML = `<img src="logos/${p.clean}_g.png"> ${p.fName} ${p.lName}&nbsp;<span class="num">(${p.pos} #${p.id})</span>&nbsp;${decodeEntities('&middot;')}&nbsp;${p.mascot}`;
    let g = el.querySelector('.playerBot');
    g.children[23].textContent = p.renderBase;
    g.children[25].textContent = p.renderGuar;
    g.children[27].textContent = p.renderSalary;
    g.children[29].textContent = p.ws;
    g.children[37].textContent = p.mascot;
  }
  if (p.team == document.body.getAttribute('data-abbr')) {
    renderPlayerRow(p,document.getElementById('gridLowerCont'),true);
  }
}

//nego

var contract = {};
var callAni = false;

function negotiate(elem) {
  ws.mail({method:'getDelegates'});
  let e = elem.parentElement.parentElement.parentElement;
  if (e.getAttribute('data-able') == '1') {
    return error('You cannot negotiate with a draftable player');
  }
  document.body.style.overflowY = 'hidden';
  document.getElementById('negoCont').style.display = 'flex';
  document.getElementById('negoCont').children[0].style.display = 'block';
  document.getElementById('negoCont').children[1].style.display = 'none';
  document.getElementById('negoName').innerHTML = `${e.getAttribute('data-name')} <span class="num">(${e.getAttribute('data-pos')} #${e.getAttribute('data-id')})</span>`;
  let g = document.getElementById('negoContract');
  contract.oldBase = Number(e.getAttribute('data-base'));
  contract.oldGuar = Number(e.getAttribute('data-guar'));
  contract.oldDura = Number(e.getAttribute('data-dura'));
  contract.newBase = Number(e.getAttribute('data-base'));
  contract.newGuar = Number(e.getAttribute('data-guar'));
  contract.newDura = Number(e.getAttribute('data-dura'));
  contract.ego = Number(e.getAttribute('data-ego'));
  contract.id = e.getAttribute('data-id');
  g.children[3].textContent = renderAmount(contract.oldBase);
  g.children[5].children[0].value = contract.oldBase;
  g.children[6].textContent = renderAmount(contract.oldGuar);
  g.children[8].children[0].value = contract.oldGuar;
  g.children[9].textContent = contract.oldDura;
  let s = contract.oldDura * contract.oldBase;
  g.children[12].textContent = renderAmount(contract.oldGuar + s);
  g.children[15].textContent = renderAmount(contract.oldGuar * 1.5 + s);
}

function loadDelegates(left,list) {
  document.getElementById('negoContract').children[11].textContent = left;
  for (let i = 0; i < 20; i++) {
    let el = document.getElementById(`negoDele${i}`);
    let de = list[i];
    el.setAttribute('data-level',de.level);
    el.querySelector('.deleDesc').textContent = `Agent #${i + 1} (Level ${de.level})`;
    if (de.frozen) {
      el.style.display = 'none';
      el.querySelector('input').checked = false;
    } else {
      el.style.display = 'flex';
    }
  }
  updateContract();
}

function updateContract() {
  contract.newDura = Number(document.getElementById('negoLeft').textContent);
  contract.newBase = Number(document.getElementById('negoBase').value);
  contract.newGuar = Number(document.getElementById('negoGuar').value);
  if (contract.newGuar < contract.oldGuar) {
    setTimeout(() => {
      if (Number(document.getElementById('negoGuar').value) < contract.oldGuar) {
        error('You cannot negotiate for less guaranteed money');
      }
    },300);
  }
  if (contract.newBase < 25) {
    setTimeout(() => {
      if (Number(document.getElementById('negoBase').value) < 25) {
        error('You must pay players at least $25K per week');
      }
    },300);
  }
  let g = document.getElementById('negoContract');
  let newVal = contract.newBase * contract.newDura + contract.newGuar * 1.5;
  g.children[14].textContent = renderAmount(contract.newBase * contract.newDura + contract.newGuar);
  g.children[17].textContent = renderAmount(newVal);
  g.children[19].textContent = renderAmount((contract.oldDura - contract.newDura) * contract.oldBase);
  let d = objDifficulty(contract);
  if (d <= 0) {
    g.children[21].textContent = '0.00';
    updateChance(0);
  } else {
    g.children[21].textContent = d.toFixed(2);
    updateChance(d);
  }
}

function updateChance(diff) {
  if (diff == undefined) {
    diff = objDifficulty(contract);
  }
  if (diff == 0) {
    document.getElementById('negoChancePerc').textContent = '100%';
  } else {
    let total = 0;
    for (let e of document.getElementsByClassName('negoCheck')) {
      if (e.children[1].checked) {
        total += power(Number(e.parentElement.getAttribute('data-level')));
      }
    }
    let p = total / diff * 100;
    p = (p>100)?100:p;
    document.getElementById('negoChancePerc').textContent = `${p.toFixed(2)}%`;
  }
}

function objDifficulty(o) {
  return difficulty(o.oldBase,o.oldGuar,o.oldDura,o.newBase,o.newGuar,o.newDura,o.ego);
}

function difficulty(ob,og,od,nb,ng,nd,ego) {
  let ov = ob * od + og * 1.5, nv = nb * nd + ng * 1.5;
  let a = ov ** 2 * (Math.log(ego) + 1.1) / nv ** 2;
  let b = (ov - nv) / 1e5;
  let d = a * 2 + b * 3;
  if (ob == nb && og == ng) {
    d /= 5;
  }
  return d;
}

function closeNego() {
  document.getElementById('negoCont').style.display = 'none';
  document.body.style.overflowY = 'auto';
}

function startNego() {
  let req = {method:'negotiate'};
  req.id = contract.id;
  req.contract = {base:contract.newBase,guar:contract.newGuar,dura:contract.newDura};
  req.deles = [];
  for (let i = 0; i < 20; i++) {
    if (document.getElementById(`negoDele${i}`).querySelector('input').checked) {
      req.deles.push(i);
    }
  }
  if (req.deles.length == 0) {
    return error('You must select at least one agent');
  }
  ws.mail(req);
  document.getElementById('negoCont').children[0].style.display = 'none';
  document.getElementById('negoCont').children[1].style.display = 'block';
  if (callAni !== false) {
    clearInterval(callAni);
  }
  let a = 0;
  document.getElementById('callAni').style.display = 'block';
  document.getElementById('callResult').style.display = 'none';
  callAni = setInterval(() => {
    for (let i = 0; i < 5; i++) {
      let ball = document.getElementById('callAni').children[0].children[i];
      ball.style.top = `${16 * Math.cos(1.5 * Math.PI * i - a) + 32}px`;
    }
    a += 0.2;
  },50);
}

function release(elem) {
  ws.mail({method:'releasePlayer',id:elem.parentElement.parentElement.parentElement.getAttribute('data-id')});
}

//plays

var offPlays = {};
var defPlays = {};
var fullRoster;
var currOffPlay;
var currDefPlay;

function getOffense(val) {
  let play = document.getElementById('defPlaySelect').value;
  if (play == '') {
    return error('You must choose a play to load an offense');
  }
  ws.mail({method:'getOffense',abbr:val,play:play,num:1});
}

function changeDefPlay(val) {
  if (!fullRoster) {
    ws.mail({method:'getFullRoster'});
  }
  currDefPlay = val;
  if (defPlays[currDefPlay]) {
    let roster = [];
    for (let p of fullRoster) {
      roster.push(p.id);
    }
    loadPlayPage(defPlays[currDefPlay],1,roster);
    return;
  }
  ws.mail({method:'getDefense',abbr:document.body.getAttribute('data-abbr'),play:val,num:1});
  let off = document.getElementById('defTeamSelect').value;
  if (off == '') {
    return;
  }
  ws.mail({method:'getDefense',abbr:off,play:val,num:1});
}

function getDefense(val) {
  let play = document.getElementById('offPlaySelect').value;
  if (play == '') {
    return error('You must choose a play to load a defense');
  }
  ws.mail({method:'getDefense',abbr:val,play:play,num:0});
}

function changeOffPlay(val) {
  if (!fullRoster) {
    ws.mail({method:'getFullRoster'});
  }
  currOffPlay = val;
  if (offPlays[currOffPlay]) {
    let roster = [];
    for (let p of fullRoster) {
      roster.push(p.id);
    }
    loadPlayPage(offPlays[currOffPlay],0,roster);
    //routes(offPlays[currOffPlay]);
    if (offPlays[currOffPlay].type == 'pass') {
      toPass(offPlays[currOffPlay]);
    } else {
      fromPass();
    }
    return;
  }
  ws.mail({method:'getOffense',abbr:document.body.getAttribute('data-abbr'),play:val,num:0});
  let def = document.getElementById('offTeamSelect').value;
  if (def == '') {
    return;
  }
  ws.mail({method:'getDefense',abbr:def,play:val,num:0});
}

function loadPlayPage(play,num,roster) {
  roster.sort();
  for (let s in play) {
    if (['name','wr1r','wr2r','ter','type','cases','first','second','third'].includes(s)) {
      continue;
    }
    let cell = document.getElementById(`${s}Cell${num}`).children[0];
    let cls = getAttrFromAbbr('clean',document.body.getAttribute('data-abbr'));
    if (['qb','rb','wr1','wr2','te','ol1','ol2'].includes(s) && num == 1) {
      cls = getAttrFromAbbr('clean',document.getElementById('defTeamSelect').value);
    } else if (!['qb','rb','wr1','wr2','te','ol1','ol2'].includes(s) && num == 0) {
      cls = getAttrFromAbbr('clean',document.getElementById('offTeamSelect').value);
    }
    updatePlayerCell(cell,play[s],cls,roster);
  }
}

function updatePlayerCell(cell,player,cls,roster) {
  cell.parentElement.classList.remove('dis');
  cell.parentElement.classList.remove('ovr');
  if (cls) {
    cell.className = cls;
  }
  if (player == undefined || player == '') {
    player = {id:'None',fName:'None',lName:''};
  }
  cell.children[0].textContent = `${player.fName.charAt(0)}. ${player.lName}`;
  if (cell.children[1].nodeName == 'SELECT' && roster) {
    while (cell.children[1].children.length > 1) {
      cell.children[1].lastChild.remove();
    }
    for (let id of matchingPos(player.id,roster)) {
      let opt = document.createElement('OPTION');
      opt.textContent = `#${id}`;
      opt.value = id;
      if (player.id == id) {
        opt.selected = true;
      }
      cell.children[1].append(opt);
    }
  } else if (cell.children[1].nodeName == 'DIV') {
    cell.children[1].textContent = `#${player.id}`;
  }
  cell.children[2].textContent = player.pos;
  let ranks = cell.parentElement.querySelectorAll('.ranking');
  cell.parentElement.setAttribute('data-id',player.id);
  for (let i = 0; i < 4; i++) {
    let t = player[`stat${i+1}`];
    ranks[i].className = `ranking alt ${t.r.cls}`;
    ranks[i].textContent = t.r.abbr;
    ranks[i].title = t.r.name;
    ranks[i].parentElement.previousElementSibling.textContent = t.m;
    ranks[i].parentElement.previousElementSibling.previousElementSibling.innerHTML = t.h;
  }
}

function preventConflict(elem) {
  updatePlayerCell(elem.parentElement,getPlayer(elem.value),undefined,undefined);
  let x = elem.parentElement.parentElement.id;
  x = x.substring(0,x.length-5);
  if (elem.classList.contains('off')) {
    var arr = document.querySelectorAll('select.playerSel.off');
    offPlays[currOffPlay][x] = getPlayer(elem.value);
  } else {
    var arr = document.querySelectorAll('select.playerSel.def');
    defPlays[currDefPlay][x] = getPlayer(elem.value);
  }
  for (let el of arr) {
    if (el.value == elem.value && el != elem) {
      el.selectedIndex = 0;
      el.parentElement.parentElement.classList.add('dis','ovr');
      el.previousElementSibling.textContent = 'None';
      let y = el.parentElement.parentElement.id;
      y = y.substring(0,y.length-5);
      if (elem.classList.contains('off')) {
        offPlays[currOffPlay][y] = '';
      } else {
        defPlays[currDefPlay][y] = '';
      }
    }
  }
}

function changeRoute(elem) {
  offPlays[currOffPlay][elem.id] = elem.value;
  routes(offPlays[currOffPlay]);
}

function routes(play) {
  if (!play) {
    return;
  }
  ctx.clearRect(0,0,document.getElementById('routeCanvas').width,document.getElementById('routeCanvas').height);
  for (let o of ['first','second','third']) {
    if (play[o] != '' && play[o] != undefined) {
      document.getElementById(`${play[o]}o`).value = o;
    }
  }
  let y = {wr1r:50,wr2r:450,ter:350};
  ctx.strokeStyle = 'red';
  ctx.fillStyle = 'red';
  ctx.lineWidth = 3;
  for (let r of ['wr1r','wr2r','ter']) {
    if (play[r] == '' || play[r] == undefined) {
      document.getElementById(r).selectedIndex = 0;
      continue;
    }
    document.getElementById(r).value = play[r];
    ctx.beginPath();
    ctx.moveTo(200,y[r]);
    if (play[r] == 'slant') {
      ctx.lineTo(400,y[r]);
    } else if (play[r] == 'go') {
      ctx.lineTo(1000,y[r]);
    } else {
      ctx.lineTo(700,y[r]);
    }
    if (play[r] == 'post' || play[r] == 'corner') {
      let dy = 200;
      if ((play[r] == 'post' && y[r] > 250) || (play[r] == 'corner' && y[r] < 250)) {
        dy *= -1;
      }
      ctx.lineTo(900,y[r] + dy);
    } else if (play[r] == 'slant') {
      if (y[r] > 250) {
        ctx.lineTo(500,y[r] - 170);
      } else {
        ctx.lineTo(500,y[r] + 170);
      }
    } else if (play[r] == 'out' || play[r] == 'in') {
      let dy = 200;
      if ((play[r] == 'in' && y[r] > 250) || (play[r] == 'out' && y[r] < 250)) {
        dy *= -1;
      }
      ctx.lineTo(700,y[r] + dy);
    }
    ctx.stroke();
    ctx.closePath();
  }
}

function changeRead(elem) {
  let ids = ['wr1o','wr2o','teo'];
  let used = {first:false,second:false,third:false};
  for (let id of ids) {
    used[document.getElementById(id).value] = true;
  }
  for (let a in used) {
    if (used[a] == false) {
      var unused = a;
      break;
    }
  }
  for (let id of ids) {
    let sel = document.getElementById(id);
    if (sel.value == elem.value && sel != elem) {
      sel.value = unused;
      break;
    }
  }
}

function toPass(play) {
  document.getElementById('playsName').style.display = 'block';
  document.getElementById('playsName').value = play.name;
  for (let el of document.getElementsByClassName('passSpot')) {
    el.classList.remove('hide');
  }
  routes(play);
}

function fromPass() {
  document.getElementById('playsName').style.display = 'none';
  for (let el of document.getElementsByClassName('passSpot')) {
    el.classList.add('hide');
  }
  ctx.clearRect(0,0,document.getElementById('routeCanvas').width,document.getElementById('routeCanvas').height);
}

function updatePlayName(str) {
  if (offPlays[currOffPlay]) {
    if (str.length > 10) {
      str = str.substring(0,10);
      document.getElementById('playsName').value = str;
    }
    offPlays[currOffPlay].name = str;
  }
}

function save() {
  let cs = ['1s','1m','1l','1e','2s','2m','2l','2e','3s','3m','3l','3e','4s','4m','4l','4e','2p'];
  let cases = {};
  for (let c of cs) {
    cases[c] = document.getElementById(`call${c}`).value;
  }
  var sp = ['SFG','LFG','PAT','KICK','RET','PUNTRET','PUNT'];
  var spe = {};
  for (let s of sp) {
    let id = document.getElementById(`call${s}`).value;
    if (s == 'SFG') {
      spe.fg = {k:id};
    } else if (s == 'LFG') {
      spe.longFg = {k:id};
    } else if (s == 'PAT') {
      spe.pat = {k:id};
    } else if (s == 'KICK') {
      spe.kickoff = {k:id};
    } else if (s == 'RET') {
      spe.return = {rb:id};
    } else if (s == 'PUNTRET') {
      spe.puntReturn = {rb:id};
    } else {
      spe.punt = {p:id};
    }
  }
  ws.mail({method:'savePlays',off:offPlays,def:defPlays,spe:spe,cases:cases});
}

//delegates

function unfreeze(elem) {
  let cont = elem.parentElement.parentElement;
  cont.classList.toggle('hide');
  cont.nextElementSibling.classList.toggle('hide');
}

function upgrade(elem) {
  let cont = elem.parentElement.parentElement;
  cont.classList.toggle('hide');
  cont.nextElementSibling.nextElementSibling.classList.toggle('hide');
}

function cancelFreeze(elem) {
  let cont = elem.parentElement;
  cont.classList.toggle('hide');
  cont.previousElementSibling.classList.toggle('hide');
}

function cancelUpgrade(elem) {
  let cont = elem.parentElement;
  cont.classList.toggle('hide');
  cont.previousElementSibling.previousElementSibling.classList.toggle('hide');
}

function upgradeDelegate(elem) {
  let index = Number(elem.parentElement.parentElement.getAttribute('data-index'));
  cancelUpgrade(elem);
  ws.mail({method:'upgradeDelegate',index:index});
}

function unfreezeDelegate(elem) {
  let index = Number(elem.parentElement.parentElement.getAttribute('data-index'));
  cancelFreeze(elem);
  ws.mail({method:'unfreezeDelegate',index:index});
}

function updateDelegate(dele) {
  let elem = document.getElementById(`dele${dele.i}`);
  elem.querySelector('.deleInv').textContent = dele.render;
  elem.querySelector('.deleLvl').textContent = dele.level;
  elem.querySelector('.deleTime').textContent = dele.timeout;
  elem.querySelector('.askUnfreeze').textContent = `Unfreeze agent for ${dele.bail} against the cap?`;
  let lvl = dele.level + 1;
  lvl = (lvl>5)?5:lvl;
  elem.querySelector('.askUpgrade').textContent = `Upgrade agent to level ${lvl} for $25K?`;
  if (dele.frozen == true) {
    elem.querySelector('.freezeBtn').style.display = 'block';
    document.getElementById(`negoDele${dele.i}`).style.display = 'none';
    document.getElementById(`negoDele${dele.i}`).querySelector('input').checked = false;
  } else {
    elem.querySelector('.freezeBtn').style.display = 'none';
    document.getElementById(`negoDele${dele.i}`).style.display = 'block';
  }
  document.getElementById(`negoDele${dele.i}`).querySelector('.deleDesc').textContent = `Delegate ${dele.i + 1} (Level ${dele.level})`;
  if (dele.level >= 5) {
    elem.querySelector('.upgradeBtn').style.display = 'none';
  } else {
    elem.querySelector('.upgradeBtn').style.display = 'block';
  }
}

//resources

var timeouts = {};

function custom(mess,type,good) {
  let cont = document.getElementById(`${type}Error`);
  if (mess == 'hide') {
    return cont.style.display = 'none';
  }
  cont.style.display = 'block';
  cont.textContent = mess;
  if (good) {
    cont.style.backgroundColor = 'var(--green)';
  } else {
    cont.style.backgroundColor = 'var(--pink)';
  }
  if (timeouts[type]) {
    clearTimeout(timeouts[type]);
  }
  timeouts[type] = setTimeout(function() { cont.style.display = 'none'; },3000);
}

function getPlayer(id) {
  if (!fullRoster) {
    throw 'No roster';
  }
  for (let p of fullRoster) {
    if (p.id == id) {
      return p;
    }
  }
}

function power(lvl) {
  return 1.5 / Math.log(5) * Math.log(lvl) + 0.5;
}

function showGridPage(num) {
  var p = document.getElementsByClassName('gridPage');
  for (let e of p) {
    e.style.display = 'none';
  }
  p[num].style.display = 'grid';
}

function renderPlayerRow(p,parent,alt,trade,sign) {
  let row = buildElem('DIV',['playerRow','sortRow'],undefined,parent);
  row.id = `player${p.id}`;
  row.setAttribute('data-id',p.id);
  row.setAttribute('data-ws',p.ws);
  row.setAttribute('data-ego',p.ego);
  row.setAttribute('data-pos',p.pos);
  row.setAttribute('data-team',p.team);
  row.setAttribute('data-able',p.draftable);
  row.setAttribute('data-base',p.base);
  row.setAttribute('data-guar',p.guar);
  row.setAttribute('data-name',p.fName + ' ' + p.lName);
  row.setAttribute('data-stat1',p.stat1.m);
  row.setAttribute('data-stat2',p.stat2.m);
  row.setAttribute('data-stat3',p.stat3.m);
  row.setAttribute('data-stat4',p.stat4.m);
  let top = buildElem('DIV','playerTop',undefined,row);
  //buildElem('IMG',undefined,`logos/${player.clean}_g.png`,top);
  if (alt) {
    top.innerHTML = `${p.fName} ${p.lName}&nbsp;<span class="num">(${p.pos} #${p.id})`;
  } else {
    top.innerHTML = `<img src="logos/${p.clean}_g.png"> ${p.fName} ${p.lName}&nbsp;<span class="num">(${p.pos} #${p.id})</span>&nbsp;${decodeEntities('&middot;')}&nbsp;${p.mascot}`;
  }
  let btn = buildElem('SVG',undefined,'0 0 24 24',top);
  buildElem('PATH',undefined,'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z',btn);
  btn.addEventListener('click',function(){ this.parentElement.nextElementSibling.classList.toggle('show'); });
  let bot = buildElem('DIV','playerBot',undefined,row);
  buildElem('DIV',['playerCell','wide'],'Player Stats',bot);
  buildElem('DIV','playerCell','Name',bot);
  buildElem('DIV','playerCell','Mean',bot);
  let std = buildElem('DIV','playerCell',undefined,bot);
  std.innerHTML = '<abbr title="Standard Deviation">Std. Dev.</abbr>';
  buildElem('DIV','playerCell','Rank',bot);
  for (let s of [p.stat1,p.stat2,p.stat3,p.stat4]) {
    let a = buildElem('DIV','playerCell',undefined,bot);
    a.innerHTML = s.h;
    buildElem('DIV','playerCell',s.m,bot);
    buildElem('DIV','playerCell',s.s,bot);
    let r = buildElem('DIV','playerCell',undefined,bot);
    let c = buildElem('DIV',['ranking',s.r.cls],s.r.abbr,r);
    c.title = s.r.name;
  }
  buildElem('DIV',['playerCell','wide'],'Player Contract',bot);
  buildElem('DIV','playerCell','Base:',bot);
  buildElem('DIV','playerCell',renderAmount(p.base),bot);
  buildElem('DIV','playerCell','Guaranteed:',bot);
  buildElem('DIV','playerCell',renderAmount(p.guar),bot);
  buildElem('DIV','playerCell','Cap Hit:',bot);
  buildElem('DIV','playerCell',renderAmount(p.salary),bot);
  buildElem('DIV','playerCell','Week Signed:',bot);
  buildElem('DIV','playerCell',renderAmount(p.weekSigned),bot);
  buildElem('DIV','playerCell','Drafted:',bot);
  buildElem('DIV','playerCell',numToEng(p.drafted),bot);
  buildElem('DIV','playerCell','Draftable:',bot);
  buildElem('DIV','playerCell',numToEng(p.draftable),bot);
  if (alt) {
    return;
  }
  buildElem('DIV','playerCell','Ego:',bot);
  buildElem('DIV','playerCell',p.ego,bot);
  buildElem('DIV','playerCell','Team:',bot);
  buildElem('DIV','playerCell',p.mascot,bot);
  let act = buildElem('DIV','playerActionCont',undefined,bot);
  if (p.team == document.body.getAttribute('data-team')) { //is on team
    if (sign) {
      let nego = buildElem('BUTTON',['playerAction','nego'],'Renegotiate',act);
      nego.addEventListener('click',function(){ negotiate(this); });
    }
    let rele = buildElem('BUTTON',['playerAction','release'],'Release',act);
    rele.addEventListener('click',function(){ release(this); });
  } else if (p.team != 'UFA' && trade) { //on another team
    let inq = buildElem('BUTTON',['playerAction','inquire'],'Inquire',act);
    inq.addEventListener('click',function(){ inquire(this); });
    let off = buildElem('BUTTON',['playerAction','trade'],'Offer Trade',act);
    off.addEventListener('click',function(){ offerPlayerTrade(this); });
  } else if (!p.draftable && sign) { //is non-draftable free agent
    let btn = buildElem('BUTTON',['playerAction','sign'],'Sign Player',act);
    btn.addEventListener('click',function(){ negotiate(this); });
  }
}

function matchingPos(id,list) {
  let exp = [];
  let f = id.charAt(0);
  for (let a of list) {
    let b = a.charAt(0);
    if (b == f) {
      exp.push(a);
    } else if (['3','2'].includes(b) && ['3','2'].includes(f)) {
      exp.push(a);
    } else if (['5','6'].includes(b) && ['5','6'].includes(f)) {
      exp.push(a);
    } else if (['A','B','C'].includes(b) && ['A','B','C'].includes(f)) {
      exp.push(a);
    }
  }
  return exp;
}

function renderAmount(num) {
  if (typeof num == 'string') {
    try {
      num = Number(num);
    } catch {
      return `<${num}>`;
    }
  }
  if (isNaN(num)) {
    return `<${num}>`;
  }
  num = Math.round(num);
  if (num <= -1000) {
    return `$(${Math.abs(num / 1000)}M)`;
  } else if (num < 0) {
    return `$(${Math.abs(num)}K)`;
  } else if (num == 0) {
    return '$0';
  } else if (num < 1000) {
    return `$${num}K`;
  } else {
    return `$${num / 1000}M`;
  }
}

function numToEng(num) {
  if (num == 0) {
    return 'No';
  }
  if (num == 1) {
    return 'Yes';
  }
  return `<${num}>`;
}

var attrs = {};
attrs['QB'] = [{js:'acc',ln:'Accuracy',sn:'Acc.',m:0.87,d:0.12},{js:'longAcc',ln:'Long Accuracy',sn:'Long Acc.',m:0.77,d:0.12},{js:'press',ln:'Pressure Precentage',sn:'Press.',m:0.09,d:0.06,flip:true},{js:'dura',ln:'Throw Delay',sn:'Delay',m:4,d:3,flip:true}];
attrs['RB'] = [{js:'yac',ln:'Yards After Contact',sn:'YAC',m:15,d:6},{js:'elus',ln:'Elusiveness',sn:'Elus.',m:0.75,d:0.12,flip:true},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
attrs['WR'] = [{js:'recep',ln:'Reception Rate',sn:'Recep.',m:0.9,d:0.6},{js:'longRecep',ln:'Long Reception Rate',sn:'Long Recep.',m:0.8,d:0.6},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
attrs['TE'] = [{js:'recep',ln:'Reception Rate',sn:'Recep.',m:0.9,d:0.6},{js:'longRecep',ln:'Long Reception Rate',sn:'Long Recep.',m:0.8,d:0.6},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
attrs['OL'] = [{js:'stuff',ln:'Stuff Rate',sn:'Stuff',m:0.3,d:0.12},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
attrs['DL'] = [{js:'esc',ln:'Escape Rate',sn:'Escape',m:0.3,d:0.12,flip:true},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.5,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
attrs['LB'] = [{js:'esc',ln:'Escape Rate',sn:'Escape',m:0.3,d:0.12,flip:true},{js:'tbd',ln:'To Be Determined',sn:'TBD',m:0,d:3},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.5,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
attrs['CB'] = [{js:'cover',ln:'Cover Rate',sn:'Cover',m:0.9,d:0.6},{js:'int',ln:'Interception Rate',sn:'Int.',m:0.05,d:0.03},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.7,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:4,d:1.5}];
attrs['S'] = [{js:'cover',ln:'Cover Rate',sn:'Cover',m:0.9,d:0.6},{js:'int',ln:'Interception Rate',sn:'Int.',m:0.05,d:0.03},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.7,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:4,d:1.5}];
attrs['K'] = [{js:'pat',ln:'Point After Touchdown',sn:'PAT',m:0.95,d:0.06},{js:'fg',ln:'Field Goal',sn:'FG',m:0.9,d:0.06},{js:'longFg',ln:'Long Field Goal',sn:'Long FG',m:0.8,d:0.06},{js:'tb',ln:'Touchback Rate',sn:'Touchback',m:0.8,d:0.12}];
attrs['P'] = [{js:'dist',ln:'Distance',sn:'Dist.',m:40,d:6},{js:'aware',ln:'Awareness',sn:'Aware.',m:0.3,d:0.06},{js:'block',ln:'Blocked Rate',sn:'Block',m:0.01,d:0.003,flip:true},{js:'oob',ln:'Out of Bounds',sn:'OOB',m:0.2,d:0.06,flip:true}];