ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested' && response.type == 'draftOrder') {
    addDraftOrder(response.data);
  } else if (response.method == 'requested' && response.type == 'players') {
    addAllPlayers(response.data);
  }
}

window.onload = () => {
  var req = {method:'request',type:'draftOrder',qual:'round',crit:'ALL'};
  ws.send(JSON.stringify(req));
  var req2 = {method:'request',type:'players',qual:'ALL'};
  ws.send(JSON.stringify(req2));
}

function addDraftOrder(list) {
  for (let i = 0; i < 40; i++) {
    var newRow = buildElem('TR',undefined,undefined,document.getElementById('table'));
    buildElem('TH',undefined,String(i + 1),newRow);
    for (let j = 0; j < 10; j++) {
      var team = list[j][i];
      var src = getLogoFromTeam(team);
      var newCell = buildElem('TD',undefined,undefined,newRow);
      newCell.title = team.mascot;
      newCell.setAttribute('data-abbr',team.abbr);
      newCell.classList.add(getClassFromTeam(team));
      var logo = buildElem('IMG',undefined,undefined,newCell);
      logo.src = src;
    }
  }
  var finalRow = buildElem('TR',undefined,undefined,document.getElementById('table'));
  for (let i = 0; i < 11; i++) {
    if (i != 0) {
      buildElem('TH',undefined,String(i),finalRow);
    } else {
      buildElem('TH',undefined,undefined,finalRow);
    }
  }
}

function addAllPlayers(list) {
  var tables = document.getElementsByClassName('playersTable');
  iter = 0;
  var all = {qb:[],rb:[],wr:[],te:[],de:[],lb:[],cb:[],s:[],k:[],p:[]};
  for (let player of list) {
    all[player.pos.toLowerCase()].push(player);
  }
  for (let pos in all) {
    var table = tables[iter];
    let posGroup = all[pos];
    for (let player of posGroup) {
      let newRow = table.insertRow();
      let newName = newRow.insertCell();
      newName.innerHTML = `${player.fName} ${player.lName} <span class="num">#${player.id}</span>`;
      let stats = [JSON.parse(player.statA),JSON.parse(player.statB),JSON.parse(player.statC)];
      for (let stat of stats) {
        let newCell = newRow.insertCell();
        newCell.textContent = `${stat.m} (${stat.s})`;
      }
    }
    iter++;
  }
}

function changeTable(num) {
  var tables = document.getElementsByClassName('playersTable');
  for (let table of tables) {
    table.style.display = 'none';
  }
  tables[num].style.display = 'table';
  var btns = document.getElementsByClassName('playersNav');
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function filter() {
  var abbr = document.getElementById('filter').value;
  for (let row of document.getElementById('table').rows) {
    for (let cell of row.cells) {
      if (cell.getAttribute('data-abbr') != undefined && abbr != 'ALL') {
        if (cell.getAttribute('data-abbr') == abbr) {
          cell.style.opacity = 1;
        } else {
          cell.style.opacity = 0.1;
        }
      } else if (abbr == 'ALL') {
        cell.style.opacity = 1;
      }
    }
  }
}

function calcQBR(elem) {
  var par = elem.parentElement;
  var attrs = ['att','comp','yds','td','int'];
  var vals = {};
  for (let i = 0; i < par.children.length - 1; i++) {
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[i]] = 0;
    } else {
      vals[attrs[i]] = Number(val);
    }
  }
  par.lastElementChild.textContent = calcQBRating(vals.comp,vals.att,vals.yds,vals.td,vals.int);
}

function calcOTR(elem) {
  var par = elem.parentElement;
  var attrs = ['plays','td','pts','yds'];
  var vals = {};
  for (let i = 0; i < par.children.length - 1; i++) {
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[i]] = 0;
    } else {
      vals[attrs[i]] = Number(val);
    }
  }
  par.lastElementChild.textContent = calcOffRating(vals.plays,vals.td,vals.pts,vals.yds);
}

function calcDTR(elem) {
  var par = elem.parentElement;
  var attrs = ['plays','sacks','td','int','yds','pts'];
  var vals = {};
  for (let i = 0; i < par.children.length - 1; i++) {
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[i]] = 0;
    } else {
      vals[attrs[i]] = Number(val);
    }
  }
  par.lastElementChild.textContent = calcDefRating(vals.plays,vals.sacks,vals.int,vals.td,vals.yds,vals.pts);
}

