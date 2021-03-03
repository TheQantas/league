var gotten = 0;
var players = {};
var weeks = [];

ws.onopen = () => {
  var req = {method:'request',type:'players',qual:'all'};
  ws.send(JSON.stringify(req));
  var rex = {method:'request',type:'games',qual:'week',crit:getCurrentWeek()};
  ws.send(JSON.stringify(rex));
}

ws.onmessage = message => {
  gotten++;
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.type == 'players') {
    var pos = ['qb','rb','wr','te','de','lb','cb','s','k','p'];
    for (let i = 0, p = pos[0]; i < 10; i++, p = pos[i]) {
      players[p] = response.data.slice(i * 50,(i + 1) * 50);
    }
  } else {
    for (let game of response.data) {
      game.awayIndex = getTeamIndex(game.away);
      game.homeIndex = getTeamIndex(game.home);
    }
    weeks[response.crit] = response.data;
  }
  if (gotten >= 2) {
    renderComp(response.crit);
  }
}

function renderComp(week) {
  if (!week) {
    week = getCurrentWeek();
  }
  var games = weeks[week];
  var distrs = [];
  for (let game of games) {
    var away = {};
    var home = {};
    var pos = ['qb','wr','te','de','lb','cb','s'];
    var attr = {qb:'att',wr:'targets',te:'targets',de:'blitz',lb:'blitz',cb:'targets',s:'targets'};
    for (let p of pos) {
      var a = [];
      var h = [];
      for (let player of players[p]) {
        if (player.team == game.awayIndex) {
          a.push(player);
        }
        if (player.team == game.homeIndex) {
          h.push(player);
        }
      }
      for (let j of a) {
        if (JSON.parse(j.stats)[attr[p]][week]) {
          away[p] = j;
        }
      }
      for (let j of h) {
        if (JSON.parse(j.stats)[attr[p]][week]) {
          home[p] = j;
        }
      }
      if (!away[p]) {
        away[p] = a[0];
      }
      if (!home[p]) {
        home[p] = a[0];
      }
    }
    var a = calc(away,home,week);
    if (a[0]) {
      a[0].off = game.away;
      a[0].def = game.home;
      a[1].off = game.home;
      a[1].def = game.away;
    }
    distrs = distrs.concat(a);
  }
  console.log(distrs);
  distrs.sort(function(a,b) {
    return b.z - a.z;
  });
  for (let dist of distrs) {
    let newRow = document.getElementsByClassName('table')[0].insertRow();
    let vals = [`${dist.off} Offense/${dist.def} Defense`,dist.v,dist.z,dist.pv,dist.m,dist.s,dist.t,dist.l];
    for (let val of vals) {
      let newCell = newRow.insertCell();
      if (typeof val == 'number') {
        newCell.textContent = val.toFixed(3);
      } else {
        newCell.textContent = val;
      }
    }
  }
}

function calc(away,home,week) {
  exp = [];
  var a = {qb:away.qb,wr:away.wr,te:away.te,de:home.de,lb:home.lb,cb:home.cb,s:home.s};
  var b = {qb:home.qb,wr:home.wr,te:home.te,de:away.de,lb:away.lb,cb:away.cb,s:away.s};
  for (let g of [a,b]) {
    if (!g.qb) {
      continue;
    }
    for (let p in g) {
      console.log(g[p].statA);
      g[p].statA = JSON.parse(g[p].statA);
      g[p].statB = JSON.parse(g[p].statB);
      g[p].statC = JSON.parse(g[p].statC);
      g[p].stats = JSON.parse(g[p].stats);
    }
    if (g.qb.stats.att[week] == undefined || 0) {
      let q = new Q(0,0);
      return [q,q];
    }
    let deRush = q(g.de.statA.m,g.de.statA.s).constMult(g.de.stats.blitz[week] / g.qb.stats.att[week]);
    let lbRush = q(g.lb.statA.m,g.lb.statA.s).constMult(g.lb.stats.blitz[week] / g.qb.stats.att[week]);
    let rush = deRush.add(lbRush);
    let shortAcc = q(g.qb.statA.m,g.qb.statA.s).subtract(rush);
    let longAcc = q(g.qb.statB.m,g.qb.statB.s).subtract(rush);
    let shortWr = new Q(g.wr.statA.m,g.wr.statA.s);
    let longWr = new Q(g.wr.statB.m,g.wr.statB.s);
    let shortTe = new Q(g.te.statA.m,g.te.statA.s);
    let longTe = new Q(g.te.statB.m,g.te.statB.s);
    let shortWrChance = 10 / (3 * g.wr.statC.m);
    let shortTeChance = 10 / (3 * g.te.statC.m);
    let wrTargetChance = g.wr.stats.targets[week] / g.qb.stats.att[week];
    let teTargetChance = 1 - wrTargetChance;
    let cbCover = new Q(g.cb.statA.m,g.cb.statA.s);
    let sCover = new Q(g.s.statA.m,g.s.statA.s);
    let shortQbWr = shortAcc.mult(shortWr).mult(sCover).constMult(wrTargetChance * shortWrChance);
    let longQbWr = longAcc.mult(longWr).mult(sCover).constMult(wrTargetChance * (1 - shortWrChance));
    let shortQbTe = shortAcc.mult(shortTe).mult(cbCover).constMult(teTargetChance * shortTeChance);
    let longQbTe = longAcc.mult(longTe).mult(cbCover).constMult(teTargetChance * (1 - shortTeChance));
    let a = shortQbWr.add(longQbWr);
    let b = shortQbTe.add(longQbTe);
    let c = a.add(b);
    c.v = g.qb.stats.comp[week] / g.qb.stats.att[week];
    c.pv = stats.q.cdf(c.v,c);
    if (c.pv > 0.5 && c.pv != 0) {
      c.pv = 1 - c.pv;
    }
    c.z = (c.v - c.m) / c.t;  
    exp.push(c);
  }
  return exp;
}

function q(m,tl,l,p,d) {
  return new Q(m,tl,l,p,d);
}