function calcRecep(elem) {
  var par = elem.parentElement;
  var attrs = ['acc','press','recep','tire','cover'];
  var vals = {};
  var iter = 0;
  for (let i = 0; i < par.children.length - 1; i++) {
    if (par.children[i].nodeName != 'INPUT') {
      continue;
    }
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[iter]] = 0;
    } else {
      vals[attrs[iter]] = Number(val);
    }
    iter++;
  }
  par.lastElementChild.textContent = ((vals.acc - vals.press) * (vals.recep - vals.tire / 50) * vals.cover).toFixed(3);
}

function calcInt(elem) {
  var par = elem.parentElement;
  var attrs = ['acc','int'];
  var vals = {};
  var iter = 0;
  for (let i = 0; i < par.children.length - 1; i++) {
    if (par.children[i].nodeName != 'INPUT') {
      continue;
    }
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[iter]] = 0;
    } else {
      vals[attrs[iter]] = Number(val);
    }
    iter++;
  }
  par.lastElementChild.textContent = ((1 - vals.acc) * vals.int).toFixed(3);
}

function calcFourth(elem) {
  var par = elem.parentElement;
  var attrs = ['sec','diff','los'];
  var vals = {};
  var iter = 0;
  for (let i = 0; i < par.children.length - 1; i++) {
    if (par.children[i].nodeName != 'INPUT') {
      continue;
    }
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[iter]] = 0;
    } else {
      vals[attrs[iter]] = Number(val);
    }
    iter++;
  }
  var d = 100 * vals.sec / 60 + 25 * vals.diff + 9 * vals.los;
  if (d < 750) {
    par.lastElementChild.textContent = 'Go for it';
    par.lastElementChild.style.backgroundColor = 'green';
  } else {
    par.lastElementChild.textContent = 'Don\'t go for it';
    par.lastElementChild.style.backgroundColor = 'red';
  }
}

function calcTime(elem) {
  var par = elem.parentElement;
  var attrs = ['x','y','r','d'];
  var vals = {};
  var iter = 0;
  for (let i = 0; i < par.children.length - 1; i++) {
    if (par.children[i].nodeName != 'INPUT') {
      continue;
    }
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[iter]] = 0;
    } else {
      vals[attrs[iter]] = Number(val);
    }
    iter++;
  }
  var dx = vals.x;
  var dy = vals.y;
  var speed = vals.r;
  var sprint = vals.d;
  if ((dx == 0 && dy == 0) || sprint == 0) {
    par.lastElementChild.textContent = 'NOT';
    return;
  }
  console.log(dx,dy,speed,sprint);
  if (speed <= 0 || sprint <= 0) {
    par.lastElementChild.textContent = 'NOT';
    return;
  } else if (speed == sprint) {
    par.lastElementChild.textContent = `${((Math.pow(dx,2) + Math.pow(dy,2)) / (2 * speed * dx)).toFixed(1)} Secs`;
    return;
  }
  var a = Math.pow(speed,2) - Math.pow(sprint,2);
  var b = -2 * speed * dx;
  var c = Math.pow(dx,2) + Math.pow(dy,2);
  var d = Math.pow(b,2) - 4 * a * c;
  if (d < 0) {
    par.lastElementChild.textContent = 'NOT';
    return;
  }
  var n = -b + Math.sqrt(Math.pow(b,2) - 4 * a * c);
  var t = -b - Math.sqrt(Math.pow(b,2) - 4 * a * c);
  var l = 2 * a;
  if (n / l < 0 && t / l < 0) {
    par.lastElementChild.textContent = 'NOT';
  } else if (n / l < t / l) {
    par.lastElementChild.textContent = `${(n/l).toFixed(1)} Secs`;
  } else {
    par.lastElementChild.textContent = `${(t/l).toFixed(1)} Secs`;
  }
}

function calcRB(elem) {
  var par = elem.parentElement;
  if (par.children[5].value != '0.7') {
    par.children[6].style.display = 'none';
    par.children[7].style.display = 'none';
    par.children[7].value = 1;
  } else if (par.children[7].style.display == 'none') {
    par.children[6].style.display = 'block';
    par.children[7].style.display = 'block';
    par.children[7].value = '';
  }
  var attrs = ['elus','tire','tackle','block'];
  var vals = {};
  var iter = 0;
  for (let i = 0; i < par.children.length - 1; i++) {
    if (par.children[i].nodeName == 'SPAN') {
      continue;
    }
    let val = par.children[i].value;
    if (val == '') {
      vals[attrs[iter]] = 0;
    } else {
      vals[attrs[iter]] = Number(val);
    }
    iter++;
  }
  console.log(vals);
  par.lastElementChild.textContent = ((vals.elus + vals.tire/100) * vals.tackle * vals.block).toFixed(3);
}