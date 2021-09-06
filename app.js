const express = require('express');
const app = express();
const ejs = require('ejs');
const crypto = require('crypto');
const path = require('path');
const speakeasy = require('speakeasy');
const useragent = require('express-useragent');
const mysql = require('mysql');
const geoip = require('geoip-lite');
const cookieParser = require('cookie-parser');
const { DateTime } = require('luxon');
const Teams = require('./t.js');
const QRCS = require('./qrcs.js');
const Cred = require('./cred.js');
const Email = require('./email.js');
const QR = require('qrcode');
var busy = false;
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: Cred.sql().p,
  database: Cred.sql().d,
  multipleStatements: true
});
function request(sql) {
  if (!busy) {
    busy = true;
    return new Promise(function(resolve, reject) {
      con.query(sql,function (error,result) {
        if (error) {
          busy = false;
          throw error;
        };
        resolve(result);
      })
    }).then(function(result) {
      busy = false;
      return result;
    });
  } else {
    //console.log('query is busy');
    return new Promise(function(resolve, reject) {
      setTimeout(() => { resolve(); },100);
    }).then(() => {
      return request(sql);
    });
  }
}
function updateTeam(abbr,attrs,vals) {
  return update('teams',`abbr = '${abbr}'`,attrs,vals);
}
function update(d,w,attrs,vals) {
  //return new Promise(function(resolve, reject) {
    //con.connect(function(err) {
      var sql = `UPDATE ${d} SET `;
      for (let i = 0; i < attrs.length; i++) {
        let val = vals[i];
        let attr = attrs[i];
        if (typeof val == 'number' || val == null) {
          sql += `${attr} = ${con.escape(val)}`;
        } else if (typeof val == 'boolean') {
          sql += `${attr} = ${Number(val)}`;
        } else if (typeof val == 'object') {
          sql += `${attr} = ${con.escape(JSON.stringify(val))}`;
        } else {
          sql += `${attr} = ${con.escape(val)}`;
        }
        if (i != attrs.length - 1) {
          sql += ',';
        }
      }
      if (d == 'teams') {
        sql += ',activated=true';
      }
      sql += ` WHERE ${w}`;
      return request(sql);
}
const clubs = {};
clubs.getTeamFromAbbr = abbr => {
  return request(`SELECT * FROM teams WHERE Abbr = ${con.escape(abbr)}`).then(list => {
    return list[0];
  });
}
clubs.getTeamFromMascot = (mascot) => request(`SELECT * FROM teams WHERE mascot = ${con.escape(mascot)}`).then(list => {
  return list[0];
})
clubs.getAllTeams = () => request('SELECT * FROM teams');
clubs.getAllTeamsByConf = conf => {
  var z = con.escape(conf.toUpperCase()).replace("'", '').replace("'", '');
  return request(`SELECT * FROM teams WHERE DIVISION LIKE '${z}%'`);
}
clubs.getAccountFromToken = token => request('SELECT * FROM teams').then(list => {
  let matches = [];
  for (let team of list) {
    let tokenSalt = JSON.parse(team.tokenSalt);
    let tokenHash = JSON.parse(team.tokenHash);
    for (let i = 0; i < tokenSalt.length; i++) {
      if (crypto.createHash('sha512').update(token + tokenSalt[i]).digest('hex') == tokenHash[i]) {
        matches.push(team);
        break;
      }
    }
  }
  if (matches.length == 1) {
    return matches[0];
  } else {
    return;
  }
});
clubs.deleteToken = token => clubs.getAccountFromToken(token).then(acc => {
  if (!acc) {
    return false;
  }
  var allSalts = JSON.parse(acc.tokenSalt);
  var allHashes = JSON.parse(acc.tokenHash);
  for (let i = 0; i < allHashes.length; i++) {
    if (crypto.createHash('sha512').update(token + allSalts[i]).digest('hex') == allHashes[i]) {
      allSalts[i] = undefined;
      allHashes[i] = undefined;
    }
  }
  allSalts = clean(allSalts);
  allHashes = clean(allHashes);
  return updateTeam(acc.abbr, ['tokenSalt','tokenHash'], [allSalts,allHashes]).then(function () {
    return true;
  });
})
clubs.getOpponentsFromGame = game => request('SELECT * FROM teams').then(list => { //has singular game
  let exp = {};
  for (let team of list) {
    if (team.abbr == game.away) {
      exp.away = team;
    } else if (team.abbr == game.home) {
      exp.home = team;
    }
  }
  return exp;
})
clubs.getAttrFromAbbr = (abbr,attr) => {
  if (abbr == 'CFC' || abbr == 'NFC') {
    return abbr;
  }
  for (let x of Teams.getTeams()) {
    if (x.abbr == abbr) {
      return x[attr];
    }
  }
}
clubs.clean = str => {
  if (typeof str == 'object') {
    str = str.mascot;
  }
  return str.toLowerCase().replace(/\s/g,'');
}
clubs.getAssets = abbr => {
  return clubs.getTeamFromAbbr(abbr).then(team => {
    roster = JSON.parse(team.roster);
    return athletes.getAllPlayers().then(players => {
      var active = [];
      for (let p of players) {
        if (roster.includes(p.id)) {
          active.push(p);
        }
      }
      return selections.getTeamPicks(abbr).then(picks => {
        let unused = [];
        for (let p of picks) {
          if (p.pick > currentPick) {
            unused.push(p);
          }
        }
        return {players:active,picks:unused};
      });
    });
  });
}
clubs.getGamesLeft = abbr => {
  return request(`SELECT * FROM games WHERE (away=${con.escape(abbr)} OR home=${con.escape(abbr)}) AND week <> 0 AND week < 21 AND status='upcoming'`).then(list => {
    return list.length;
  });
}
clubs.getPlayoffs = () => {
  return clubs.getAllTeams().then(teams => {
    return contests.getAllGames().then(games => {
      for (let t of teams) {
        t.clean = t.mascot.toLowerCase().replace(/\s/g,'');
      }
      let confs = {cfc:teams.slice(0,20),nfc:teams.slice(20,40)};
      let order = {cfc:[],nfc:[]};
      let divs = {};
      for (let c in confs) {
        for (let t of confs[c]) {
          if (t.w + t.l != 0) {
            t.record = t.w / (t.w + t.l);
          } else {
            t.record = 0.01;
          }
          if (t.dw + t.dl != 0) {
            t.divRecord = t.dw / (t.dw + t.dl);
          } else {
            t.divRecord = 0.01;
          }
        }
        confs[c].sort(sortTeams(games));
        let leader = 0;
        let index = 5;
        for (let t of confs[c]) {
          let cd = t.division.toLowerCase().replace(/\s/g,'');
          if (!divs[cd]) { //no team yet in div; first in div
            order[c][leader] = t;
            leader++;
            divs[cd] = [];
          } else { //div leader already in
            order[c][index] = t;
            index++;
          }
          divs[cd].push(t);
        }
        for (let i = 0; i < order[c].length; i++) {
          order[c][i].seed = i + 1;
          order[c][i].flag = '';
        }
      }
      for (let n in divs) {
        let div = divs[n];
        if (checkClinch(div[0],div.slice(1,4),games)) {
          div[0].flag = 'xy';
        } else if (checkClinch(div[0],confs[n.substring(0,3)].slice(8,20),games)) {
          div[0].flag = 'x';
        } //end div leader
        for (let i = 1; i < 4; i++) {
          if (checkClinch(div[i],confs[n.substring(0,3)].slice(8,20),games)) {
            div[i].flag = 'x';
          } else if (checkElim(div[i],confs[n.substring(0,3)].slice(5,8).concat(div[0]),games)) { //cannot win div and cannot beat current wc's
            div[i].flag = 'e';
          }
        } 
      }
      return {confs:order,divs:divs};
    });
  });
}
clubs.breakdown = (roster,acc,ws) => {
  var spending = 0;
  for (let i = 0, p = roster[0]; i < roster.length; i++, p = roster[i]) {
    let denom = (roster.length==1)?1:roster.length - 1;
    p.color = `hsl(${Math.round(100 + 200 / denom * i)},70%,50%)`;
    p.type = 'player';
    p.name = `${p.fName} ${p.lName} <span class="num">(${p.pos} #${p.id})</span>`;
    spending += p.salary;
  }
  var investment = 0;
  for (let d of JSON.parse(acc.delegates)) {
    investment += d.investment;
  }
  spending += investment;
  var dead = acc.dead;
  spending += dead;
  var space = 200000 - spending;
  var breakdown = [{name:'Cap Space',salary:space,color:'#888'}];
  breakdown = breakdown.concat(roster);
  breakdown.push({name:'Delegate Investment',salary:investment,color:'chocolate'});
  breakdown.push({name:'Dead Cap',salary:dead,color:'sienna'});
  if (space < 0) {
    breakdown[0].color = 'red';
    breakdown[0].perc = 1000 / (spending + 1000) * 100;
    for (let i = 1; i < breakdown.length; i++) {
      breakdown[i].perc = breakdown[i].salary / (spending + 1000) * 100;
    }
  } else {
    for (let b of breakdown) {
      b.perc = b.salary / 2000;
    }
  }
  for (let b of breakdown) {
    b.frac = b.salary / 2000;
    b.render = renderAmount(b.salary);
  }
  let res = {method:'brokenDown',spending:spending,breakdown:breakdown};
  if (ws == 'all') {
    return announce(acc.abbr,res);
  } else if (ws) {
    return ws.send(JSON.stringify(res));
  }
  return res;
}
clubs.nextGame = abbr => {
  return request(`SELECT * FROM games WHERE (away=${con.escape(abbr)} OR home=${con.escape(abbr)}) AND status='upcoming'`).then(list => {
    if (list.length == 0) {
      return {oppo:'LEA'};
    }
    list.sort((a,b) => { return new Date(a.schedule).getTime() - new Date(b.schedule).getTime() } );
    if (list[0].away == abbr) {
      list[0].oppo = list[0].home;
    } else {
      list[0].oppo = list[0].away;
    }
    return list[0];
  });
}
const athletes = {};
athletes.getPlayers = list => {
  if (list.length == 0) {
    return new Promise(function(resolve) {
      resolve();
    }).then(function() {
      return [];
    });
  }
  if (typeof list == 'string') {
    list = JSON.parse(list);
  }
  var sql = 'SELECT * FROM players WHERE ';
  for (let i = 0, p = list[0]; i < list.length; i++, p = list[i]) {
    sql += `id=${con.escape(p)}`;
    if (i == list.length - 1) {
      sql += ';'
    } else {
      sql += ' OR ';
    }
  }
  return request(sql);
}
athletes.getAllPlayers = () => {
  return request('SELECT * FROM players');
}
athletes.getPlayerFromId = id => {
  return request(`SELECT * FROM players where id=${con.escape(id)}`).then(list => {
    return list[0];
  });
}
athletes.getRosterFromPlayers = (list,abbr) => {
  var exp = [];
  for (let p of list) {
    if (p.team == abbr) {
      exp.push(p);
    }
  }
  return exp;
}
athletes.getPlayersByPos = pos => {
  return request(`SELECT * FROM players where pos=${con.escape(pos)}`);
}
athletes.getPlayersInDraft = () => {
  return request('SELECT * FROM players WHERE draftable=true');
}
athletes.getDraftablePlayers = () => {
  return request('SELECT * FROM players WHERE draftable=true AND drafted=false');
}
athletes.getPlayerFromList = (id,list) => {
  for (let p of list) {
    if (p.id == id) {
      return p;
    }
  }
}
athletes.searchPlayers = (list,pos,id,team,base,guar,name,draftable,a,b,c,d) => {
  //return athletes.getAllPlayers().then(players => {
  let matches = [];
  for (let p of list) {
    if (typeof id == 'string') {
      if (p.id.toLowerCase().replace(/\s/g,'').indexOf(id.toLowerCase().replace(/\s/g,'')) == -1) {
        continue;
      }
    }
    if (pos != p.pos && pos != undefined) {
      continue;
    }
    if (team != p.team && team != undefined && team != 'ANY') {
      continue;
    }
    if (p.base > base && base != undefined) {
      continue;
    }
    if (p.guar > guar && guar != undefined) {
      continue;
    }
    if (typeof name == 'string') {
      let n = p.fName + p.lName;
      if (n.toLowerCase().replace(/\s/g,'').indexOf(name.toLowerCase().replace(/\s/g,'')) == -1) {
        continue;
      }
    }
    if (Number(draftable) != p.draftable && draftable != undefined && draftable != 'ANY') {
      continue;
    }
    let stats = [p.stat1,p.stat2,p.stat3,p.stat4];
    for (let s of stats) {
      if (typeof s == 'string') {
        s = JSON.parse(s);
      }
    }
    let reqs = [a,b,c,d];
    let sds = Teams.getStatsByPos()[p.pos];
    let match = true;
    for (let i = 0, s = stats[0], r = reqs[0]; i < stats.length; i++, s = stats[i], r = reqs[i]) {
      if (typeof s == 'string') {
        s = JSON.parse(s);
      }
      if (s ==  undefined) {
        match = false;
        break;
      }
      let mean = s.m;
      if (sds[i].flip) {
        mean *= -1;
        r = -r;
      }
      if (mean < r) {
        match = false;
        break;
      }
    }
    if (match) {
      matches.push(p);
    }
  }
  return expandPlayers(matches);
  //});
}
athletes.signCheapestOfPos = (abbr,pos) => {
  return clubs.getTeamFromAbbr(abbr).then(acc => {
    return request(`SELECT * FROM players WHERE team='UFA' AND pos='${pos}' AND draftable=0;`).then(players => {
      let w = getCurrentWeek(), wr;
      if (w == 0) {
        wr = 20;
      } else if (w < 21) {
        wr = 21 - w;
      } else {
        wr = 0;
      }
      for (let p of players) {
        p.salary = wr * p.base + p.guar;
      }
      players.sort((a,b) => { return a.salary - b.salary; });
      let cheapPlayers = [];
      let cheapSalary = players[0].salary;
      for (let p of players) {
        if (p.salary > cheapSalary + 200) {
          break;
        }
        cheapPlayers.push(p);
      }
      let random = cheapPlayers[Math.floor(Math.random() * cheapPlayers.length)];
      let roster = JSON.parse(acc.roster).concat(random.id);
      let sql = `UPDATE teams SET roster='${JSON.stringify(roster)}' WHERE abbr='${acc.abbr}';`;
      return clubs.getGamesLeft(acc.abbr).then(left => {
        sql += `UPDATE players SET team='${acc.abbr}',weekSigned=${getCurrentWeek()},duration=${left} WHERE id='${random.id}';`;
        console.log(sql);
        return request(sql);
      });
    });
  });
}
const messages = {};
messages.getMessages = (user,other) => {
  if (other == 'ALE') {
    return request('SELECT * FROM chat WHERE sentFrom="ALE"');
  }
  return request(`SELECT * FROM chat WHERE (sentFrom=${con.escape(user)} AND sentTo=${con.escape(other)}) OR (sentFrom=${con.escape(other)} AND sentTo=${con.escape(user)});`);
}
messages.getAll = abbr => {
  return request(`SELECT * FROM chat WHERE sentTo=${con.escape(abbr)} OR sentFrom=${con.escape(abbr)}`);
}
const tiempo = {};
tiempo.getFormatTime = (utc,tz,use) => {
  let zone = tiempo.getTime(utc,tz);
  if (zone.error) {
    return 'Time Error';
  }
  return `${zone.weekdayShort} ${zone.day} ${zone.monthShort} ${tiempo.getFormatHour(utc,tz,use)}`;
}
tiempo.getFormatDayAndHour = (utc,tz,use) => {
  let zone = tiempo.getTime(utc,tz);
  if (zone.error) {
    return 'Time Error';
  }
  return `${zone.weekdayShort} ${tiempo.getFormatHour(utc,tz,use)}`;
}
tiempo.getFormatHour = (utc,tz,use) => {
  let zone = tiempo.getTime(utc,tz);
  if (zone.error) {
    return 'XX:XX';
  }
  var m = zone.minute;
  if (m < 10) {
    m = `0${m}`;
  }
  if (zone.hour == 0) {
    var h = 12;
    var r = 'A';
  } else if (zone.hour < 12) {
    var h = zone.hour;
    var r = 'A';
  } else if (zone.hour == 12) {
    var h = 12;
    var r = 'P';
  } else {
    var h = zone.hour - 12;
    var r = 'P';
  }
  if (use === false) {
    return `${h}${r}`;
  }
  return `${h}:${m}${r}`;
}
tiempo.getTime = (utc,tz) => {
  if (!utc) {
    let d = new Date();
    utc = d.toISOString();
  }
  if (typeof utc == 'object') {
    utc = utc.toISOString();
  }
  if (!tz) {
    tz = 'utc';
  }
  var time = DateTime.fromISO(utc, { zone: 'utc' });
  if (!time.isValid) {
    return {error:true};
  }
  var zone = time.setZone(tz);
  if (!zone.isValid) {
    return {error:true};
  }
  return zone;
}
const contests = {}
contests.getWeek = num => {
  return request(`SELECT * FROM games WHERE week=${num}`);
}
contests.getAllGames = () => {
  return request('SELECT * FROM games');
}
contests.getPlayoffGames = () => {
  return request('SELECT * FROM games WHERE week > 20');
}
contests.getGamesByTeam = abbr => {
  return request(`SELECT * FROM games WHERE away=${con.escape(abbr)} OR home=${con.escape(abbr)}`);
}
contests.getTopEight = (games,teams) => {
  if (games.length < 9) {
    return games;
  }
  for (let g of games) {
    let d = new Date(g.schedule);
    g.unix = d.getTime();
  }
  games.sort((a,b) => { //order by time
    return a.unix - b.unix;
  });
  for (var l = 0; l < games.length; l++) {
    if (games[l].status == 'upcoming') {
      break;
    }
  }
  for (let i = l; i < games.length; i++) {
    games[i].index = i - l;
  }
  for (let g of games) {
    for (let t of teams) {
      if (t.abbr == g.away) {
        g.awayMascot = t.mascot;
        g.awayClean = t.mascot.toLowerCase().replace(/\s/g,'');
        g.awayRecord = `(${t.w}-${t.l}) | (${t.dw}-${t.dl})`;
      }
      if (t.abbr == g.home) {
        g.homeMascot = t.mascot;
        g.homeClean = t.mascot.toLowerCase().replace(/\s/g,'');
        g.homeRecord = `(${t.w}-${t.l}) | (${t.dw}-${t.dl})`;
      }
      if (g.awayMascot != undefined && g.homeMascot != undefined) {
        break;
      }
    }
    if (g.status == 'ongoing') {
      g.score = 1000;
    } else { //games is upcoming or final
      let aRecord;
      let hRecord;
      for (let t of teams) {
        if (t.abbr == g.away) {
          if (t.w + t.l == 0) {
            aRecord = 0.01;
          } else {
            aRecord = t.w / (t.w + t.l);
          }
        }
        if (t.abbr == g.home) {
          if (t.w + t.l == 0) {
            hRecord = 0.01;
          } else {
            hRecord = t.w / (t.w + t.l);
          }
        }
        if (aRecord != undefined && hRecord != undefined) {
          break;
        }
      }
      let mult = 1;
      if (aRecord > 0.75 && hRecord > 0.75) {
        mult = 1.5;
      } else if (aRecord > 0.5 && hRecord > 0.5) {
        mult = 1.25;
      } else if (aRecord < 0.3 && hRecord < 0.3) {
        mult = 0.75;
      }
      if (g.status == 'upcoming') {
        g.score = (100 + (20 - g.index) * 5) * mult;
      } else { //final
        g.score = (10 - (Math.abs(g.awayScore - g.homeScore) / 5)) * 15 * mult;
      }
    }
    if (g.primetime) {
      g.score *= 2.5;
    }
  }
  games.sort((a,b) => {
    return b.score - a.score;
  });
  return games.slice(0,8);
}
const selections = {};
selections.getAllPicks = () => {
  return request('SELECT * FROM draft');
}
selections.getNthPick = num => {
  return request(`SELECT * FROM draft WHERE pick=${num}`).then(x => { 
    if (x.length == 1) {
      return x[0]; 
    } else {
      return {team:'LEA',trades:'[]',player:null,pick:-1};
    }
  });
}
selections.getNthRound = num => {
  return request(`SELECT * FROM draft LIMIT ${num * 40},40`);
}
selections.getNextTwentyFromWhole = sxns => {
  let exp = [];
  for (let i = currentPick + 1; i < currentPick + 21; i++ ) {
    exp.push({abbr:sxns[i].team,index:i + 1});
  }
  return exp;
}
selections.getTeamPicks = abbr => {
  return request(`SELECT * FROM draft WHERE team=${con.escape(abbr)}`);
}
selections.getInvolvedPicks = abbr => {
  var a = con.escape(abbr);
  a = a.substring(1,a.length - 1);
  return request(`SELECT * FROM draft WHERE JSON_CONTAINS(trades,'"${a}"','$');`);
}
selections.getCurrentPick = () => {
  return selections.getNthPick(currentPick);
}
selections.getThree = () => {
  if (currentPick == -1) {
    return new Promise(function(resolve) {
      resolve();
    }).then(function() {
      return ['Trading opens 1 Sep 12:00P MDT','Draft is 3 Sep 6:00P-8:00P MDT','Preseason starts 7 Sep 2:00P MDT'];
    });
  }
  if (currentPick > 319) {
    return new Promise(function(resolve) {
      resolve();
    }).then(function() {
      return ['The draft is now over','You will be redirected soon','Good luck in preseason'];
    });
  }
  return selections.getCurrentPick().then(pick => {
    return selections.getTeamPicks(pick.team).then(picks => {
      let strs = [];
      let found = false;
      let next;
      for (let i = 0, p = picks[0]; i < picks.length; i++, p = picks[i]) {
        let f = roundAndPick(p.pick);
        if (p.player !== null) {
          strs.push(`Drafted ${idToPos(p.player)} #${p.player} at RD ${f.r} PK ${f.p}`);
        } else {
          if (!found) {
            found = true;
            next = i;
          }
          strs.push(`Has RD ${f.r} PK ${f.p} (${ordinal(p.pick + 1)} Overall)`);
        }
      }
      if (next == undefined || next < 2) {
        next = 2;
      }
      return strs.slice(next - 2,next + 1);
    });
  });
}
selections.getPicks = list => {
  if (list.length == 0) {
    return new Promise(function(resolve) {
      resolve();
    }).then(function() {
      return [];
    });
  }
  if (typeof list == 'string') {
    list = JSON.parse(list);
  }
  var sql = 'SELECT * FROM draft WHERE ';
  for (let i = 0, p = list[0]; i < list.length; i++, p = list[i]) {
    sql += `pick=${p}`;
    if (i == list.length - 1) {
      sql += ';'
    } else {
      sql += ' OR ';
    }
  }
  return request(sql);
}
const deals = {};
deals.getInvolvedTrades = abbr => {
  return request(`SELECT * FROM trades WHERE (fromTeam=${con.escape(abbr)} AND fromShow=true) OR (toTeam=${con.escape(abbr)} AND toShow=true)`);
}
deals.getAll = () => {
  return request('SELECT * FROM trades');
}
deals.getTradeFromId = id => {
  return request(`SELECT * FROM trades WHERE id=${con.escape(id)}`).then(list => { return list[0]; });
}
const news = {};
news.getInvolvedStories = abbr => {
  var a = con.escape(abbr);
  a = a.substring(1,a.length - 1);
  return request(`SELECT * FROM news WHERE JSON_CONTAINS(teams,'"${a}"','$');`);
}
news.getMostRecent = num => {
  return request('SELECT * FROM news').then(list => {
    list.sort((a,b) => { return new Date(b.time).getTime() - new Date(a.time).getTime() });
    return list.slice(0,num);
  });
}
news.newStory = (abbrs,story) => {
  let s = new Date().toISOString().replace('T',' ').substring(0,19);
  let t = JSON.stringify(abbrs);
  console.log('new story',`INSERT INTO news (teams,time,story) VALUES ('${t}','${s}','${story}');`);
  request(`INSERT INTO news (teams,time,story) VALUES ('${t}','${s}','${story}');`);
}
const line = {};
line.trade = '2021-11-16T19:00:00Z';
line.draft = '2021-09-04T00:00:00Z';
line.fa = '2021-09-10T18:00:00Z';
line.release = '2022-01-22T19:00:00Z';
line.season = '2021-09-01T18:00:00Z';
line.sign = '2021-12-14T19:00:00Z';
line.firstGame = '2021-09-10T22:00:00Z';
line.championship = '2022-02-05T19:00:00Z';
const span = {};
span.canTrade = () => {
  if (new Date(line.trade).getTime() > new Date().getTime()) {
    return true;
  }
  return false;
}
span.canDraft = () => {
  if (new Date(line.draft).getTime() > new Date().getTime()) {
    return true;
  }
  return false;
}
span.canRelease = () => {
  if (new Date(line.release).getTime() > new Date().getTime()) {
    return true;
  }
  return false;
}
span.canSign = () => {
  if (new Date(line.sign).getTime() > new Date().getTime()) {
    return true;
  }
  return false;
}
span.faPeriod = () => {
  if (new Date(line.fa).getTime() > new Date().getTime()) {
    return true;
  }
  return false;
}
span.inSeason = () => {
  if (new Date(line.season).getTime() < new Date().getTime()) {
    return true;
  }
  return false;
}

//game sim

const passRoutes = {};
passRoutes.go = (player,speed) => {
  return {x:speed/10,y:0};
}
passRoutes.post = (player,speed) => {
  if (player.x < game.los + 5) {
    return {x:speed/10,y:0};
  } else {
    let v = speed/10/Math.sqrt(2);
    if (player.iy < 25) {
      return {x:v,y:v};
    }
    return {x:v,y:-v};
  }
}
passRoutes.slant = (player,speed) => {
  if (player.x < game.los + 2) {
    return {x:speed/10,y:0};
  } else {
    let v = speed/10;
    if (player.iy < 25) {
      return {x:v/2,y:v*Math.sqrt(3)/2};
    }
    return {x:v/2,y:-v*Math.sqrt(3)/2};
  }
}
passRoutes.corner = (player,speed) => {
  if (player.x < game.los + 5) {
    return {x:speed/10,y:0};
  } else {
    let v = speed/10/Math.sqrt(2);
    if (player.iy < 25) {
      return {x:v,y:-v};
    }
    return {x:v,y:v};
  }
}
passRoutes.out = (player,speed) => {
  if (player.x < game.los + 5) {
    return {x:speed/10,y:0};
  } else {
    if (player.iy < 25) {
      return {x:0,y:-speed/10};
    }
    return {x:0,y:speed/10};
  }
}
passRoutes.in = (player,speed) => {
  if (player.x < game.los + 5) {
    return {x:speed/10,y:0};
  } else {
    if (player.iy < 25) {
      return {x:0,y:speed/10};
    }
    return {x:0,y:-speed/10};
  }
}

const tiring = {recep:0.4,speed:5,elus:0.1};
const game = {};
const match = {};
var gameSockets = [];
var gameActive = false;
match.verifyRoster = (away,home) => {
  clubs.getTeamFromAbbr(away).then(awayTeam => {
    clubs.getTeamFromAbbr(home).then(homeTeam => {
      let valid = true;
      let awayPos = {QB:0,RB:0,WR:0,TE:0,OL:0,DL:0,LB:0,CB:0,S:0,K:0,P:0};
      let homePos = {QB:0,RB:0,WR:0,TE:0,OL:0,DL:0,LB:0,CB:0,S:0,K:0,P:0};
      for (let p of JSON.parse(awayTeam.roster)) {
        awayPos[idToPos(p)]++;
      }
      for (let p of JSON.parse(homeTeam.roster)) {
        homePos[idToPos(p)]++;
      }
      let needed = {QB:1,RB:1,WR:2,TE:1,OL:2,DL:2,LB:1,CB:3,S:1,K:1,P:1};
      for (let a in needed) {
        if (awayPos[a] < needed[a]) {
          valid = false;
          athletes.signCheapestOfPos(away,a).then(() => {
            match.verifyRoster(away,home);
          });
          break;
        }
      }
      for (let a in needed) {
        if (homePos[a] < needed[a]) {
          valid = false;
          athletes.signCheapestOfPos(home,a).then(() => {
            match.verifyRoster(away,home);
          });
          break;
        }
      }
      if (valid) {
        match.verifyPlays(away,home);
      }
    });
  });
}
match.verifyPlays = (away,home) => {
  clubs.getTeamFromAbbr(away).then(awayTeam => {
    clubs.getTeamFromAbbr(home).then(homeTeam => {
      let awayOffPlays = JSON.parse(awayTeam.offPlays);
      let homeOffPlays = JSON.parse(homeTeam.offPlays);
      let awayDefPlays = JSON.parse(awayTeam.defPlays);
      let homeDefPlays = JSON.parse(homeTeam.defPlays);
      let awaySpePlays = JSON.parse(awayTeam.spePlays);
      let homeSpePlays = JSON.parse(homeTeam.spePlays);
      let awayRoster = JSON.parse(awayTeam.roster);
      let homeRoster = JSON.parse(homeTeam.roster);
      let awayChange = {off:false,def:false,spe:false};
      let homeChange = {off:false,def:false,spe:false};
      let awayCase = {'1s':false,'1m':false,'1l':false,'1e':false,'2s':false,'2m':false,'2l':false,'2e':false,'3s':false,'3m':false,'3l':false,'3e':false,'4s':false,'4m':false,'4l':false,'4e':false,'2p':false};
      let homeCase = {'1s':false,'1m':false,'1l':false,'1e':false,'2s':false,'2m':false,'2l':false,'2e':false,'3s':false,'3m':false,'3l':false,'3e':false,'4s':false,'4m':false,'4l':false,'4e':false,'2p':false};
      let sql = '';
      for (let attr in awayOffPlays) {
        let playCheck = JSON.stringify(awayOffPlays[attr]);
        let play = awayOffPlays[attr];
        for (let c of play.cases) {
          awayCase[c] = true;
        }
        if (attr.indexOf('pass') != -1) { //is passing play
          for (let a of ['wr1r','wr2r','ter']) {
            if (!['go','slant','in','out','post','corner'].includes(play[a])) {
              awayChange.off = true;
              play[a] = 'go';
            }
          }
          let ordinals = {first:false,second:false,third:false};
          let recs = {wr1:false,wr2:false,te:false};
          for (let ord in ordinals) {
            if (['wr1','wr2','te'].includes(play[ord])) {
              ordinals[ord] = true;
            }
            for (let q of ['wr1','wr2','te']) {
              if (play[ord] == q) {
                recs[q] = true;
                break;
              }
            }
          }
          if (JSON.stringify(ordinals).indexOf('false') != -1) {
            awayChange.off = true;
            for (let ord in ordinals) {
              if (ordinals[ord] == false) {
                for (let rec in recs) {
                  if (recs[rec] == false) {
                    play[ord] = rec;
                    ordinals[ord] = true;
                    recs[rec] = true;
                  }
                }
              }
            }
          }
        }
        for (let o of [{a:'qb',p:'QB'},{a:'rb',p:'RB'},{a:'wr1',p:'WR'},{a:'wr2',p:'WR'},{a:'te',p:'TE'},{a:'ol1',p:'OL'},{a:'ol2',p:'OL'}]) {
          playCheck = JSON.stringify(awayOffPlays[attr]);
          if (play[o.a] == '' || play[o.a] == undefined || play[o.a] == null || !awayRoster.includes(play[o.a])) {
            awayChange.off = true;
            for (let id of awayRoster) {
              if (idToPos(id) == o.p && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[o.a] = id;
                break;
              }
            }
          }
        }
      }
      for (let c in awayCase) {
        if (awayCase[c] == false) {
          awayChange.off = true;
          awayOffPlays.pass1.cases.push(c);
        }
      }
      for (let attr in awayDefPlays) {
        let playCheck = JSON.stringify(awayDefPlays[attr]);
        let play = awayDefPlays[attr];
        for (let o of [{a:'dl1',p:'DL'},{a:'dl2',p:'DL'},{a:'lb',p:'LB'},{a:'cb1',p:'CB'},{a:'cb2',p:'CB'},{a:'cb3',p:'CB'},{a:'s',p:'S'}]) {
          playCheck = JSON.stringify(awayDefPlays[attr]);
          if (play[o.a] == '' || play[o.a] == undefined || play[o.a] == null || !awayRoster.includes(play[o.a])) {
            awayChange.def = true;
            for (let id of awayRoster) {
              if (idToPos(id) == o.p && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[o.a] = id;
                break;
              }
            }
          }
        }
      }
      for (let attr in awaySpePlays) {
        let playCheck = JSON.stringify(awaySpePlays[attr]);
        let play = awaySpePlays[attr];
        for (let pos in play) {
          playCheck = JSON.stringify(awaySpePlays[attr]);
          console.log(play[pos],'pos',pos);
          if (play[pos] == '' || play[pos] == undefined || play[pos] == null || !awayRoster.includes(play[pos])) {
            console.log('get',pos);
            awayChange.spe = true;
            for (let id of awayRoster) {
              if (idToPos(id) == pos.toUpperCase() && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[pos] = id;
                break;
              }
            }
          }
          console.log('new_player',play[pos],'at',pos);
        }
      }
      for (let attr in homeOffPlays) {
        let playCheck = JSON.stringify(homeOffPlays[attr]);
        let play = homeOffPlays[attr];
        for (let c of play.cases) {
          homeCase[c] = true;
        }
        if (attr.indexOf('pass') != -1) { //is passing play
          for (let a of ['wr1r','wr2r','ter']) {
            if (!['go','slant','in','out','post','corner'].includes(play[a])) {
              homeChange.off = true;
              play[a] = 'go';
            }
          }
          let ordinals = {first:false,second:false,third:false};
          let recs = {wr1:false,wr2:false,te:false};
          for (let ord in ordinals) {
            if (['wr1','wr2','te'].includes(play[ord])) {
              ordinals[ord] = true;
            }
            for (let q of ['wr1','wr2','te']) {
              if (play[ord] == q) {
                recs[q] = true;
                break;
              }
            }
          }
          if (JSON.stringify(ordinals).indexOf('false') != -1) {
            homeChange.off = true;
            for (let ord in ordinals) {
              if (ordinals[ord] == false) {
                for (let rec in recs) {
                  if (recs[rec] == false) {
                    play[ord] = rec;
                    ordinals[ord] = true;
                    recs[rec] = true;
                  }
                }
              }
            }
          }
        }
        for (let o of [{a:'qb',p:'QB'},{a:'rb',p:'RB'},{a:'wr1',p:'WR'},{a:'wr2',p:'WR'},{a:'te',p:'TE'},{a:'ol1',p:'OL'},{a:'ol2',p:'OL'}]) {
          playCheck = JSON.stringify(homeOffPlays[attr]);
          if (play[o.a] == '' || play[o.a] == undefined || play[o.a] == null || !homeRoster.includes(play[o.a])) {
            homeChange.off = true;
            for (let id of homeRoster) {
              if (idToPos(id) == o.p && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[o.a] = id;
                break;
              }
            }
          }
        }
      }
      for (let c in homeCase) {
        if (homeCase[c] == false) {
          homeChange.off = true;
          homeOffPlays.pass1.cases.push(c);
        }
      }
      for (let attr in homeDefPlays) {
        let playCheck = JSON.stringify(homeDefPlays[attr]);
        let play = homeDefPlays[attr];
        for (let o of [{a:'dl1',p:'DL'},{a:'dl2',p:'DL'},{a:'lb',p:'LB'},{a:'cb1',p:'CB'},{a:'cb2',p:'CB'},{a:'cb3',p:'CB'},{a:'s',p:'S'}]) {
          JSON.stringify(homeDefPlays[attr]);
          if (play[o.a] == '' || play[o.a] == undefined || play[o.a] == null || !homeRoster.includes(play[o.a])) {
            homeChange.def = true;
            for (let id of homeRoster) {
              if (idToPos(id) == o.p && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[o.a] = id;
                break;
              }
            }
          }
        }
      }
      for (let attr in homeSpePlays) {
        let playCheck = JSON.stringify(homeSpePlays[attr]);
        let play = homeSpePlays[attr];
        for (let pos in play) {
          playCheck = JSON.stringify(homeSpePlays[attr]);
          console.log(play[pos],'pos',pos);
          if (play[pos] == '' || play[pos] == undefined || play[pos] == null || !homeRoster.includes(play[pos])) {
            console.log('get',pos);
            homeChange.spe = true;
            for (let id of homeRoster) {
              if (idToPos(id) == pos.toUpperCase() && playCheck.indexOf(id) == -1) { //player right pos and not in play
                play[pos] = id;
                break;
              }
            }
          }
          console.log('new_player',play[pos],'at',pos);
        }
      }
      if (awayChange.off) {
        sql += `UPDATE teams SET offPlays='${JSON.stringify(awayOffPlays)}' WHERE abbr='${away}';`;
      }
      if (awayChange.def) {
        sql += `UPDATE teams SET defPlays='${JSON.stringify(awayDefPlays)}' WHERE abbr='${away}';`;
      }
      if (awayChange.spe) {
        sql += `UPDATE teams SET spePlays='${JSON.stringify(awaySpePlays)}' WHERE abbr='${away}';`;
      }
      if (homeChange.off) {
        sql += `UPDATE teams SET offPlays='${JSON.stringify(homeOffPlays)}' WHERE abbr='${home}';`;
      }
      if (homeChange.def) {
        sql += `UPDATE teams SET defPlays='${JSON.stringify(homeDefPlays)}' WHERE abbr='${home}';`;
      }
      if (homeChange.spe) {
        sql += `UPDATE teams SET spePlays='${JSON.stringify(homeSpePlays)}' WHERE abbr='${home}';`;
      }
      if (sql == '') {
        match.startGame(away,home);
      } else {
        //console.log(sql);
        request(sql).then(() => {
          match.startGame(away,home);
        });
      }
    });
  });
}
match.startGame = (away,home) => { //does not use game object
  athletes.getAllPlayers().then(allPlayers => {
    clubs.getTeamFromAbbr(away).then(awayTeam => {
      clubs.getTeamFromAbbr(home).then(homeTeam => {
        awayTeam.cap = awayTeam.dead;
        homeTeam.cap = homeTeam.dead;
        for (let d of JSON.parse(awayTeam.delegates)) {
          awayTeam.cap += d.investment;
        }
        for (let d of JSON.parse(homeTeam.delegates)) {
          homeTeam.cap += d.investment;
        }
        awayTeam.fieldPlayers = expandPlayers(athletes.getRosterFromPlayers(allPlayers,away));
        homeTeam.fieldPlayers = expandPlayers(athletes.getRosterFromPlayers(allPlayers,home));
        for (let p of awayTeam.fieldPlayers) {
          awayTeam.cap += p.base * p.duration + p.guar;
        }
        for (let p of homeTeam.fieldPlayers) {
          homeTeam.cap += p.base * p.duration + p.guar;
        }
        if (awayTeam.division == homeTeam.division) { //regular season check later
          game.divisional = true;
        } else {
          game.divisional = false;
        }
        console.log('cap spending | away:',awayTeam.cap,'home:',homeTeam.cap);
        if (awayTeam.cap > 200000) {
          news.newStory([away,home],`The ${awayTeam.mascot} are playing over the cap against the ${homeTeam.mascot}.`);
        }
        if (homeTeam.cap > 200000) {
          news.newStory([away,home],`The ${homeTeam.mascot} are playing over the cap against the ${awayTeam.mascot}.`);
        }
        for (let a of [awayTeam,homeTeam]) { //remove account information
          a.activated = undefined;
          a.dead = undefined; //do cap calc before
          a.delegates = undefined;
          a.division = undefined;
          a.email = undefined;
          a.emailActivated = undefined;
          a.factorActivated = undefined;
          a.hash = undefined;
          a.id = undefined;
          a.recoHash = undefined;
          a.recoSalt = undefined;
          a.salt = undefined;
          a.tempHash = undefined;
          a.tempSalt = undefined;
          a.tips = undefined;
          a.tokenHash = undefined;
          a.tokenSalt = undefined;
          a.twoFactor = undefined;
        }
        awayTeam.roster = JSON.parse(awayTeam.roster);
        homeTeam.roster = JSON.parse(homeTeam.roster);
        awayTeam.stats = JSON.parse(awayTeam.stats);
        homeTeam.stats = JSON.parse(homeTeam.stats);
        awayTeam.s = {};
        homeTeam.s = {};
        for (let attr in awayTeam.stats) {
          awayTeam.s[attr] = 0;
        }
        for (let attr in homeTeam.stats) {
          homeTeam.s[attr] = 0;
        }
        for (let p of awayTeam.fieldPlayers.concat(homeTeam.fieldPlayers)) {
          if (p.stat1.js != 'dist') {
            p[`${p.stat1.js}Distr`] = p[p.stat1.js];
            p[p.stat1.js] = normalRandom(p.stat1.m,p.stat1.s,1);
          } else {
            p[p.stat1.js] = {m:p.stat1.m,s:p.stat1.s};
          }
          if (p.stat2.js != 'kickReturn') {
            p[`${p.stat2.js}Distr`] = p[p.stat2.js];
            p[p.stat2.js] = normalRandom(p.stat2.m,p.stat2.s);
          } else {
            p[p.stat2.js] = {m:p.stat2.m,s:p.stat2.s};
          }
          if (p.stat3.js != 'puntReturn') {
            p[`${p.stat3.js}Distr`] = p[p.stat3.js];
            p[p.stat3.js] = normalRandom(p.stat3.m,p.stat3.s);
          } else {
            p[p.stat3.js] = {m:p.stat3.m,s:p.stat3.s};
          }
          if (p.stat4.js != 'speed') {
            p[`${p.stat4.js}Distr`] = p[p.stat4.js];
            p[p.stat4.js] = normalRandom(p.stat4.m,p.stat4.s);
          } else {
            p[p.stat4.js] = {m:p.stat4.m,s:p.stat4.s};
          }
        }
        awayTeam.offPlays = JSON.parse(awayTeam.offPlays);
        awayTeam.defPlays = JSON.parse(awayTeam.defPlays);
        awayTeam.spePlays = JSON.parse(awayTeam.spePlays);
        homeTeam.offPlays = JSON.parse(homeTeam.offPlays);
        homeTeam.defPlays = JSON.parse(homeTeam.defPlays);
        homeTeam.spePlays = JSON.parse(homeTeam.spePlays);
        game.off = 'home';
        game.def = 'away';
        game.away = awayTeam;
        game.home = homeTeam;
        game.q = 1;
        game.s = 9000;
        game.down = 1;
        game.toGo = 10;
        game.awayScore = 0;
        game.homeScore = 0;
        game.awaySbq = [0,0,0,0];
        game.homeSbq = [0,0,0,0];
        game.plays = [];
        game.conversion = false;
        gameActive = true;
        request(`UPDATE games SET status='ongoing' WHERE away='${away}' AND home='${home}' AND week=${getCurrentWeek()}`);
        match.kickoff();
      });
    });
  });
}
match.kickoff = () => { //off is kicking team, def is receiving team
  if (game.awayPoss && game.homePoss) {
    return match.advancePeriod();
  }
  var k = match.getPlayer(game.off,game[game.off].spePlays.kickoff.k);
  console.log('KICKER',game[game.off].spePlays.kickoff.k,k);
  if (Math.random() < k.touchback) {
    console.log('touchback');
    match.playUpdate(game.off,`${k.fName} ${k.lName} kicked off for a TOUCHBACK`,false);
    match.changePos(25);
  } else {
    console.log('not a touchback');
    var rb = match.getPlayer(game.def,game[game.def].spePlays.return.rb);
    let newLos = 10 + 2.5 * normalRandom(rb.puntReturn.m,rb.puntReturn.s);
    match.playUpdate(game.off,`${k.fName} ${k.lName}'s kickoff was returned by ${rb.fName} ${rb.lName} to the ${game[game.off].abbr} ${Math.round(newLos)}-yd line`,false);
    match.changePos(newLos);
  }
}
match.changePos = newLos => {
  if (game.awayPoss && game.homePoss) {
    return match.advancePeriod();
  }
  game.los = Math.round(newLos);
  game.los = (game.los<=0)?1:game.los;
  game.los = (game.los>=100)?99:game.los;
  if (game.off == 'away') {
    game.off = 'home';
    game.def = 'away';
  } else {
    game.def = 'home';
    game.off = 'away';
  }
  if (game.q > 4) { //in ot
    game[`${game.off}Poss`] = true;
  }
  console.log('new off',game.off);
  for (let p of game[game.off].fieldPlayers) {
    p.tire = -1;
  }
  match.stat(game.off,'drives',1);
  match.update({type:'poss',team:game.off});
  game.down = 1;
  game.toGo = 10;
  match.play();
}
match.punt = () => {
  console.log('punting');
  var p = match.getPlayer(game.off,game[game.off].spePlays.punt.p);
  match.stat(p,'att',1);
  if (Math.random() < p.blocked) {
    match.stat(p,'blocked',1);
    console.log('punt blocked');
    match.playUpdate(game.off,`${p.fName} ${p.lName}'s punt was BLOCKED`);
    return match.delay(function() { match.changePos(100-game.los); },6);
  }
  var rb = match.getPlayer(game.def,game[game.def].spePlays.puntReturn.rb);
  var travel = Math.round(normalRandom(p.dist.m,p.dist.s));
  if (Math.random() < p.oob) { //out of bounds
    travel = Math.round(Math.sqrt(travel**2 + 625));
    match.playUpdate(game.off,`${p.fName} ${p.lName} punted for ${Math.round(travel)} yards`);
    match.stat(p,'yds',travel);
    match.stat(p,'netYds',travel);
    if (game.los + travel > 80) {
      match.stat(p,'in20',1);
    }
    return match.delay(function() { match.changePos(100 - game.los - travel); },6);
  }
  if (game.los + travel >= 100 && Math.random() < p.aware) { //try to avoid touchback
    travel -= 10;
  }
  if (game.los + travel >= 100) { //touchback
    match.playUpdate(game.off,`${p.fName} ${p.lName} punted for a TOUCHBACK`);
    match.stat(p,'yds',100 - game.los);
    match.stat(p,'netYds',80 - game.los);
    return match.delay(function() { match.changePos(20); },6);
  }
  var retDist = Math.round(normalRandom(rb.puntReturn.m,rb.puntReturn.s));
  var newLine = game.los + travel - retDist;
  newLine = (newLine>99)?99:newLine;
  var a = match.article(retDist);
  match.playUpdate(game.off,`${p.fName} ${p.lName} punted for ${Math.round(travel)} yards with ${a} ${Math.round(retDist)}-yd return by ${rb.fName} ${rb.lName}`);
  match.stat(p,'yds',travel);
  match.stat(p,'netYds',travel - retDist);
  if (newLine > 80) {
    match.stat(p,'in20',1);
  }
  match.statUpdate([p]);
  match.delay(function() { match.changePos(100 - newLine); },6);
}
//play
match.play = () => {
  if (game.s <= 2) { //account for variances w/ 2
    return match.advancePeriod();
  }
  console.log('starting play at time',Number((game.s/600).toFixed(3)),'in quarter',game.q);
  match.downUpdate();
  let toGo = game.toGo;
  if (game.los + game.toGo >= 100) { //goal to go
    console.log('goal to go');
    toGo = 100 - game.los;
  }
  if (game.conversion) {
    var sit = '2p';
  } else { //is not 2pt attempt
    if (toGo < 4) {
      var d = 's';
    } else if (toGo < 7) {
      var d = 'm';
    } else if (toGo < 11) {
      var d = 'l';
    } else {
      var d = 'e';
    }
    var sit = game.down + d;
  }
  console.log(sit,game.down,'&',game.toGo);
  match.stat(game.off,'plays',1);
  match.stat(game.def,'defPlays',1);
  for (let n in game[game.off].offPlays) {
    if (game[game.off].offPlays[n].cases.includes(sit)) {
      if (n.indexOf('pass') == -1) {
        match.rush(game[game.off].offPlays[n],game[game.def].defPlays[n]);
      } else {
        match.pass(game[game.off].offPlays[n],game[game.def].defPlays[n]);
      }
    }
  }
}
//passing
match.pass = (offPlay,defPlay) => {
  match.resetField(offPlay,defPlay);
  //drawField(game[game.off].fieldPlayers,game[game.def].fieldPlayers,game.los,game.toGo);
  var off = {};
  var def = {};
  for (let p of ['ol1','ol2','qb','rb','te','wr1','wr2']) {
    off[p] = match.getPlayer(game.off,offPlay[p]);
    if (off[p].speed) {
      off[p].playSpeed = normalRandom(off[p].speed.m,off[p].speed.s);
    }
    if (p == 'ol1' || p == 'ol2') {
      match.stat(off[p],'defended',1);
    }
  }
  for (let p of ['dl1','dl2','lb','cb1','cb2','cb3','s']) {
    def[p] = match.getPlayer(game.def,defPlay[p]);
    if (def[p].speed) {
      def[p].playSpeed = normalRandom(def[p].speed.m,def[p].speed.s);
    }
    if (['dl1','dl2','lb'].includes(p)) {
      match.stat(def[p],'playsDef',1);
    }
  }
  var qb = off.qb;
  var delay = qb.passDelay;
  var i = 0; //needed
  match.update({type:'startClock',s:game.s});
  var interval = setInterval(() => {
    if (!game.conversion) {
      game.s--;
    }
    //update();
    for (let s of ['wr1','wr2','te']) { //move recievers
      let p = off[s];
      let v = passRoutes[offPlay[`${s}r`]](p,p.playSpeed);
      p.x += v.x;
      p.y += v.y;
      p.y = (p.y<0)?0:p.y;
      p.y = (p.y>50)?50:p.y;
    }
    for (let s of ['cb1','cb2','cb3']) { //move cornerbacks
      let p = def[s];
      let d = p.playSpeed;
      let r = off[match.getOther(s)];
      if (r.playSpeed < d) { //defender is faster
        d = r.playSpeed;
        if (match.distance(r,qb) < match.distance(p,qb)) { //let reciever catch up to defender
          d = d / 2;
        }
      }
      let v = passRoutes[offPlay[`${match.getOther(s)}r`]](p,d);
      p.x += v.x;
      p.y += v.y;
      p.y = (p.y<0)?0:p.y;
      p.y = (p.y>50)?50:p.y;
    }
    for (let s of ['dl1','dl2','lb']) { //move d line
      let p = def[s];
      let v = match.towards(p,qb);
      p.x += v.x;
      p.y += v.y;
      p.y = (p.y<0)?0:p.y;
      p.y = (p.y>50)?50:p.y;
    }
    if (match.distance(off.ol1,def.dl1) < 0.5) { //check stuff
      if (Math.random() < off.ol1.stuff * (1 - def.dl1.escape) && !off.ol1.stuffAtt) {
        def.dl1.playSpeed = 0;
        def.dl1.stuffed = true;
      } else {
        off.ol1.stuffAtt = true;
      }
    }
    if (match.distance(off.ol2,def.dl2) < 0.5) { //check stuff
      if (Math.random() < off.ol2.stuff * (1 - def.dl2.escape) && !off.ol2.stuffAtt) {
        def.dl2.playSpeed = 0;
        def.dl2.stuffed = true;
      } else {
        off.ol2.stuffAtt = true;
      }
    }
    if (match.distance(off.rb,def.lb) < 0.5) { //check block
      if (Math.random() < off.rb.block * (1 - def.lb.escape) && !off.rb.stuffAtt) {
        def.lb.playSpeed = 0;
        def.lb.stuffed = true;
      } else {
        off.rb.stuffAtt = true;
      }
    }
    for (let s of ['ol1','ol2','rb']) { //move o line and rb
      if (!def[match.getOther(s)].stuffed) {
        let p = off[s];
        let v = match.towards(p,def[match.getOther(s)]);
        p.x += v.x;
        p.y += v.y;
        p.y = (p.y<0)?0:p.y; //vertical overflow prevention
        p.y = (p.y>50)?50:p.y;
      }
    }
    i++;
    //drawField(game[game.off].fieldPlayers,game[game.def].fieldPlayers,game.los,game.toGo);
    if (i == Math.round(delay*10)) { //start of ball is thrown code
      clearInterval(interval);
      match.update({type:'stopClock'});
      for (let s of ['ol1','ol2']) {
        if (Math.random() < off[s].holding) { //holding penalty
          //off[s].s.holding++; //stats
          match.stat(off[s],'holding',1);
          match.playUpdate(game.off,`A holding penalty was called on ${off[s].fName} ${off[s].lName}`);
          game.down--; //replay down
          if (qb.x <= 13) { //half distance to goal with los at 20 (qb 7 yds back)
            qb.x += 7; //move qb back to los
            qb.x /= 2;
          } else { //move 3 more for even 10
            qb.x -= 3;
          }
          qb.x = (qb.x<1)?1:qb.x;
          return match.tackled(qb);
        }
      }
      for (let s of ['dl1','dl2','lb']) { //check sack
        console.log(s,'dist =',match.distance(def[s],qb));
        if (match.distance(def[s],qb) < 1.5) {
          console.log('sackable');
          let mult = 1;
          if (off[match.getOther(s)].sackAv != undefined) { //mult approx 0.1
            mult = 1 - off[match.getOther(s)].sackAv;
          } else {
            mult = 0.1;
          }
          console.log('sack chance',def[s].tackle * mult,'(',def[s].tackle,',',mult,')');
          if (Math.random() < def[s].tackle * mult) {
            console.log('sacked, count against',match.getOther(s),'by',s);
            if (['dl1','dl2'].includes(s)) { //stats
              //off[match.getOther(s)].s.sacks++;
              match.stat(off[match.getOther(s)],'sacks',1);
            }
            //def[s].s.sacks++;
            match.stat(game.def,'sacks',1);
            match.stat(def[s],'sacks',1);
            match.playUpdate(game.def,`${qb.fName} ${qb.lName} was sacked by ${def[s].fName} ${def[s].lName}`);
            return match.tackled(qb);
          }
        }
      }
      var press = 0; //ball is actually thrown
      match.stat(qb,'att',1);
      //qb.s.att++; //stats
      for (let s of ['dl1','dl2','lb']) {
        if (match.distance(qb,def[s]) < 3 && Math.random() < def[s].pressPerc) {
          if (['dl1','dl2'].includes(s)) {
            match.stat(off[match.getOther(s)],'pressures',1);
          }
          match.stat(def[s],'pressures',1);
          press = qb.pressPen;
        }
      }
      if (Math.random() < 0.5) {
        var ord = 'first';
      } else if (Math.random() < 0.6) {
        var ord = 'second';
      } else {
        var ord = 'third';
      }
      var rec = off[offPlay[ord]];
      var route = offPlay[`${offPlay[ord]}r`];
      console.log('route',route);
      if (route == 'go') { //vary tire based on route
        rec.tire += 1.2;
      } else if (route == 'corner' || route == 'post') {
        rec.tire++;
      } else if (route == 'in' || route == 'out') {
        rec.tire += 0.9;
      } else {
        rec.tire += 0.8;
      }
      rec.tire = (rec.tire>10)?10:rec.tire;
      var cov = def[match.getOther(offPlay[ord])];
      cov.tAtt = true; //first defender not checked
      match.stat(rec,'att',1);
      match.stat(cov,'targets',1);
      if (rec.x - game.los < 10) { //short pass
        var acc = qb.acc - press;
        var recep = rec.recep - rec.tire * tiring.recep / 10;
      } else { //long pass
        var acc = qb.longAcc - press;
        var recep = rec.longRecep - rec.tire * tiring.recep / 10;
      }
      if (rec.x - game.los >= 20) { //extra long pass
        acc *= 0.9;
      }
      if (Math.random() < acc) { //ball is accurate
        if (Math.random() < recep * (1 - cov.cover)) { //ball is caught
          match.stat(qb,'comp',1);
          match.stat(rec,'recep',1);
          match.stat(cov,'allowed',1);
          match.stat(cov,'att',1);
          if (Math.random() < cov.tackle * (1 - rec.elus)) { //after ball is caught rec is tackled
            match.stat(cov,'tackles',1);
            match.passUpdate(qb,rec,cov);
            match.tackled(rec,qb); //stats track in tackle
          } else { //rec not tackled
            console.log('escaped tackle');
            match.update({type:'startClock',s:game.s});
            var interval2 = setInterval(() => {
              if (!game.conversion) {
                game.s--;
              }
              //update();
              //drawField(game[game.off].fieldPlayers,game[game.def].fieldPlayers,game.los,game.toGo);
              rec.x += rec.playSpeed/10;
              if (rec.x >= 100) {
                clearInterval(interval2);
                match.update({type:'stopClock'});
                match.passUpdate(qb,rec,def);
                return match.tackled(rec,qb);
              }
              for (let s of ['cb1','cb2','cb3','s']) {
                if (!def[s].tAtt) {
                  let v = match.towards(def[s],rec);
                  def[s].x += v.x;
                  def[s].y += v.y;
                }
                if (match.distance(def[s],rec) < 0.5 && !def[s].tAtt) {
                  console.log('tackle attempt');
                  def[s].tAtt = true;
                  match.stat(def[s],'att',1);
                  if (Math.random() < def[s].tackle * (1 - rec.elus)) { //this def can tackle rec
                    match.stat(def[s],'tackles',1);
                    clearInterval(interval2);
                    match.update({type:'stopClock'});
                    match.passUpdate(qb,rec,def);
                    return match.tackled(rec,qb);
                  }
                }
              }
            },100);
          }
        } else { //ball falls incomplete
          console.log('incomplete');
          match.playUpdate(game.off,`${qb.fName} ${qb.lName} threw an incomplete pass to ${rec.fName} ${rec.lName}`);
          match.incomplete(offPlay);
        }
      } else { //ball is inaccurate
        if (Math.random() < cov.int) { //ball is intercepted
          console.log('intercepted');
          //cov.s.int++; //stats
          //qb.s.int++; //stats
          match.stat(cov,'int',1);
          match.stat(qb,'int',1);
          match.stat(game.def,'int',1);
          match.playUpdate(game.def,`${cov.fName} ${cov.lName} INTERCEPTED a ball from ${qb.fName} ${qb.lName}`);
          match.intercepted(cov);
        } else { //ball falls incomplete
          console.log('incomplete');
          match.playUpdate(game.off,`${qb.fName} ${qb.lName} threw an incomplete pass to ${rec.fName} ${rec.lName}`);
          match.incomplete(offPlay);
        }
      }
    }
  },100);
}
match.passUpdate = (qb,rec,def) => {

  let txt = `${rec.fName} ${rec.lName} caught a pass from ${qb.fName} ${qb.lName}`;
  if (Math.round(rec.x) >= 100) { //touchdown
    txt += ` for ${match.article(100 - game.los)} ${100 - game.los}-yd TOUCHDOWN`;
  } else if (Math.round(rec.x) <= 0) { //safety
    return match.playUpdate(game.def,`${def.fName} ${def.lName} tackled ${rec.fName} ${rec.lName} for a SAFETY`);
  } else {
    txt += ` for ${match.article(Math.round(rec.x) - game.los)} ${Math.round(rec.x) - game.los}-yd gain`;
  }
  match.playUpdate(game.off,txt);
}
match.incomplete = play => {
  if (game.conversion) {
    return match.failed();
  }
  let qb = match.getPlayer(game.off,play.qb);
  qb.x = game.los;
  match.tackled(qb);
}
match.intercepted = def => {
  if (game.conversion) {
    return match.failed();
  }
  setTimeout(() => { match.changePos(100 - def.x); },3000);
}
//rushing
match.rush = (offPlay,defPlay) => {
  match.resetField(offPlay,defPlay);
  //drawField(game[game.off].fieldPlayers,game[game.def].fieldPlayers,game.los,game.toGo);
  var off = {};
  var def = {};
  for (let p of ['ol1','ol2','qb','rb','te','wr1','wr2']) {
    off[p] = match.getPlayer(game.off,offPlay[p]);
    if (off[p].speed) {
      off[p].playSpeed = normalRandom(off[p].speed.m,off[p].speed.s);
    }
  }
  for (let p of ['dl1','dl2','lb','cb1','cb2','cb3','s']) {
    def[p] = match.getPlayer(game.def,defPlay[p]);
    if (def[p].speed) {
      def[p].playSpeed = normalRandom(def[p].speed.m,def[p].speed.s);
    }
  }
  var rb = off.rb;
  rb.tire++;
  rb.tire = (rb.tire>10)?10:rb.tire;
  match.stat(rb,'att',1);
  if (offPlay.name == 'Up the Middle') {
    var waypoint = {x:game.los,y:22.5};
  } else if (offPlay.name == 'To the Left') {
    var waypoint = {x:game.los,y:15};
  } else {
    var waypoint = {x:game.los,y:30};
  }
  //var i = 0;
  match.update({type:'startClock',s:game.s});
  var interval = setInterval(() => {
    if (!game.conversion) {
      game.s--;
    }
    //update();
    if (rb.x < game.los) {
      var v = match.towards(rb,waypoint);
    } else {
      var v = match.rbPath(rb,def);
    }
    rb.x += v.x;
    rb.y += v.y;
    rb.y = (rb.y<0)?0:rb.y;
    rb.y = (rb.y>50)?50:rb.y;
    //if (i > 4) {
    for (let s of ['dl1','dl2','lb','cb1','cb2','cb3','s']) {
      let p = def[s];
      let vd = match.towards(p,rb);
      p.x += vd.x;
      p.y += vd.y;
      p.y = (rb.y<0)?0:p.y;
      p.y = (rb.y>50)?50:p.y;
      if (match.distance(rb,p) < 0.5 && !p.tAtt) {
        p.tAtt = true;
        match.stat(p,'att',1);
        if (Math.random() < p.tackle * (1 - rb.elus) * (1 + rb.tire * tiring.elus / 10)) { //actually tackled
          clearInterval(interval);
          match.stat(p,'tackles',1);
          match.update({type:'stopClock'});
          match.rushUpdate(rb);
          return match.tackled(rb);
        } else {
          console.log('failed tackle',Number(rb.elus.toFixed(3)));
        }
      }
    }
    //}
    if (Math.round(rb.x) >= 100) {
      clearInterval(interval);
      match.update({type:'stopClock'});
      match.rushUpdate(rb);
      return match.tackled(rb);
    }
    //i++;
    //drawField(game[game.off].fieldPlayers,game[game.def].fieldPlayers,game.los,game.toGo);
  },100);
}
match.rushUpdate = rb => {
  let dist = Math.round(rb.x) - game.los;
  if (dist == 1) {
    var yd = 'yard';
  } else {
    var yd = 'yards';
  }
  var txt = `${rb.fName} ${rb.lName} ran for ${dist} ${yd}`;
  if (Math.round(rb.x) >= 100) {
    txt += ' for a TOUCHDOWN';
  } else if (Math.round(rb.x) <= 0) {
    txt += ' for a SAFETY';
    return match.playUpdate(game.def,txt);
  }
  match.playUpdate(game.off,txt);
}
//rushing resources
match.towards = (player,landmark,speed) => {
  if (!speed) {
    if (player.tire === undefined || player.tire < 0) {
      player.tire = 0;
    }
    speed = player.playSpeed - tiring.speed * player.tire / 10;
  }
  speed = speed / 10;
  var x = landmark.x - player.x;
  var y = landmark.y - player.y;
  var l = Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
  return {x:x/l*speed,y:y/l*speed};
}
match.rbPath = (rb,defs) => {
  var tFactor = 0;
  var a0 = 0;
  var b0 = 0;
  for (let i = -Math.PI * 5 / 12; i <= Math.PI * 5 / 12; i += Math.PI / 12) {
    let m = Math.tan(i);
    let a = m;
    let b = -1;
    let c = rb.y - m * rb.x;
    let t = 0;
    for (let n in defs) {
      if (defs[n].x < rb.x || defs[n].tAtt) {
        continue;
      }
      let d = Math.abs(a * defs[n].x + b * defs[n].y + c) / Math.sqrt(Math.pow(a,2) + Math.pow(b,2));
      let e = match.distance(rb,defs[n]);
      t += d * (1 / Math.pow(e,2));
    }
    if (t > tFactor) {
      tFactor = t;
      a0 = a;
      b0 = b;
      c0 = c;
      i0 = i;
    }
  }
  if (b0 == 0) {
    return {x:rb.playSpeed/10 - tiring.speed * rb.tire / 10,y:0};
  }
  var dx = 10;
  var dy = dx * -a0 / b0;
  var point = {x:rb.x+dx,y:rb.y+dy}
  return match.towards(rb,point);
}
//tackled
match.tackled = (player,qb) => {
  let toUpdate = [player];
  if (qb) {
    toUpdate.push(qb);
  }
  for (let p of game[game.off].fieldPlayers) {
    if (p.pos == 'OL') {
      toUpdate.push(p);
    }
  }
  for (let p of game[game.def].fieldPlayers) {
    if (['DL','CB','S','LB'].includes(p.pos)) {
      toUpdate.push(p);
    }
  }
  setTimeout(() => { match.statUpdate(toUpdate); },2000); //update player stats
  if (game.conversion) {
    return match.convTackled(player);
  }
  let x = (player.x>100)?100:Math.round(player.x);
  match.stat(game.off,'yds',x - game.los);
  match.stat(game.def,'defYds',x - game.los);
  if (player.pos == 'RB') {
    match.stat(game.off,'rushYds',x - game.los);
    match.stat(game.def,'defRushYds',x - game.los);
  } else {
    match.stat(game.off,'passYds',x - game.los);
    match.stat(game.def,'defPassYds',x - game.los);
  }
  if (player.pos != 'QB') { //reject tackles and holding penalties
    match.stat(player,'yds',x - game.los);
    if (['WR','TE'].includes(player.pos)) { //credit qb with rec's yds
      match.stat(qb,'yds',x - game.los);
    }
  }
  if (Math.round(player.x) >= 100) { //touchdown
    match.stat(player,'td',1);
    if (['WR','TE'].includes(player.pos)) { //credit qb with rec's td
      match.stat(qb,'td',1);
    }
    return match.score(6);
  } else if (Math.round(player.x) <= 0) { //safety
    match.playUpdate(game.def,`${player.fName} ${player.lName} was tackled for a safety`);
    return match.score(4);
  }
  let diff = game[`${game.off}Score`] - game[`${game.def}Score`];
  if (game.los >= 55 && game.s < 150 && (game.q == 2 || (game.q == 4 && diff < 0 && diff >= -3))) { //go for early field goal
    if (game.s > 50) {
      return match.delay(function() { match.fieldGoal(); },5);
    } else {
      return match.delay(function() { match.fieldGoal(); },Math.floor((game.s-1)/10));
    }
  }
  var dist = Math.round(player.x) - game.los;
  console.log('progress',dist);
  game.los += dist;
  game.toGo -= dist;
  if (game.toGo <= 0) {
    game.toGo = 10;
    game.down = 1;
    match.stat(game.off,'firstDowns',1);
  } else {
    game.down++;
  }
  if (game.down > 4) {
    if (game.q > 4) {
      return match.kickoff();
    }
    setTimeout(() => { match.changePos(100 - player.x); },1000);
  } else if (game.down == 4) {
    if (match.onFourth()) {
      console.log('go for it');
      match.playUpdate(game.off,`The ${game[game.off].mascot} are going for it on FOURTH DOWN`);
      setTimeout(() => { match.downUpdate(); match.update({type:'teamStats',as:game.away.s,hs:game.home.s}); },3000);
      setTimeout(() => { match.play(); },1000);
    } else {
      console.log('don\'t be an idiot');
      if (game.los >= 55) {
        match.downUpdate();
        if (game.s > 50) {
          match.delay(function() { match.fieldGoal(); },5);
        } else {
          match.delay(function() { match.fieldGoal(); },Math.floor((game.s-1)/10));
        }
      } else {
        if (game.down < 5) {
          setTimeout(() => { match.downUpdate(); match.update({type:'teamStats',as:game.away.s,hs:game.home.s}); },1500);
        }
        setTimeout(()=>{match.punt();},3000);
      }
    }
  } else {
    //setTimeout(() => { match.play(); },1000);
    var del = 30 + Math.floor(Math.random() * 11);
    //var del = 2;
    if (game.s <= 1200 && (game.q == 2 || (game.q == 4 && game[`${game.off}Score`] < game[`${game.def}Score`]))) { //reduce del if q1 or beind in q4
      del = 10;
    }
    if (game.q > 4) { //reduce del in ot
      del = 10;
    }
    if (game.down < 5) {
      setTimeout(() => { match.downUpdate(); match.update({type:'teamStats',as:game.away.s,hs:game.home.s}); },3000);
    }
    match.delay(function() { match.play(); },del);
  }
}
match.convTackled = player => {
  game.conversion = false;
  if (Math.round(player.x) >= 100) { //2pt conversion
    match.playUpdate(game.off,`The ${game[game.off].mascot}'s 2-PT attempt is GOOD`);
    match.score(2);
  } else { //failed 2pt conversion
    match.failed();
  }
}
match.failed = () => {
  game.conversion = false;
  match.playUpdate(game.off,`The ${game[game.off].mascot}'s 2-pt attempt is NO GOOD`);
  setTimeout(() => { match.kickoff(); },3000);
}
//points and conversions
match.score = pts => {
  if (pts == 4) {
    match.update({type:'score',team:game.def,pts:2}); //don't count pts for safeties b/c not scored by off
  } else {
    match.update({type:'score',team:game.off,pts:pts});
    match.stat(game.off,'pts',pts);
    match.stat(game.def,'allowPts',pts);
  }
  if (pts == 6) { //touchdown
    console.log('TOUCHDOWN',game.off.toUpperCase());
    match.stat(game.off,'td',1);
    match.stat(game.def,'allowTd',1);
    game[`${game.off}Score`] += pts;
    game[`${game.off}Sbq`][game.q - 1] += pts;
    setTimeout(() => { match.conversion(); },3000);
  } else if (pts == 3) { //field goal
    game[`${game.off}Score`] += pts;
    game[`${game.off}Sbq`][game.q - 1] += pts;
    setTimeout(() => { match.kickoff(); },3000);
  } else if (pts == 2) { //2pt conversion
    game[`${game.off}Score`] += pts;
    game[`${game.off}Sbq`][game.q - 1] += pts;
    setTimeout(() => { match.kickoff(); },3000);
  } else if (pts == 1) { //extra point
    game[`${game.off}Score`]++;
    game[`${game.off}Sbq`][game.q - 1]++;
    setTimeout(() => { match.kickoff(); },3000);
  } else { //safety
    game[`${game.def}Score`] += 2;
    game[`${game.def}Sbq`][game.q - 1] += 2;
    setTimeout(() => { match.changePos(40); },3000);
  }
  match.update({type:'teamStats',as:game.away.s,hs:game.home.s});
  console.log(`UPDATE games SET awayScore=${game.awayScore},homeScore=${game.homeScore},awaySbq='${JSON.stringify(game.awaySbq)}',homeSbq='${JSON.stringify(game.homeSbq)}' WHERE away='${game.away.abbr}' AND home='${game.home.abbr}' AND week=${getCurrentWeek()};`);
  request(`UPDATE games SET awayScore=${game.awayScore},homeScore=${game.homeScore},awaySbq='${JSON.stringify(game.awaySbq)}',homeSbq='${JSON.stringify(game.homeSbq)}' WHERE away='${game.away.abbr}' AND home='${game.home.abbr}' AND week=${getCurrentWeek()};`);
}
match.conversion = () => {
  console.log('conversion');
  var diff = game[`${game.off}Score`] - game[`${game.def}Score`];
  var diffs = [-15,-13,-11,-10,-8,-5,-2,1,5,12];
  if (game.q == 4 && game.s < 6001 && diffs.includes(diff)) {
    match.playUpdate(game.off,`The ${game[game.off].mascot} are GOING FOR TWO`);
    match.twoPoint();
  } else {
    match.pat();
  }
}
match.pat = () => {
  var k = match.getPlayer(game.off,game[game.off].spePlays.pat.k);
  match.stat(k,'patAtt',1);
  if (Math.random() < k.pat) {
    console.log('pat is good');
    match.stat(k,'pat',1);
    match.stat(k,'pts',1);
    match.playUpdate(game.off,`The extra point from ${k.fName} ${k.lName} is GOOD`,false);
    match.score(1);
  } else {
    match.playUpdate(game.off,`The extra point from ${k.fName} ${k.lName} is NO GOOD`,false);
    console.log('pat is no good');
    match.kickoff();
  }
  match.update({type:'teamStats',as:game.away.s,hs:game.home.s});
  match.statUpdate([k]);
}
match.twoPoint = () => {
  for (let p of game[game.off].fieldPlayers) { //reset tire for 2pt
    p.tire = -1;
  }
  game.los = 98;
  game.conversion = true;
  match.play();
}
match.fieldGoal = () => {
  if (game.los >= 77) {
    console.log('short fg');
    var k = match.getPlayer(game.off,game[game.off].spePlays.fg.k);
    var chance = k.fg;
    match.stat(k,'under40Att',1);
  } else {
    console.log('long fg');
    var k = match.getPlayer(game.off,game[game.off].spePlays.longFg.k);
    var chance = k.longFg;
    match.stat(k,'over40Att',1);
  }
  if (Math.random() < chance) {
    match.stat(k,'pts',3);
    if (game.los >= 77) {
      match.stat(k,'under40',1);
    } else {
      match.stat(k,'over40',1);
    }
    console.log('fg is good');
    match.playUpdate(game.off,`The ${117 - game.los}-yd field goal from ${k.fName} ${k.lName} is GOOD`);
    match.score(3);
  } else {
    console.log('fg is no good');
    match.playUpdate(game.off,`The ${117 - game.los}-yd field goal from ${k.fName} ${k.lName} is NO GOOD`);
    match.changePos(100 - game.los);
  }
  match.update({type:'teamStats',as:game.away.s,hs:game.home.s});
  match.statUpdate([k]);
}
//decision making
match.onFourth = () => {
  if (game.q < 4 || (game.q == 4 && game.s > 6000)) { //in tenths of second
    return false;
  }
  var diff = game[`${game.off}Score`] - game[`${game.def}Score`];
  if (game.q == 4) {
    if (game.los >= 97) { //inside oppo 3
      return true;
    } else if (game.los >= 55 && diff >= -3) { //in field goal range & can tie/win w/ field goal
      return false;
    } else if (game.los < 55 && diff >= 0) { //out of field goal range & ahead
      return false;
    } else if (game.toGo > 2 && diff >=0) { //ahead w/ over 2 yds to go
      return false;
    } else if (diff > -9 && game.los < 40 && game.s > 1800) { //team is behind by one possession inside own 40 w/ over 3 minutes
      return false;
    }
    var shouldGo = 100 * (game.s / 600) + 25 * diff + 9 * game.los;
    if (shouldGo < 750) {
      return true;
    }
    return false;
  } else if (game.q > 4) { //overtime
    if ((game.awayPoss && !game.homePoss) || (!game.awayPoss && game.homePoss)) { //only one team has had the ball
      if (game.los >= 55) { //can get ahead by 3
        return false;
      } else { //may as well
        return true;
      }
    } else { //both teams have had the ball
      if (diff >= -3 && game.los >= 55) { //behind no more than 3 pts in fg range (content to tie)
        return false;
      } else { //either outside of fg range or behind by more than 3 pts
        return true;
      }
    }
  }
}
match.advancePeriod = () => {
  match.updateGameStats();
  setTimeout(() => {
    console.log('END OF PERIOD',game.q);
    if (game.q == 1 || game.q == 3) { //just adv period
      game.s = 9000;
      game.q++;
      game.awaySbq[game.q - 1] = 0;
      game.homeSbq[game.q - 1] = 0;
      match.update({type:'newPeriod',q:game.q});
      match.play();
    } else if (game.q == 2) { //go to second half
      game.def = 'home';
      game.off = 'away';
      game.s = 9000;
      game.q++;
      game.awaySbq[game.q - 1] = 0;
      game.homeSbq[game.q - 1] = 0;
      match.random();
      setTimeout(() => {
        match.update({type:'newPeriod',q:game.q});
        match.kickoff();
      },20000);
    } else { //end of game in reg or ot
      if (game.awayScore != game.homeScore) {
        match.endGame();
      } else {
        if (game.q == 4) { //redo randomization
          match.random();
        }
        if (Math.random() < 0.5) {
          game.off = 'away';
        } else {
          game.off = 'home';
        }
        game.q++;
        game.awaySbq[game.q - 1] = 0;
        game.homeSbq[game.q - 1] = 0;
        game.s = Infinity;
        game.awayPoss = false;
        game.homePoss = false;
        match.update({type:'newPeriod',q:game.q});
        console.log('keep playing');
        match.kickoff();
      }
    }
  },10000);
}
match.delay = (fxn,dura) => {
  var i = 0;
  match.update({type:'startClock',s:game.s});
  var interval = setInterval(() => {
    i++;
    game.s--;
    if (game.s <= 0) {
      clearInterval(interval);
      match.advancePeriod();
      match.update({type:'stopClock'});
    }
    //update();
    if (i == dura * 10) {
      clearInterval(interval);
      match.update({type:'stopClock'});
      fxn();
    }
  },100);
}
//updates
match.downUpdate = () => {
  match.update({type:'down',s:game.s,q:game.q,down:game.down,toGo:game.toGo,los:game.los,off:game.off,def:game.def,conv:game.conversion});
}
match.playUpdate = (side,txt,use) => {
  if (game.conversion) {
    use = false;
  }
  let obj = {type:'update',s:game.s,q:game.q,down:game.down,toGo:game.toGo,los:game.los,side:side,txt:txt,off:game.off,def:game.def,use:use,conv:game.conversion};
  game.plays.push(obj);
  match.update(obj);
}
match.statUpdate = list => {
  match.update({type:'stats',players:list});
}
match.update = obj => {
  obj.s = (obj.s<0)?0:obj.s;
  for (let ws of gameSockets) {
    if (ws) {
      ws.send(JSON.stringify(obj));
    }
  }
}
match.updateGameStats = () => {
  let as = game.away.s;
  let hs = game.home.s;
  let stats = {};
  stats.awayOff = calcOffRating(as.plays,as.td,as.pts,as.yds);
  stats.awayDef = calcDefRating(as.defPlays,as.sacks,as.int,as.allowTd,as.defYds,as.allowPts);
  stats.awayYpp = (as.yds / as.plays).toFixed(1);
  if (as.plays == 0) {
    stats.awayYpp = '0.0';
  }
  stats.homeOff = calcOffRating(hs.plays,hs.td,hs.pts,hs.yds);
  stats.homeDef = calcDefRating(hs.defPlays,hs.sacks,hs.int,hs.allowTd,hs.defYds,hs.allowPts);
  stats.homeYpp = (hs.yds / hs.plays).toFixed(1);
  if (hs.plays == 0) {
    stats.homeYpp = '0.0';
  }
  return request(`UPDATE games SET stats='${JSON.stringify(stats)}' WHERE away='${game.away.abbr}' AND home='${game.home.abbr}' AND week=${getCurrentWeek()};`);
}
//match resources
match.random = () => {
  for (let p of game.away.fieldPlayers.concat(game.home.fieldPlayers)) {
    if (p.stat1.js != 'dist') {
      p[p.stat1.js] = normalRandom(p[`${p.stat1.js}Distr`].m,p[`${p.stat1.js}Distr`].s);
    }
    if (p.stat2.js != 'kickReturn') {
      p[p.stat2.js] = normalRandom(p[`${p.stat2.js}Distr`].m,p[`${p.stat2.js}Distr`].s);
    }
    if (p.stat3.js != 'puntReturn') {
      try {
        p[p.stat3.js] = normalRandom(p[`${p.stat3.js}Distr`].m,p[`${p.stat3.js}Distr`].s);
      } catch {
        console.log('ERROR','attr',p.stat3.js,'player',p);
      }
    }
    if (p.stat4.js != 'speed') {
      p[p.stat4.js] = normalRandom(p[`${p.stat4.js}Distr`].m,p[`${p.stat4.js}Distr`].s);
    }
  }
}
match.resetField = (offPlay,defPlay) => {
  var qb = match.getPlayer(game.off,offPlay.qb);
  qb.y = 25;
  var rb = match.getPlayer(game.off,offPlay.rb);
  rb.y = 20;
  rb.stuffAtt = false;
  if (offPlay.type == 'pass') { //shotgun
    qb.x = game.los - 7;
    rb.x = game.los - 7;
  } else {
    qb.x = game.los - 2;
    rb.x = game.los - 2;
  }
  var wr1 = match.getPlayer(game.off,offPlay.wr1);
  wr1.x = game.los;
  wr1.y = 10;
  wr1.iy = 10;
  var wr2 = match.getPlayer(game.off,offPlay.wr2);
  wr2.x = game.los;
  wr2.y = 40;
  wr2.iy = 40;
  var te = match.getPlayer(game.off,offPlay.te);
  te.x = game.los;
  te.y = 30;
  te.iy = 30;
  var ol1 = match.getPlayer(game.off,offPlay.ol1);
  ol1.x = game.los;
  ol1.y = 25;
  ol1.stuffAtt = false;
  var ol2 = match.getPlayer(game.off,offPlay.ol2);
  ol2.x = game.los;
  ol2.y = 20;
  ol2.stuffAtt = false;
  var dl1 = match.getPlayer(game.def,defPlay.dl1);
  dl1.x = game.los + 1;
  dl1.y = 25;
  dl1.stuffed = false;
  var dl2 = match.getPlayer(game.def,defPlay.dl2);
  dl2.x = game.los + 1;
  dl2.y = 20;
  dl2.stuffed = false;
  var lb = match.getPlayer(game.def,defPlay.lb);
  lb.x = game.los + 3;
  lb.y = 25;
  lb.stuffed = false;
  var cb1 = match.getPlayer(game.def,defPlay.cb1);
  cb1.x = game.los + 1;
  cb1.y = 10;
  cb1.tAtt = false;
  var cb2 = match.getPlayer(game.def,defPlay.cb2);
  cb2.x = game.los + 1;
  cb2.y = 40;
  cb2.tAtt = false;
  var cb3 = match.getPlayer(game.def,defPlay.cb3);
  cb3.x = game.los + 1;
  cb3.y = 30;
  cb3.tAtt = false;
  var s = match.getPlayer(game.def,defPlay.s);
  s.x = game.los + 8;
  s.y = 25;
  s.tAtt = false;
}
match.getPlayer = (side,id) => {
  for (let p of game[side].fieldPlayers) {
    if (p.id == id) {
      return p;
    }
  }
}
match.distance = (p1,p2) => {
  return Math.sqrt(Math.pow((p1.x-p2.x),2) + Math.pow((p1.y-p2.y),2));
}
match.getOther = pos => {
  switch(pos.toLowerCase()) {
    case 'wr1':
      return 'cb1';
    case 'wr2':
      return 'cb2';
    case 'te':
      return 'cb3';
    case 'cb1':
      return 'wr1';
    case 'cb2':
      return 'wr2';
    case 'cb3':
      return 'te';
    case 'ol1':
      return 'dl1';
    case 'dl1':
      return 'ol1';
    case 'ol2':
      return 'dl2';
    case 'dl2':
      return 'ol2';
    case 'rb':
      return 'lb';
    case 'lb':
      return 'rb';
    default:
      throw 'No match';
  }
}
match.article = a => {
  if (typeof a == 'number') {
    if ([8,11,18,80,81,82,83,84,85,86,87,88,89].includes(Math.round(a))) {
      return 'an';
    }
  } else {
    if (['a','e','i','o','u'].includes(a.toLowerCase().substring(0,1))) {
      return 'an';
    }
  }
  return 'a';
}
match.stat = (player,attr,num) => {
  if (!game.conversion) {
    if (player == 'away') {
      game.away.s[attr] += num;
    } else if (player == 'home') {
      game.home.s[attr] += num;
    } else {
      console.log(player.pos,attr);
      player.s[attr] += num;
    }
  }
}
match.period = num => {
  if (num < 5) {
    return ordinal(num).toUpperCase();
  } else if (num == 5) {
    return 'OT';
  } else {
    return `${num - 4}OT`;
  }
}
//end/start code
match.endGame = () => {
  match.updateGameStats().then(() => {
    match.update({type:'final'});
    gameActive = false;
    //console.log(game);
    console.log(game.away.s,game.home.s);
    for (let p of game.away.fieldPlayers.concat(game.home.fieldPlayers)) {
      console.log(p.id,p.pos,p.s);
    }
    console.log('Final Score',game.awayScore,'-',game.homeScore,'in',game.q,'quarters');
    if (game.q < 5) {
      var status = 'FINAL';
    } else {
      var status = `FINAL-${match.period(game.q)}`;
    }
    let sql = `UPDATE games SET status='${status}',awayScore=${game.awayScore},homeScore=${game.homeScore},awaySbq='${JSON.stringify(game.awaySbq)}',homeSbq='${JSON.stringify(game.homeSbq)}' WHERE away='${game.away.abbr}' AND home='${game.home.abbr}' and week=${getCurrentWeek()};`;
    if (getCurrentWeek() > 0 && getCurrentWeek() < 21) { //in regular season
      if (game.awayScore > game.homeScore && game.away.cap <= 200000) { //away team won under cap
        sql += `UPDATE teams SET w=w+1 WHERE abbr='${game.away.abbr}';`;
        if (game.divisional) {
          sql += `UPDATE teams SET dw=dw+1 WHERE abbr='${game.away.abbr}';`;
        }
      } else {
        sql += `UPDATE teams SET l=l+1 WHERE abbr='${game.away.abbr}';`;
        if (game.divisional) {
          sql += `UPDATE teams SET dl=dl+1 WHERE abbr='${game.away.abbr}';`;
        }
      }
      if (game.homeScore < game.homeScore && game.home.cap <= 200000) { //home team won under cap
        sql += `UPDATE teams SET w=w+1 WHERE abbr='${game.home.abbr}';`;
        if (game.divisional) {
          sql += `UPDATE teams SET dw=dw+1 WHERE abbr='${game.home.abbr}';`;
        }
      } else {
        sql += `UPDATE teams SET l=l+1 WHERE abbr='${game.home.abbr}';`;
        if (game.divisional) {
          sql += `UPDATE teams SET dl=dl+1 WHERE abbr='${game.home.abbr}';`;
        }
      }
    }
    for (let p of game.away.fieldPlayers) {
      let x = JSON.parse(p.teamHistory).concat(game.away.abbr);
      for (let a in p.s) {
        p.stats[a][getCurrentWeek()] = p.s[a];
      }
      sql += `UPDATE players SET teamHistory='${JSON.stringify(x)}',stats='${JSON.stringify(p.stats)}' WHERE id='${p.id}';`;
    }
    for (let p of game.home.fieldPlayers) {
      let x = JSON.parse(p.teamHistory).concat(game.home.abbr);
      for (let a in p.s) {
        p.stats[a][getCurrentWeek()] = p.s[a];
      }
      sql += `UPDATE players SET teamHistory='${JSON.stringify(x)}',stats='${JSON.stringify(p.stats)}' WHERE id='${p.id}';`;
    }
    for (let a in game.away.s) {
      game.away.stats[a][getCurrentWeek()] = game.away.s[a];
    }
    for (let a in game.home.s) {
      game.home.stats[a][getCurrentWeek()] = game.home.s[a];
    }
    sql += `UPDATE teams SET stats='${JSON.stringify(game.away.stats)}' WHERE abbr='${game.away.abbr}';`;
    sql += `UPDATE teams SET stats='${JSON.stringify(game.home.stats)}' WHERE abbr='${game.home.abbr}';`;
    request(sql).then(() => {
      match.setNextGame();
    })
  });
}
match.setNextGame = () => { //remove comments
  let nextGame = {schedule:'2038-01-19T03:14:07Z'};
  contests.getAllGames().then(games => {
    for (let g of games) {
      if (new Date(g.schedule).getTime() < new Date(nextGame.schedule).getTime() && g.status == 'upcoming') {
        nextGame = g;
      }
    }
    let delay = new Date(nextGame.schedule).getTime() - new Date().getTime();
    //delay = (delay<0)?5*60*1000:delay;
    delay = (delay<0)?0.5*60*1000:delay;
    console.log(delay,nextGame.away,nextGame.home);
    setTimeout(() => { match.verifyRoster(nextGame.away,nextGame.home); },delay);
  });
}
match.setNextGame();

//draft

var currentPick = -1;
var draftStarted = false;
var draftTimer = 20;
var draftInt = false;
var canPick = false;
var boardTimeout;
var compTimeout;

function timeDraft() {
  let delay = new Date(line.draft).getTime() - new Date().getTime();
  if (delay > 0) {
    setTimeout(startDraft,delay);
  } else {
    currentPick = 320;
  }
}
timeDraft();

function startDraft() {
  currentPick = 0;
  canPick = true;
  draftStarted = true;
  if (draftInt === false) {
    draftInt = setInterval(() => {
      draftTimer--;
      if (draftTimer == 0) {
        clearInterval(draftInt);
        draftInt = false;
      }
    },1000);
  }
  boardTimeout = setTimeout(() => {
    if (canPick) {
      boardDraft(currentPick);
    }
  },20 * 1000);
  compTimeout = setTimeout(() => {
    if (canPick) {
      computerDraft(currentPick);
    }
  },20 * 1000 + 500);
  selections.getCurrentPick().then(pick => {
    selections.getThree().then(three => {
      announceToAll({method:'draftStarted',team:pick.team,three:three});
    });
  });
}

function boardDraft(x) {
  console.log(currentPick,'board');
  if (!canPick || x != currentPick) {
    return;
  }
  clearTimeout(boardTimeout);
  selections.getCurrentPick().then(pick => {
    announce(pick.team,{method:'getPinned'});
  })
}

function computerDraft(x) {
  console.log(currentPick,'computer');
  if (!canPick || x != currentPick) {
    return;
  }
  clearTimeout(compTimeout);
  athletes.getDraftablePlayers().then(players => {
    selections.getCurrentPick().then(pick => {
      clubs.getTeamFromAbbr(pick.team).then(acc => {
        let player = players[Math.floor(Math.random() * players.length)];
        while (player.team != 'UFA') {
          player = players[Math.floor(Math.random() * players.length)];
        }
        draftPlayer(player.id,acc,true);
      });
    });
  });
}

function draftPlayer(id,acc,auto) {
  if (!canPick) {
    return;
  }
  athletes.getPlayerFromId(id).then(player => {
    if (player.team != 'UFA' || player.drafted) {
      return;
    }
    if (!player.draftable) {
      return;
    }
    clearTimeout(boardTimeout);
    clearTimeout(compTimeout);
    let roster = JSON.parse(acc.roster);
    roster.push(id);
    let salary = (6900 - currentPick * 20) / 20;
    let s = `UPDATE players SET team='${acc.abbr}',drafted=true,base=${salary} WHERE id=${con.escape(id)};`;
    s += `UPDATE teams SET roster='${JSON.stringify(roster)}' WHERE abbr='${acc.abbr}';`;
    s += `UPDATE draft SET player=${con.escape(id)} WHERE pick=${currentPick};`;
    canPick = false;
    clearInterval(draftInt);
    draftInt = false;
    request(s).then(() =>{
      currentPick++;
      selections.getNthPick(currentPick + 19).then(soon => {
        selections.getCurrentPick().then(next => {
          selections.getThree().then(three => {
            let ath = {};
            ath.id = player.id;
            ath.fName = player.fName;
            ath.lName = player.lName;
            ath.pos = player.pos;
            let res = {method:'draftedPlayer',team:acc.abbr,player:ath,pick:currentPick-1,soon:soon.team,auto:auto,next:next.team,three:three};
            announceToAll(res);
            var timer = (currentPick>=160)?15:20;
            draftTimer = timer;
            if (currentPick < 320) {
              setTimeout(() => {
                canPick = true;
                if (draftInt === false) {
                  draftInt = setInterval(() => {
                    draftTimer--;
                    if (draftTimer == 0) {
                      clearInterval(draftInt);
                      draftInt = false;
                    }
                  },1000);
                }
              },4500);
              setTimeout(() => {
                if (canPick) {
                  boardDraft(currentPick);
                }
              },timer * 1000 + 4500);
              setTimeout(() => {
                if (canPick) {
                  computerDraft(currentPick);
                }
              },timer * 1000 + 5000);
            } else { //end draft
              currentPick = 320;
              request(`UPDATE players SET base=25 WHERE draftable=true AND drafted=false;UPDATE players SET draftable=false;`).then(() => {
                announceToAll({method:'endOfDraft'});
              })
            }
          });
        });
      });
    });
  });
}

//app and server

app.use(cookieParser());
app.use(useragent.express());
app.use('/audio', express.static(__dirname + '/audio'));
app.use('/css', express.static(__dirname + '/cssv2'));
app.use('/scripts', express.static(__dirname + '/scriptsv2'));
app.use('/images', express.static(__dirname + '/imagesv2'));
app.use('/logos', express.static(__dirname + '/logosv2'));
app.set('views','./viewsv2');
app.set('view engine','ejs');
app.get('/', (req,res) => {
  contests.getWeek(getCurrentWeek()).then(games => {
    news.getMostRecent(6).then(stories => {
      var geo = geoip.lookup(req.header('x-forwarded-for') || req.connection.remoteAddress);
      var tz = 'utc';
      if (geo) {
        if (geo.timezone) {
          tz = geo.timezone;
        }
      }
      //console.log('tz',tz);
      for (let g of games) {
        g.time = tiempo.getFormatDayAndHour(g.schedule,tz);
        g.fullTime = tiempo.getFormatTime(g.schedule,tz);
        g.awayClean = clubs.getAttrFromAbbr(g.away,'clean');
        g.homeClean = clubs.getAttrFromAbbr(g.home,'clean');
        if (g.status == 'upcoming') {
          g.awayRender = '';
          g.homeRender = '';
        } else {
          g.awayRender = g.awayScore;
          g.homeRender = g.homeScore;
          if (g.status.indexOf('FINAL') != -1) {
            if (g.awayScore > g.homeScore) {
              g.awayLead = true;
            } else if (g.awayScore < g.homeScore) {
              g.homeLead = true;
            }
          }
        }
      }
      for (let s of stories) {
        s.stamp = tiempo.getFormatTime(s.time,tz);
      }
      if (gameActive) {
        var gameTime = {q:match.period(game.q)};
        if (game.q < 5) {
          let a = Math.floor(game.s / 10);
          let m = Math.floor(a / 60);
          let s = a % 60;
          s = (s<10)?`0${s}`:s;
          gameTime.s = `${m}:${s}`;
        } else {
          game.s = '';
        }
      } else {
        var gameTime = {};
      }
      var dates = {};
      for (let a in line) {
        dates[a] = tiempo.getFormatTime(line[a],tz);
      }
      let m = new Date().getMonth();
      let month;
      switch (m) {
        case 7: case 8:
          month = 0;
          break;
        case 9: case 10: case 11:
          month = m - 8;
          break;
        case 0: case 1: case 2:
          month = m + 4;
          break;
      }
      if (gameActive) {
        iGame = game;
      } else {
        iGame = {away:{},home:{}};
      }
      clubs.getAllTeams().then(teams => {
        res.render('index', {
          games: games,
          dark: req.cookies.dark,
          prompt: req.cookies.prompt,
          top: contests.getTopEight(games,teams),
          week: getCurrentWeek(),
          stories: stories,
          gameActive: gameActive,
          game: iGame,
          gameTime: gameTime,
          dates: dates,
          month: month
        });
      });
    });
  });
});
app.get('/draft', (req,res) => {
  if (req.useragent.isMobile) {
    console.log('mobile');
  }
  if (currentPick >= 320) {
    return res.render('404', {
      dark: req.cookies.dark,
      prompt: req.cookies.prompt
    });
  }
  clubs.getAccountFromToken(req.cookies.token).then(acc => {
    if (acc) {
      var abbr = acc.abbr;
    } else {
      var abbr = 'XXX';
    }
    if (currentPick == -1) {
      var pr = {p:'-',r:'-'};
    } else {
      var pr = {r:Math.floor(currentPick / 40) + 1,p:currentPick % 40 + 1};
    }
    athletes.getAllPlayers().then(allPlayers => {
      allPlayers = expandPlayers(allPlayers);
      let players = allPlayers.slice(0,30).concat(allPlayers.slice(100,130)).concat(allPlayers.slice(200,230));
      players = players.concat(allPlayers.slice(300,330)).concat(allPlayers.slice(400,430)).concat(allPlayers.slice(500,530));
      players = players.concat(allPlayers.slice(600,630)).concat(allPlayers.slice(700,730)).concat(allPlayers.slice(800,830));
      players = players.concat(allPlayers.slice(900,930)).concat(allPlayers.slice(1000,1030)).concat(allPlayers.slice(1100,1130));
      players = players.concat(allPlayers.slice(1200,1230)).concat(allPlayers.slice(1300,1330)).concat(allPlayers.slice(1400,1430)).concat(allPlayers.slice(1500,1530));
      if (req.cookies.pinned !== undefined && req.cookies.pinned != '') {
        var ids = JSON.parse(req.cookies.pinned);
        var board = [];
        for (let id of ids) {
          for (let p of players) {
            if (p.id == id) {
              board.push(p);
              break;
            }
          }
        }
      } else {
        var board = [];
      }
      var draftable = {qb:[],rb:[],wr:[],te:[],ol:[],dl:[],lb:[],cb:[],s:[],k:[],p:[]};
      for (let p of players) {
        if (p.drafted == false) {
          draftable[p.pos.toLowerCase()].push(p);
        }
      }
      selections.getAllPicks().then(picks => {
        if (currentPick == -1) {
          var currentTeam = {clean:'league',text:'draft has not started'};
        } else {
          let x = Teams.getTeamFromAbbr(picks[currentPick].team);
          var currentTeam = {clean:x.clean,text:`${x.mascot} are on the clock`};
        }
        for (let i = 0; i < picks.length; i++) {
          let s = picks[i];
          s.clean = clubs.clean(Teams.getTeamFromAbbr(s.team).mascot);
          s.round = Math.floor(i / 40) + 1;
          s.pick = i % 40 + 1;
          s.ordinal = ordinal(i + 1);
          if (s.player) {
            if (s.player != '') {
              s.player = athletes.getPlayerFromList(s.player,players);
            }
          }
        }
        selections.getThree().then(three => {
          if (!acc) {
            res.render('draft', {
              dark: req.cookies.dark,
              prompt: req.cookies.prompt,
              draftable: draftable,
              abbr: abbr,
              picks: selections.getNextTwentyFromWhole(picks),
              board: board,
              draft: picks,
              current: currentTeam,
              timer: draftTimer,
              started: draftStarted,
              team: false,
              pr: pr,
              three: three
            });
            return;
          }
          deals.getInvolvedTrades(abbr).then(trades => { //trades and chat
            trades.reverse();
            for (let t of trades) {
              t.format = tiempo.getFormatTime(t.tradeTime).toUpperCase();
              t.fromMascot = Teams.getTeamFromAbbr(t.fromTeam).mascot;
              t.fromClean = clubs.clean(t.fromMascot);
              t.toMascot = Teams.getTeamFromAbbr(t.toTeam).mascot;
              t.toClean = clubs.clean(t.toMascot);
              let from = JSON.parse(t.fromOffer);
              let to = JSON.parse(t.toOffer);
              for (let o of from.concat(to)) {
                if (o.type == 'player') {
                  let ath = athletes.getPlayerFromList(o.id,allPlayers);
                  o.text = `${ath.fName} ${ath.lName} <span class="num">(${ath.pos} #${ath.id})</span>`;
                } else {
                  o.text = `RD ${Math.floor(o.pick / 40) + 1} PK ${o.pick % 40 + 1} <span class="num">(${ordinal(o.pick + 1)} Overall)</span>`;
                }
              }
              if (from.length < to.length) {
                while (from.length != to.length) {
                  from.push('');
                }
              } else if (from.length > to.length) {
                while (from.length != to.length) {
                  to.push('');
                }
              }
              t.cells = [`${t.fromMascot} Get`,`${t.toMascot} Get`];
              for (let i = 0; i < from.length; i++) {
                t.cells.push(to[i].text);
                t.cells.push(from[i].text);
              }
            }
            messages.getAll(acc.abbr).then(chats => {
              var others = ['ALE'];
              var others = others.concat(Teams.allExcept(acc.abbr));
              var recent = [];
              for (let o of others) {
                let found = false;
                for (let i = chats.length - 1, c = chats[chats.length - 1]; i > 0; i--, c = chats[i]) {
                  if (c.sentFrom == acc.abbr && c.sentTo == o) {
                    let d = new Date(c.sent);
                    recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:`You: ${c.message}`,ts:d.getTime()});
                    found = true;
                    break;
                  } else if (c.sentTo == acc.abbr && c.sentFrom == o) {
                    let d = new Date(c.sent);
                    recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:c.message,ts:d.getTime()});
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:'No Messages',ts:0,none:true});
                }
              }
              recent.sort((a,b) => {
                if (a.abbr == 'ALE') {
                  return -1;
                } else if (b.abbr == 'ALE') {
                  return 1;
                }
                if (a.ts != b.ts) {
                  return b.ts - a.ts;
                }
                if (a.clean > b.clean) {
                  return 1;
                } else {
                  return -1;
                }
              });
              for (let r of recent) {
                r.since = timeSince(r.ts);
              }
              res.render('draft', {
                dark: req.cookies.dark,
                prompt: req.cookies.prompt,
                draftable: draftable,
                abbr: abbr,
                picks: selections.getNextTwentyFromWhole(picks),
                board: board,
                draft: picks,
                trades: trades,
                recent: recent,
                current: currentTeam,
                timer: draftTimer,
                started: draftStarted,
                team: true,
                pr: pr,
                three: three
              });
            });
          });
        });
      })
    });
  });
});
app.get('/info', (req,res) => {
  res.render('info', {
    dark: req.cookies.dark,
    prompt: req.cookies.prompt
  });
});
app.get('/office', (req,res) => {
  clubs.getAccountFromToken(req.cookies.token).then(acc => {
    if (acc) {
      athletes.getAllPlayers().then(players => {
        let spePlayers = {rb:[],k:[],p:[]};
        //let a = expandPlayers(players);
        let r = [];
        for (let p of players) {
          if (JSON.parse(acc.roster).includes(p.id)) {
            r.push(p);
            if (p.id.charAt(0) == '1') { //rbs
              spePlayers.rb.push(p);
              if (JSON.parse(acc.spePlays).return.rb == p.id) {
                p.return = true;
              }
              if (JSON.parse(acc.spePlays).puntReturn.rb == p.id) {
                p.puntReturn = true;
              }
            }
            if (p.id.charAt(0) == 'E') { //kickers
              spePlayers.k.push(p);
              if (JSON.parse(acc.spePlays).fg.k == p.id) {
                p.fg = true;
              }
              if (JSON.parse(acc.spePlays).longFg.k == p.id) {
                p.longFg = true;
              }
              if (JSON.parse(acc.spePlays).kickoff.k == p.id) {
                p.kickoff = true;
              }
              if (JSON.parse(acc.spePlays).pat.k == p.id) {
                p.pat = true;
              }
            }
            if (p.id.charAt(0) == 'F') { //punters
              spePlayers.p.push(p);
              if (JSON.parse(acc.spePlays).punt.p == p.id) {
                p.punt = true;
              }
            }
          }
          if (JSON.parse(acc.roster).length == r.length) {
            break;
          }
        }
        r = expandPlayers(r);
        let broken = clubs.breakdown(r,acc);
        let breakdown = broken.breakdown;
        let spending = broken.spending;
        deals.getInvolvedTrades(acc.abbr).then(trades => { //trades and chat
          trades.reverse();
          for (let t of trades) {
            t.format = tiempo.getFormatTime(t.tradeTime).toUpperCase();
            t.fromMascot = Teams.getTeamFromAbbr(t.fromTeam).mascot;
            t.fromClean = clubs.clean(t.fromMascot);
            t.toMascot = Teams.getTeamFromAbbr(t.toTeam).mascot;
            t.toClean = clubs.clean(t.toMascot);
            let from = JSON.parse(t.fromOffer);
            let to = JSON.parse(t.toOffer);
            for (let o of from.concat(to)) {
              if (o.type == 'player') {
                let ath = athletes.getPlayerFromList(o.id,players);
                o.text = `${ath.fName} ${ath.lName} <span class="num">(${ath.pos} #${ath.id})</span>`;
              } else {
                o.text = `RD ${Math.floor(o.pick / 40) + 1} PK ${o.pick % 40 + 1} <span class="num">(${ordinal(o.pick + 1)} Overall)</span>`;
              }
            }
            if (from.length < to.length) {
              while (from.length != to.length) {
                from.push('');
              }
            } else if (from.length > to.length) {
              while (from.length != to.length) {
                to.push('');
              }
            }
            t.cells = [`${t.fromMascot} Get`,`${t.toMascot} Get`];
            for (let i = 0; i < from.length; i++) {
              t.cells.push(to[i].text);
              t.cells.push(from[i].text);
            }
          }
          messages.getAll(acc.abbr).then(chats => {
            var others = ['ALE'];
            var others = others.concat(Teams.allExcept(acc.abbr));
            var recent = [];
            for (let o of others) {
              let found = false;
              for (let i = chats.length - 1, c = chats[chats.length - 1]; i > 0; i--, c = chats[i]) {
                if (c.sentFrom == acc.abbr && c.sentTo == o) {
                  let d = new Date(c.sent);
                  recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:`You: ${c.message}`,ts:d.getTime()});
                  found = true;
                  break;
                } else if (c.sentTo == acc.abbr && c.sentFrom == o) {
                  let d = new Date(c.sent);
                  recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:c.message,ts:d.getTime()});
                  found = true;
                  break;
                }
              }
              if (!found) {
                recent.push({abbr:o,clean:clubs.clean(Teams.getTeamFromAbbr(o).mascot),mess:'No Messages',ts:0,none:true});
              }
            }
            recent.sort((a,b) => {
              if (a.abbr == 'ALE') {
                return -1;
              } else if (b.abbr == 'ALE') {
                return 1;
              }
              if (a.ts != b.ts) {
                return b.ts - a.ts;
              }
              if (a.clean > b.clean) {
                return 1;
              } else {
                return -1;
              }
            });
            for (let r of recent) {
              r.since = timeSince(r.ts);
            }
            clubs.nextGame(acc.abbr).then(next => {
              res.render('office', {
                dark: req.cookies.dark,
                prompt: req.cookies.prompt,
                trades: trades,
                recent: recent,
                abbr: acc.abbr,
                players: athletes.searchPlayers(players,'QB'),
                roster: r,
                breakdown: breakdown,
                offPlays: JSON.parse(acc.offPlays),
                defPlays: JSON.parse(acc.defPlays),
                delegates: expandDelegates(acc.delegates),
                clean: clubs.clean(acc.mascot),
                mascot: acc.mascot,
                period: span.faPeriod(),
                canTrade: span.canTrade(),
                canSign: span.canSign(),
                spePlayers: spePlayers,
                emailActivated: acc.emailActivated,
                factorActivated: acc.factorActivated,
                mobile: req.useragent.isMobile,
                spending: spending,
                oppo: next.oppo
              });
            });
          });
        });
      });
    } else {
      res.render('signin', {
        dark: req.cookies.dark,
        prompt: req.cookies.prompt
      });
    }
  });
});
app.get('/playoffs', (req,res) => {
    var geo = geoip.lookup(req.header('x-forwarded-for') || req.connection.remoteAddress);
    var tz = 'utc';
    if (geo) {
      if (geo.timezone) {
        tz = geo.timezone;
      }
    }
    contests.getPlayoffGames().then(games => {
      clubs.getPlayoffs().then(playoffs => {
        if (games[0].away == 'CFC' || games[0].home == 'CFC') {
          for (let i = 0, g = games[0]; i < 8; i++, g = games[i]) {
            let n = Math.floor(i / 2);
            let c;
            if (i % 2 == 0) {
              c = 'cfc';
            } else {
              c = 'nfc';
            }
            g.away = playoffs.confs[c][7-n].abbr;
            g.home = playoffs.confs[c][n].abbr;
          }
        }
        for (let g of games) {
          if (['CFC','NFC'].includes(g.away) || ['CFC','NFC'].includes(g.home)) {
            g.awaySeed = '';
            g.homeSeed = '';
          }
          g.awayClean = clubs.getAttrFromAbbr(g.away,'mascot').toLowerCase().replace(/\s/g,'');
          g.homeClean = clubs.getAttrFromAbbr(g.home,'mascot').toLowerCase().replace(/\s/g,'');
          g.time = tiempo.getFormatTime(g.schedule,tz);
          if (g.status == 'upcoming') {
            g.awayRender = '';
            g.homeRender = '';
          } else {
            g.awayRender = g.awayScore;
            g.homeRender = g.homeScore;
          }
          for (let i = 0; i < 8; i++) { //top eight in playoffs
            if (playoffs.confs.cfc[i].abbr == g.away) {
              g.awaySeed = playoffs.confs.cfc[i].seed;
              g.awayFlag = playoffs.confs.cfc[i].flag;
            }
            if (playoffs.confs.nfc[i].abbr == g.away) {
              g.awaySeed = playoffs.confs.nfc[i].seed;
              g.awayFlag = playoffs.confs.nfc[i].flag;
            }
            if (playoffs.confs.cfc[i].abbr == g.home) {
              g.homeSeed = playoffs.confs.cfc[i].seed;
              g.homeFlag = playoffs.confs.cfc[i].flag;
            }
            if (playoffs.confs.nfc[i].abbr == g.home) {
              g.homeSeed = playoffs.confs.nfc[i].seed;
              g.homeFlag = playoffs.confs.nfc[i].flag;
            }
            if (g.awaySeed != undefined && g.homeSeed != undefined) {
              break;
            }
          }
        }
        res.render('playoffs', {
          games: games,
          dark: req.cookies.dark,
          prompt: req.cookies.prompt,
          confs: playoffs.confs,
          divs: playoffs.divs
        });
      });
    })
});
app.get('/stats', (req,res) => {
  athletes.getAllPlayers().then(players => {
    clubs.getAllTeams().then(teams => {
      for (let a of players) {
        a.s = JSON.parse(a.stats);
        if (a.team == 'UFA') {
          a.clean = 'league';
        } else {
          a.clean = clubs.getAttrFromAbbr(a.team,'clean');
        }
      }
      let p = {};
      p.qb = players.slice(0,100);
      p.rb = players.slice(100,200);
      p.wr = players.slice(200,400);
      p.te = players.slice(400,500);
      p.ol = players.slice(500,700);
      p.dl = players.slice(700,900);
      p.lb = players.slice(900,1000);
      p.cb = players.slice(1000,1300);
      p.s = players.slice(1300,1400);
      p.k = players.slice(1400,1500);
      p.p = players.slice(1500,1600);
      for (let a of p.qb) {
        a.rating = calcQBRating(a.s.comp.slice(1).reduce((a,b) => a + b,0),a.s.att.slice(1).reduce((a,b) => a + b,0),a.s.yds.slice(1).reduce((a,b) => a + b,0),a.s.td.slice(1).reduce((a,b) => a + b,0),a.s.int.slice(1).reduce((a,b) => a + b,0));
      }
      p.qb.sort((a,b) => { //rating then yds
        if (Number(b.rating) != Number(a.rating)) {
          return Number(b.rating) - Number(a.rating); 
        }
        return reduce(b.s.yds) - reduce(a.s.yds);
      });
      p.rb.sort((a,b) => { //yds then td
        if (reduce(b.s.yds) != reduce(a.s.yds)) {
          return reduce(b.s.yds) - reduce(a.s.yds);
        }
        return reduce(b.s.td) - reduce(a.s.td);
      });
      p.wr.sort((a,b) => { //yds then td
        if (reduce(b.s.yds) != reduce(a.s.yds)) {
          return reduce(b.s.yds) - reduce(a.s.yds);
        }
        return reduce(b.s.td) - reduce(a.s.td);
      });
      p.te.sort((a,b) => { //yds then td
        if (reduce(b.s.yds) != reduce(a.s.yds)) {
          return reduce(b.s.yds) - reduce(a.s.yds);
        }
        return reduce(b.s.td) - reduce(a.s.td);
      });
      p.ol.sort((a,b) => { //fewer sacks then fewer pressures
        if (reduce(a.s.sacks) != reduce(b.s.sacks)) {
          return reduce(a.s.sacks) - reduce(b.s.sacks);
        }
        return reduce(a.s.pressures) - reduce(b.s.pressures);
      });
      p.dl.sort((a,b) => { //sacks then pressures
        if (reduce(b.s.sacks) != reduce(a.s.sacks)) {
          return reduce(b.s.sacks) - reduce(a.s.sacks);
        }
        return reduce(b.s.pressures) - reduce(a.s.pressures);
      });
      p.lb.sort((a,b) => { //sacks then pressures
        if (reduce(b.s.sacks) != reduce(a.s.sacks)) {
          return reduce(b.s.sacks) - reduce(a.s.sacks);
        }
        return reduce(b.s.pressures) - reduce(a.s.pressures);
      });
      p.cb.sort((a,b) => { //int then tackles
        if (reduce(b.s.int) != reduce(a.s.int)) {
          return reduce(b.s.int) - reduce(a.s.int);
        }
        return reduce(b.s.tackles) - reduce(a.s.tackles);
      });
      p.s.sort((a,b) => { //tackles then fewer attempts
        if (reduce(b.s.tackles) != reduce(a.s.tackles)) {
          return reduce(b.s.tackles) - reduce(a.s.tackles);
        }
        return reduce(a.s.att) - reduce(b.s.att);
      });
      p.k.sort((a,b) => { //pts then accuracy
        if (reduce(b.s.pts) != reduce(a.s.pts)) {
          return reduce(b.s.pts) - reduce(a.s.pts);
        }
        let aAtt = (reduce(a.s.under40Att) + reduce(a.s.over40Att) + reduce(a.s.patAtt));
        let aTot = (reduce(a.s.under40) + reduce(a.s.over40) + reduce(a.s.pat));
        let bAtt = (reduce(b.s.under40Att) + reduce(b.s.over40Att) + reduce(b.s.patAtt));
        let bTot = (reduce(b.s.under40) + reduce(b.s.over40) + reduce(b.s.pat));
        let aAcc = aTot / aAtt;
        let bAcc = bTot / bAtt;
        if (aAtt == 0) {
          aAcc = 0;
        }
        if (bAtt == 0) {
          bAcc = 0;
        }
        return bAcc - aAcc;
      });
      p.p.sort((a,b) => { //yds then netyds
        if (reduce(b.s.yds) != reduce(a.s.yds)) {
          return reduce(b.s.yds) - reduce(a.s.yds);
        }
        return reduce(b.s.netYds) - reduce(a.s.netYds);
      });
      p.off = [];
      p.def = [];
      for (let t of teams) { //assign off and def ratings
        let s = JSON.parse(t.stats);
        let plays = reduce(s.plays);
        let td = reduce(s.td);
        let pts = reduce(s.pts);
        let yds = reduce(s.yds);
        t.offRating = calcOffRating(plays,td,pts,yds);
        let defPlays = reduce(s.defPlays);
        let sacks = reduce(s.sacks);
        let int = reduce(s.int);
        let defTd = reduce(s.allowTd);
        let defPts = reduce(s.allowPts);
        let defYds = reduce(s.defYds);
        t.defRating = calcDefRating(defPlays,sacks,int,defTd,defYds,defPts);
        t.clean = clubs.getAttrFromAbbr(t.abbr,'clean');
        p.off.push(t);
        p.def.push(t);
      }
      p.off.sort((a,b) => { //offrating then yds
        if (Number(b.offRating) != Number(a.offRating)) {
          return Number(b.offRating) - Number(a.offRating);
        }
        return reduce(b.stats.yds) - reduce(a.stats.yds);
      });
      p.def.sort((a,b) => { //defrating then fewer yds
        if (Number(b.defRating) != Number(a.defRating)) {
          return Number(b.defRating) - Number(a.defRating);
        }
        return reduce(a.stats.yds) - reduce(b.stats.yds);
      });
      res.render('stats', {
        players: p,
        dark: req.cookies.dark,
        prompt: req.cookies.prompt
      });
    });
  });
});
app.get('/schedule', (req,res) => {
  contests.getWeek(getCurrentWeek()).then(games => {
    var geo = geoip.lookup(req.header('x-forwarded-for') || req.connection.remoteAddress);
    var tz = 'utc';
    if (geo) {
      if (geo.timezone) {
        tz = geo.timezone;
      }
    }
    for (let g of games) {
      let a = Teams.getTeamFromAbbr(g.away);
      g.awayTeam = clubs.clean(a.mascot);
      g.awayMascot = a.mascot;
      let h = Teams.getTeamFromAbbr(g.home);
      g.homeTeam = clubs.clean(h.mascot);
      g.homeMascot = h.mascot;
      g.format = tiempo.getFormatTime(g.schedule,tz,false).toUpperCase();
      let d = new Date(g.schedule);
      g.epoch = d.getTime();
      //g.primetime = contests.isPrimetime(g.schedule);
    }
    games.sort((a,b) => {
      return a.epoch - b.epoch;
    });
    let week = getCurrentWeek();
    var src = 'images/';
    if (week > 20) {
      if (week == 21) {
        src += 'wildcard';
      } else if (week == 22) {
        src += 'divisional';
      } else if (week == 23) {
        src += 'conference';
      } else {
        src += 'championship';
      }
    } else {
      src += 'preseason';
    }
    if (req.cookies.dark == 'true') {
      src += '_dark';
    }
    src += '.png';
    res.render('schedule', {
      games: games,
      week: week,
      dark: req.cookies.dark,
      prompt: req.cookies.prompt,
      src: src
    });
  });
});
app.get('/teams', (req,res) => {
  var geo = geoip.lookup(req.header('x-forwarded-for') || req.connection.remoteAddress);
  var tz = 'utc';
  if (geo) {
    if (geo.timezone) {
      tz = geo.timezone;
    }
  }
  clubs.getAccountFromToken(req.cookies.token).then(acc => {
    if (acc) {
      var abbr = acc.abbr;
    } else {
      var abbr = 'AAR';
    }
    clubs.getTeamFromAbbr(abbr).then(team => {
      team.clean = team.mascot.toLowerCase().replace(/\s/g,'');
      news.getInvolvedStories(abbr).then(stories => {
        athletes.getAllPlayers().then(players => {
          var roster = [];
          for (let id of JSON.parse(team.roster)) {
            roster.push(id);
          }
          roster.sort();
          var a = [];
          for (let id of roster) {
            a.push(athletes.getPlayerFromList(id,players));
          }
          a = expandPlayers(a);
          for (let s of stories) {
            s.format = tiempo.getFormatTime(s.time,tz).toUpperCase();
          }
          stories.reverse();
          selections.getInvolvedPicks(abbr).then(picks => {
            for (let s of picks) {
              s.clean = clubs.clean(Teams.getTeamFromAbbr(s.team).mascot);
              s.round = Math.floor(s.pick / 40) + 1;
              s.ordinal = ordinal(s.pick + 1);
              s.pick = s.pick % 40 + 1;
              if (s.player) {
                if (s.player != '') {
                  s.player = athletes.getPlayerFromList(s.player,players);
                }
              }
            }
            res.render('teams', {
              dark: req.cookies.dark,
              prompt: req.cookies.prompt,
              abbr: abbr,
              team: team,
              stories: stories,
              picks: picks,
              players: a
            });
          });
        });
      });
    });
  });
});
app.get('*', (req,res) => {
  res.render('404', {
    dark: req.cookies.dark
  });
});

const server = app.listen(3000);
const WebSocket = require('ws');
const wss = new WebSocket.Server({server : server});
const activeCxns = {};
const attemptIPs = {};
const attemptTimeouts = {};
const emailTimestamp = {};

wss.on('connection', ws => {
  //ws.on('open', () => console.log('opened!'));
  ws.on('close', () => {
    for (let abbr in activeCxns) {
      for (let index in activeCxns[abbr]) {
        if (activeCxns[abbr][index].id == ws.id) {
          delete activeCxns[abbr][index];
        }
      }
    }
    for (let w in gameSockets) {
      if (gameSockets[w].id == ws.id) {
        delete gameSockets[w];
      }
    }
  });
  ws.on('message', message => {
    let result = JSON.parse(message);
    if (!(result.method == 'getDelegates' && result.solo == true)) {
      console.log(result);
    }
    if (['savePlays','acceptTrade','releasePlayer','negotiate','unfreezeDelegate','upgradeDelegate','offerTrade','retractTrade','declineTrade','hideTrade','draftPlayer'].includes(result.method) && !span.inSeason()) {
      return error(ws,'You cannot do that until the start of the season',result.method);
    }
    clubs.getAccountFromToken(result.token).then(acc => {
      if (result.method == 'requestGames') {
        let res = {method:'requestedGames',spec:result.spec};
        if (typeof result.spec == 'number') {
          if (result.spec < 0 || result.spec > 24) {
            return error(ws,`Invalid week: ${result.spec}`,result.method);
          }
          contests.getWeek(result.spec).then(games => {
            for (let g of games) {
              let a = Teams.getTeamFromAbbr(g.away);
              g.awayTeam = clubs.clean(a.mascot);
              g.awayMascot = a.mascot;
              let h = Teams.getTeamFromAbbr(g.home);
              g.homeTeam = clubs.clean(h.mascot);
              g.homeMascot = h.mascot;
              let d = new Date(g.schedule);
              g.epoch = d.getTime();
              //g.primetime = contests.isPrimetime(g.schedule);
            }
            games.sort((a,b) => {
              return a.epoch - b.epoch;
            });
            res.data = games;
            ws.send(JSON.stringify(res));
          });
        } else {
          if (!Teams.getAbbrs().includes(result.spec)) {
            return error(ws,`Invalid team: ${result.spec}`,result.method);
          }
          contests.getGamesByTeam(result.spec).then(games => {
            for (let g of games) {
              let a = Teams.getTeamFromAbbr(g.away);
              g.awayTeam = clubs.clean(a.mascot);
              g.awayMascot = a.mascot;
              let h = Teams.getTeamFromAbbr(g.home);
              g.homeTeam = clubs.clean(h.mascot);
              g.homeMascot = h.mascot;
              let d = new Date(g.schedule);
              g.epoch = d.getTime();
              //g.primetime = contests.isPrimetime(g.schedule);
            }
            games.sort((a,b) => {
              return a.epoch - b.epoch;
            });
            res.data = games;
            ws.send(JSON.stringify(res));
          });
        }
      } else if (result.method == 'activate') {
        clubs.getTeamFromMascot(result.mascot).then(acc => {
          if (!acc) {
            return error(ws,'Account not found',result.method);
          }
          if (limitAttempts(ws)) {
            return error(ws,'You have exceeded your activation attempt limit. Wait 10 minutes',result.method);
          }
          if (acc.hash && acc.salt) {
            return error(ws,'Account already activated',result.method);
          }
          if (result.code != Cred.getCode(acc.mascot)) {
            return error(ws,'Code is not correct',result.method);
          }
          let temp = secStr();
          let salt = secStr();
          let saltHash = crypto.createHash('sha512').update(temp + salt).digest('hex');
          updateTeam(acc.abbr,['tempSalt','tempHash'],[salt,saltHash]).then(() => {
            ws.send(JSON.stringify({method:'activated',temp:temp}));
          });
        });
      } else if (result.method == 'setPassword') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (!acc) {
            return error(ws,'Account not found',result.method);
          }
          if (crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex') != acc.tempHash) {
            return error(ws,'505','505');
          }
          if (result.password.length < 12) {
            return error(ws,'Password must be at least 12 characters',result.method);
          }
          if (!isASCII(result.password)) {
            return error(ws,'Password contains invalid characters',result.method);
          }
          let common = ['1q2w','2021','2022','league','123','pass','hunter','qwer','erty','456','789','000','111','222','333','444','555','666','777','888','999'];
          for (let c of common) {
            if (result.password.toLowerCase().indexOf(c) != -1) {
              return error(ws,`Password cannot contain common strings like ${c}`,result.method);
            }
          }
          if (result.password.toLowerCase().indexOf(acc.mascot) != -1) {
            return error(ws,'Password cannot contain team mascot',result.method);
          }
          if (result.password.toLowerCase().indexOf(acc.abbr) != -1) {
            return error(ws,'Password cannot contain team abbreviation',result.method);
          }
          let salt = secStr();
          let hash = crypto.createHash('sha512').update(result.password + salt).digest('hex');
          let tokenSalt = secStr();
          let token = secStr();
          let tokenHash = crypto.createHash('sha512').update(token + tokenSalt).digest('hex');
          let attrs = ['salt','hash','tokenSalt','tokenHash','tempSalt','tempHash','twoFactor','factorActivated'];
          let vals = [salt,hash,[tokenSalt],[tokenHash],null,null,null,false];
          if (!acc.activated) {
            attrs.push('timeActivated');
            vals.push(new Date().toISOString().replace('T',' ').substring(0,19));
          }
          updateTeam(acc.abbr,attrs,vals,ws).then(() => {
            ws.send(JSON.stringify({method:'signedIn',token:token}));
          });
        });
      } else if (result.method == 'signIn') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (!acc) {
            return error(ws,'No account found',result.method);
          }
          if (limitAttempts(ws)) {
            return error(ws,'You have exceeded your sign in attempt limit. Wait 10 minutes',result.method);
          }
          let hash = crypto.createHash('sha512').update(result.password + acc.salt).digest('hex');
          if (hash == acc.hash && !acc.factorActivated) {
            let salt = secStr();
            let allSalts = JSON.parse(acc.tokenSalt);
            let allHashes = JSON.parse(acc.tokenHash);
            allSalts.push(salt);
            let token = secStr();
            let newHash = crypto.createHash('sha512').update(token + salt).digest('hex');
            allHashes.push(newHash);
            let attrs = ['tokenSalt','tokenHash'];
            let vals = [allSalts,allHashes];
            if (acc.timeActivated == null) {
              attrs.push('timeActivated');
              vals.push(new Date().toISOString().replace('T',' ').substring(0,19));
            }
            updateTeam(acc.abbr,attrs,vals).then(() => {
              let mess = {method:'signedIn',token:token};
              ws.send(JSON.stringify(mess));
              return;
            });
          } else if (hash == acc.hash) {
            let temp = secStr();
            let tempSalt = secStr();
            let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
            let attrs = ['tempSalt','tempHash'];
            let vals = [tempSalt,tempHash];
            if (acc.timeActivated == null) {
              attrs.push('timeActivated');
              vals.push(new Date().toISOString().replace('T',' ').substring(0,19));
            }
            updateTeam(acc.abbr,attrs,vals).then(() => {
              ws.send(JSON.stringify({method:'prompt2fa',temp:temp}));
              setTimeout(() => { //give 90 secs to provide code
                updateTeam(acc.abbr,['tempSalt','tempHash'],[null,null]);
              },1000 * 90);
              return;
            });
          } else {
            return error(ws,'Incorrect password',result.method);
          }
        });
      } else if (result.method == 'signOut') {
        clubs.deleteToken(result.token).then(suc => {
          if (suc) {
            return error(ws,'505','505'); //leave
          }
        });
      } else if (result.method == 'changePass') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!checkPassword(result.oldPassword,acc)) {
          return error(ws,'Incorrect password entered',result.method);
        }
        if (result.password.length < 12) {
          return error(ws,'Password must be at least 12 characters',result.method);
        }
        if (!isASCII(result.password)) {
          return error(ws,'Password contains invalid characters',result.method);
        }
        let newSalt = secStr();
        let newHash = crypto.createHash('sha512').update(result.password + newSalt).digest('hex');
        updateTeam(acc.abbr,['salt','hash'],[newSalt,newHash]).then(() => {
          ws.send(JSON.stringify({method:'error',text:'Password changed',type:result.method,good:true}));
        });
      } else if (result.method == 'univSignOut') {
        if (!acc) {
          return error(ws,'505','505');
        }
        updateTeam(acc.abbr,['tokenSalt','tokenHash'],[[],[]]).then(() => {
          announce(acc.abbr,{method:'signOut'});
        });
      } else if (result.method == 'enable2fa') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!checkPassword(result.password,acc)) {
          return error(ws,'Incorrect password entered',result.method);
        }
        if (acc.twoFactor && Boolean(acc.factorActivated)) {
          return error(ws,'2FA is already enabled',result.method);
        }
        let secret = speakeasy.generateSecret();
        secret.otpauth_url += '&issuer=The League';
        secret.otpauth_url = secret.otpauth_url.replace('SecretKey',acc.mascot);
        let encSecret = Cred.encrypt(secret.base32,acc.mascot);
        updateTeam(acc.abbr,['twoFactor'],[encSecret]).then(() => {
          QR.toDataURL(secret.otpauth_url,function(err,data_url) {
            ws.send(JSON.stringify({method:'qr',data:data_url}));
          });
        });
      } else if (result.method == 'verify2fa') {
        if (!acc) {
          return error(ws,'505','505');
        }
        let decSecret = Cred.decrypt(acc.twoFactor,acc.mascot);
        let verified = speakeasy.totp.verify({secret:decSecret,encoding:'base32',token:result.code});
        if (verified) {
          updateTeam(acc.abbr,['factorActivated'],[true]).then(() => {
            return error(ws,'Two-Factor Authentication successfully enabled',result.method);
          });
        } else {
          return error(ws,'Incorrect code entered',result.method);
        }
      } else if (result.method == 'verifyEmail') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!checkPassword(result.password,acc)) {
          return error(ws,'Incorrect password entered',result.method);
        }
        if (!validateEmail(result.email)) {
          return error(ws,'Email is not valid',result.method);
        }
        if (acc.emailActivated) {
          return error(ws,'Email is already verified',result.method);
        }
        let veriCode = getSixDigit();
        let veriSalt = secStr();
        let veriHash = crypto.createHash('sha512').update(veriCode + veriSalt).digest('hex');
        let encAddress = Cred.encrypt(result.email,acc.mascot);
        updateTeam(acc.abbr,['tempSalt','tempHash','email'],[veriSalt,veriHash,encAddress]).then(() => {
          Email.verify(veriCode,result.email);
          ws.send(JSON.stringify({method:'error',type:result.method,text:`Check ${result.email} for an email from theleagueupdates@gmail.com`,good:true}));
          setTimeout(() => {
            updateTeam(acc.abbr,['tempSalt','tempHash'],[null,null]);
          }, 120 * 1000);
        });
      } else if (result.method == 'verifyCode') {
        if (!acc) {
          return error(ws,'505','505');
        }
        let hash = crypto.createHash('sha512').update(result.code + acc.tempSalt).digest('hex');
        if (acc.tempHash == hash) {
          updateTeam(acc.abbr,['emailActivated'],[true]).then(() => {
            let res = {method:'error',type:result.method,text:'Email verified',good:true};
            ws.send(JSON.stringify(res));
          });
        } else {
          error(ws,'Incorrect code',result.method);
        }
      } else if (result.method == 'getCodes') {
        if (!acc) {
          return error(ws,'505','505');
        }
        ws.send(JSON.stringify({method:'gottenCodes',codes:QRCS.getCodes(acc.abbr)}));
      } else if (result.method == 'signIn2fa') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (!acc) {
            return error(ws,'No account found',result.method);
          }
          let tempHash = crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex');
          if (acc.tempHash != tempHash) {
            return error(ws,'505','505');
          }
          let decSecret = Cred.decrypt(acc.twoFactor,acc.mascot);
          let verified = speakeasy.totp.verify({secret:decSecret,encoding:'base32',token:result.code});
          if (verified) {
            let newSalt = secStr();
            let newToken = secStr();
            let newHash = crypto.createHash('sha512').update(newToken + newSalt).digest('hex');
            let allSalts = JSON.parse(acc.tokenSalt);
            let allHashes = JSON.parse(acc.tokenHash);
            allSalts.push(newSalt);
            allHashes.push(newHash);
            updateTeam(acc.abbr,['tokenSalt','tokenHash','tempSalt','tempHash'],[allSalts,allHashes,null,null]).then(() => {
              ws.send(JSON.stringify({method:'signedIn',token:newToken}));
            });
          } else {
            return error(ws,'Incorrect code entered',result.method);
          }
        });
      } else if (result.method == 'sendEmail') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (!acc.email) {
            return error(ws,'There is not a valid email associated with this account',result.method);
          }
          let email = Cred.decrypt(acc.email,acc.mascot);
          if (!validateEmail(email)) {
            return error(ws,'There is not a valid email associated with this account',result.method);
          }
          if (emailTimestamp[acc.abbr]) {
            if (new Date().getTime() - emailTimestamp[acc.abbr] < 1000 * 120) {
              return; //duplicate request
            }
          }
          emailTimestamp[acc.abbr] = new Date().getTime();
          let recoCode = getSixDigit();
          let recoSalt = secStr();
          let recoHash = crypto.createHash('sha512').update(recoCode + recoSalt).digest('hex');
          updateTeam(acc.abbr,['recoHash','recoSalt'],[recoHash,recoSalt]).then(() => {
            Email.recover(recoCode,email);
            ws.send(JSON.stringify({method:'sentEmail',star:Email.star(email)}));
            setTimeout(() => {
              emailTimestamp[acc.abbr] = 0;
              updateTeam(acc.abbr,['recoHash','recoSalt'],[null,null]);
            },1000*120);
          });
        });
      } else if (result.method == 'checkEmailCode') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (!acc) {
            return error(ws,'505','505');
          }
          if (limitAttempts(ws)) {
            return error(ws,'You have exceeded your attempt limit. Wait 10 minutes',result.method);
          }
          let hash = crypto.createHash('sha512').update(result.code + acc.recoSalt).digest('hex');
          if (hash != acc.recoHash) {
            return error(ws,'Incorrect code',result.method);
          }
          let temp = secStr();
          let tempSalt = secStr();
          let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
          updateTeam(acc.abbr,['recoSalt','recoHash','tempSalt','tempHash'],[null,null,tempSalt,tempHash]).then(() => {
            ws.send(JSON.stringify({method:'activated',temp:temp}));
          });
        });
      } else if (result.method == 'checkRecoCode') {
        clubs.getTeamFromMascot(result.username).then(acc => {
          if (limitAttempts(ws)) {
            return error(ws,'You have exceeded your attempt limit. Wait 10 minutes',result.method);
          }
          request('SELECT * FROM codes').then(list => {
            if (!acc) {
              return error(ws,'505','505');
            }
            if (!result.code) {
              return error(ws,'No code entered',result.method);
            }
            if (result.code.length != 10) {
              return error(ws,'Invalid code',result.method);
            }
            if (!QRCS.checkCode(acc.abbr,result.code)) {
              return error(ws,'Incorrect code',result.method);
            }
            for (let item of list) {
              if (Cred.decrypt(item.code,Cred.key()) == result.code) {
                return error(ws,'This code has already been used',result.method);
              }
            }
            let temp = secStr();
            let tempSalt = secStr();
            let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
            request(`INSERT INTO codes (code) VALUES ('${Cred.encrypt(result.code,Cred.key())}');`).then(() => {
              updateTeam(acc.abbr,['tempSalt','tempHash'],[tempSalt,tempHash]).then(() => {
                ws.send(JSON.stringify({method:'activated',temp:temp}));
              });
            });
          });
        });
      } else if (result.method == 'removeEmail') {
        if (!acc) {
          return error(ws,'505','505');
        }
        updateTeam(acc.abbr,['email','emailActivated'],[null,false]).then(() => {
          let res = {method:'error',type:result.method,text:'Email removed (refresh to reflect changes)',good:true};
          ws.send(JSON.stringify(res));
        });
      } else if (result.method == 'removeFactor') {
        if (!acc) {
          return error(ws,'505','505');
        }
        updateTeam(acc.abbr,['twoFactor','factorActivated'],[null,false]).then(() => {
          let res = {method:'error',type:result.method,text:'Two-factor authentication removed (refresh to reflect changes)',good:true};
          ws.send(JSON.stringify(res));
        });
      } else if (result.method == 'connectAsTeam') {
        if (!acc) {
          if (result.needed) {
            return error(ws,'505','505');
          } else {
            acc = {abbr:'XXX'};
          }
        }
        if (!activeCxns[acc.abbr]) {
          activeCxns[acc.abbr] = [];
        }
        ws.id = secStr();
        activeCxns[acc.abbr].push(ws);
      } else if (result.method == 'connectToGame') {
        ws.id = secStr();
        gameSockets.push(ws);
        if (gameActive) {
          let g = JSON.parse(JSON.stringify(game));
          g.away.offPlays = undefined;
          g.away.defPlays = undefined;
          g.away.spePlays = undefined;
          g.home.offPlays = undefined;
          g.home.defPlays = undefined;
          g.home.spePlays = undefined;
          ws.send(JSON.stringify({type:'newGame',game:g}));
        }
      } else if (result.method == 'offerTrade') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!span.canTrade()) {
          return error(ws,'The trade deadline has passed',result.method);
        }
        if (result.fromOffer.length == 0 || result.toOffer.length == 0) {
          return error(ws,'Invalid trade',result.method);
        }
        deals.getAll().then(trades => {
          result.from = acc.abbr;
          let id = secStr(8).toUpperCase();
          let unique = true;
          for (let t of trades) {
            if (t.id == id) {
              unique = false;
              break;
            }
          }
          while (!unique) {
            id = secStr(8).toUpperCase();
            unique = true;
            for (let t of trades) {
              if (t.id == id) {
                unique = false;
                break;
              }
            }
          }
          let status = 'offered';
          if (result.counterId) {
            status = 'counter';
          }
          let d = new Date();
          let s = d.toISOString().replace('T',' ').substring(0,19);
          let r = `INSERT INTO trades (fromTeam,toTeam,fromOffer,toOffer,tradeTime,status,fromShow,toShow,id) VALUES `;
          r += `('${acc.abbr}','${result.to}','${JSON.stringify(result.fromOffer)}','${JSON.stringify(result.toOffer)}','${s}','${status}',1,1,'${id}');`;
          if (result.counterId) {
            r += `UPDATE trades SET status='countered' WHERE id=${con.escape(result.counterId)};`;
          }
          result.token = undefined;
          result.id = id;
          result.time = s;
          result.status = status;
          athletes.getAllPlayers().then(players => {
            let fromValue = 0, toValue = 0;
            let fromAths = 0, toAths = 0;
            for (let a in result.fromOffer) {
              if (a.type == 'pick') {
                fromValue += pickValue(a.pick);
              } else {
                let v = expandPlayers([athletes.getPlayerFromList(a.id,players)])[0].composite;
                fromAths += v;
                fromValue += v;
              }
            }
            for (let a in result.toOffer) {
              if (a.type == 'pick') {
                toValue += pickValue(a.pick);
              } else {
                let v = expandPlayers([athletes.getPlayerFromList(a.id,players)])[0].composite;
                toAths += v;
                toValue += v;
              }
            }
            if (fromAths == 0 && toAths == 0) { //no players involved
              if (Math.abs(fromValue - toValue) > 25) {
                return error(ws,'This trade is not allowed',result.method);
              }
            } else { //players involved
              if (Math.abs(fromValue - toValue) > 100) {
                return error(ws,'This trade is not allowed',result.method);
              }
            }
            request(r).then(() => {
              for (let o of result.fromOffer.concat(result.toOffer)) {
                if (o.type == 'player') {
                  o.ath = athletes.getPlayerFromList(o.id,players)
                }
              }
              announce(acc.abbr,{method:'tradeOffered',trade:result});
              announce(result.to,{method:'tradeOffered',trade:result});
              if (result.counterId) {
                deals.getTradeFromId(result.counterId).then(trade => {
                  let res = {method:'tradeUpdate',time:trade.tradeTime,status:'COUNTERED',id:trade.id};
                  announce(acc.abbr,res);
                  announce(result.to,res);
                });
              }
            });
          });
        });
      } else if (result.method == 'retractTrade' || result.method == 'declineTrade') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!span.canTrade()) {
          return error(ws,'The trade deadline has passed',result.method);
        }
        deals.getTradeFromId(result.id).then(trade => {
          let sql = '';
          let status = '';
          if (trade.fromTeam == acc.abbr && result.method == 'retractTrade') {
            sql = `UPDATE trades SET status='retracted' WHERE id=${con.escape(result.id)}`;
            status = 'RETRACTED';
          } else if (trade.toTeam == acc.abbr && result.method == 'declineTrade') {
            sql = `UPDATE trades SET status='declined' WHERE id=${con.escape(result.id)}`;
            status = 'DECLINED';
          } else {
            return error(ws,'An error occurred',result.method);
          }
          request(sql).then(() => {
            let res = {method:'tradeUpdate',time:trade.tradeTime,status:status,id:result.id};
            announce(trade.toTeam,res);
            announce(trade.fromTeam,res);
          });
        });
      } else if (result.method == 'hideTrade') {
        if (!span.canTrade()) {
          return error(ws,'The trade deadline has passed',result.method);
        }
        deals.getTradeFromId(result.id).then(trade => {
          if (trade.fromTeam == acc.abbr) {
            request(`UPDATE trades SET fromShow=false WHERE id=${con.escape(result.id)}`);
          } else if (trade.toTeam == acc.abbr) {
            request(sql = `UPDATE trades SET toShow=false WHERE id=${con.escape(result.id)}`);
          } else {
            return error(ws,'An error occurred',result.method);
          }
        });
      } else if (result.method == 'getChannel') {
        if (!acc) {
          return error(ws,'505','505');
        }
        messages.getMessages(acc.abbr,result.channel).then(chats => {
          ws.send(JSON.stringify({method:'gottenChannel',chats:chats}));
        });
      } else if (result.method == 'postMessage') {
        if (!acc) {
          return error(ws,'505','505');
        }
        let d = new Date();
        let u = d.toISOString().replace('T',' ').substring(0,19);
        request(`INSERT INTO chat (sentFrom,sentTo,sent,message) VALUES ('${acc.abbr}',${con.escape(result.to)},'${u}','${cleanMessage(result.message)}')`).then(() => {
          let mess = {method:'postedMessage',sentFrom:acc.abbr,sentTo:result.to,message:cleanMessage(result.message),sent:u};
          announce(acc.abbr,mess);
          announce(result.to,mess);
        });
      } else if (result.method == 'draftPlayer') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (currentPick == -1) {
          return error(ws,'Draft has not started',result.method);
        }
        if (currentPick > 319) {
          return error(ws,'The draft has ended',result.method);
        }
        selections.getCurrentPick().then(pick => {
          if (pick.team != acc.abbr) {
            return error(ws,'It is not your pick',result.method);
          }
          if (!canPick) {
            return error(ws,'You cannot pick now',result.method);
          }
          draftPlayer(result.id,acc,false);
        });
      } else if (result.method == 'gottenPinned') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (currentPick > 319) {
          return;
        }
        athletes.getDraftablePlayers().then(players => {
          if (typeof result.pinned == 'string') {
            result.pinned = JSON.parse(result.pinned);
          }
          for (let p of players) {
            if (result.pinned.includes(p.id) && p.team == 'UFA') {
              return draftPlayer(p.id,acc,false);
            }
          }
        });
      } else if (result.method == 'teamInfo') {
        let abbr = result.abbr;
        clubs.getTeamFromAbbr(abbr).then(acc => {
          let team = {abbr:acc.abbr,mascot:acc.mascot,roster:acc.roster,w:acc.w,l:acc.l,dw:acc.dw,dl:acc.dl,division:acc.division};
          team.clean = team.mascot.toLowerCase().replace(/\s/g,'');
          news.getInvolvedStories(abbr).then(stories => {
            athletes.getAllPlayers().then(players => {
              var roster = [];
              for (let id of JSON.parse(team.roster)) {
                roster.push(id);
              }
              roster.sort();
              var a = [];
              for (let id of roster) {
                a.push(athletes.getPlayerFromList(id,players));
              }
              a = expandPlayers(a);
              stories.reverse();
              selections.getInvolvedPicks(abbr).then(picks => {
                for (let s of picks) {
                  s.clean = clubs.clean(Teams.getTeamFromAbbr(s.team).mascot);
                  s.round = Math.floor(s.pick / 40) + 1;
                  s.ordinal = ordinal(s.pick + 1);
                  s.pick = s.pick % 40 + 1;
                  if (s.player) {
                    if (s.player != '') {
                      s.player = athletes.getPlayerFromList(s.player,players);
                    }
                  }
                }
                ws.send(JSON.stringify({abbr:abbr,team:team,stories:stories,picks:picks,players:a}));
              });
            });
          });
        });
      } else if (result.method == 'getDelegates') {
        if (!acc) {
          return error(ws,'505','505');
        }
        clubs.getGamesLeft(acc.abbr).then(num => {
          ws.send(JSON.stringify({method:'gottenDelegates',gamesLeft:num,dele:expandDelegates(acc.delegates),solo:result.solo}));
        });
      } else if (result.method == 'getOffense' || result.method == 'getDefense') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!Teams.getAbbrs().includes(result.abbr)) {
          return error(ws,`Invalid Team ID: ${result.abbr}`,result.method);
        }
        if (result.num !== 0 && result.num !== 1) {
          return;
        }
        if (!['pass1','pass2','pass3','pass4','pass5','rush1','rush2','rush3'].includes(result.play)) {
          return error(ws,'Invalid play',result.method);
        }
        clubs.getTeamFromAbbr(result.abbr).then(team => {
          athletes.getAllPlayers().then(players => {
            let play;
            let arr;
            if (result.method == 'getOffense') {
              play = JSON.parse(team.offPlays)[result.play];
              arr = ['qb','rb','wr1','wr2','te','ol1','ol2'];
            } else {
              play = JSON.parse(team.defPlays)[result.play];
              arr = ['dl1','dl2','lb','cb1','cb2','cb3','s'];
            }
            if (!play) {
              return error(ws,'Play not found',result.method);
            }
            for (let pos of arr) {
              if (play[pos] != undefined && play[pos] != '') {
                play[pos] = onlyRankings(athletes.getPlayerFromList(play[pos],players));
              } else {
                play[pos] = undefined;
              }
            }
            if (play.type == 'pass' && result.abbr != acc.abbr) {
              play.wr1r = undefined;
              play.wr2r = undefined;
              play.ter = undefined;
              play.first = undefined;
              play.second = undefined;
              play.third = undefined;
            }
            let res = {method:result.method.replace('get','gotten'),play:play,num:result.num,roster:JSON.parse(acc.roster),playId:result.play};
            ws.send(JSON.stringify(res));
          });
        });
      } else if (result.method == 'search') { //various criteria
        athletes.getAllPlayers().then(players => {
          let res = {method:'searched',canSign:span.canSign(),canTrade:span.canTrade()};
          res.matches = athletes.searchPlayers(players,result.pos,result.id,result.team,result.base,result.guar,result.name,result.draftable,result.a,result.b,result.c,result.d);
          ws.send(JSON.stringify(res));
        });
      } else if (result.method == 'upgradeDelegate' || result.method == 'unfreezeDelegate') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!span.canSign()) {
          return error(ws,'The deadline for adjusting agents has passed',result.method);
        }
        if (result.index < 0 || result.index > 19) {
          return error(ws,'Invalid agent',result.method);
        }
        let deles = JSON.parse(acc.delegates);
        let dele = expandDelegates([deles[result.index]])[0];
        if (result.method == 'upgradeDelegate') {
          dele.level++;
          dele.level = (dele.level>5)?5:dele.level;
          dele.investment += 25;
        } else {
          dele.investment += dele.bailAmount;
          dele.available = 0;
          dele.timeout = 'None';
          dele.bail = '$0';
          dele.bailAmount = 0;
          dele.frozen = false;
        }
        updateTeam(acc.abbr,['delegates'],[deles]).then(() => {
          ws.send(JSON.stringify({method:'updateDelegate',delegate:dele}));
        });
      } else if (result.method == 'negotiate') { //new contract, used delegates
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!span.canSign()) {
          return error(ws,'The deadline for negotiating contracts has passed',result.method);
        }
        if (!validPlayer(result.id)) {
          return error(ws,`Invalid player ID: #${result.id}`,result.method);
        }
        athletes.getPlayerFromId(result.id).then(player => {
          if (player.team != 'UFA' && player.team != acc.abbr) {
            return error(ws,'You cannot negotiate with this player',result.method);
          }
          let c = result.contract;
          if (c.guar < player.guar) {
            return error(ws,'You cannot negotiate for less guaranteed money',result.method);
          }
          let deles = expandDelegates(acc.delegates);
          let usedDeles = [];
          let total = 0;
          let cooldown = 24;
          if (span.faPeriod()) {
            cooldown = 6;
          }
          let unix = new Date().getTime();
          for (let i = 0; i < 20; i++) {
            if (result.deles.includes(i) && !deles[i].frozen) {
              usedDeles.push(deles[i]);
              total += power(deles[i].level);
              deles[i].available = unix + 1000 * 60 * 60 * cooldown;
            }
          }
          let diff = difficulty(player.base,player.guar,player.duration,c.base,c.guar,c.dura,player.ego);
          if (diff <= 0) {
            return error(ws,'Invalid difficulty',result.method);
          }
          if (total <= 0) {
            return error(ws,'Not enough agents for negotiation attempt',result.method);
          }
          let chance = total / diff;
          let sql = '';
          clubs.getGamesLeft(acc.abbr).then(left => {
            let succ = true; //assume true until false
            let ros = JSON.parse(acc.roster);
            if (Math.random() < chance) { //successful negotiation
              for (let d of usedDeles) {
                d.level += 0.5;
              }
              ros.push(player.id);
              let deadAdj = (player.duration - c.dura) * player.base;
              deadAdj = (deadAdj<0)?0:deadAdj;
              sql += `UPDATE teams SET roster = '${JSON.stringify(ros)}',dead=dead+${deadAdj} WHERE abbr='${acc.abbr}';`;
              sql += `UPDATE players SET team='${acc.abbr}',base=${c.base},guar=${c.guar},duration=${left},weekSigned=${getCurrentWeek()} WHERE id='${player.id}';`;
              sql += alterPlaysWithPlayer(acc,player.id,true).sql;
            } else { //unsuccessful
              console.log('u');
              succ = false;
              for (let d of usedDeles) {
                d.level += 0.25;
              }
            }
            let delesCopy = [];
            for (let d of deles) {
              delesCopy.push({level:d.level,investment:d.investment,i:d.i,available:d.available});
            }
            sql += `UPDATE teams SET delegates = '${JSON.stringify(delesCopy)}' WHERE abbr='${acc.abbr}';`;
            console.log(sql);
            request(sql).then(() => {
              if (succ) {
                athletes.getPlayers(ros).then(roster => { //only need to update after successful nego
                  clubs.breakdown(expandPlayers(roster),acc,ws);
                });
                player.team = acc.abbr; //update player before expanding
                player.base = c.base;
                player.guar = c.guar;
                player.weekSigned = getCurrentWeek();
                player.duration = left;
                setTimeout(() => { announceToAll({method:'updatePlayer',player:expandPlayers([player])[0]}); },2000);
              }
              setTimeout(() => { ws.send(JSON.stringify({method:'negotiated',success:succ,deles:expandDelegates(deles)})); },2000);
            });
          });
        });
      } else if (result.method == 'releasePlayer') {
        if (!acc) {
          return error(ws,'505','505');
        }
        let roster = JSON.parse(acc.roster);
        roster = roster.filter(e => e !== result.id);
        let sql = `UPDATE teams SET roster='${JSON.stringify(roster)}' WHERE abbr='${acc.abbr}';`;
        sql += `UPDATE players SET team='UFA' WHERE id='${result.id}';`;
        sql += alterPlaysWithPlayer(acc,result.id,false).sql;
        console.log(sql);
        request(sql).then(() => {
          athletes.getPlayers(roster).then(full => {
            clubs.breakdown(full,acc,ws);
            athletes.getPlayerFromId(result.id).then(player => {
              announceToAll({method:'updatePlayer',player:expandPlayers([player])[0]});
              news.newStory([acc.abbr],`The ${acc.mascot} have released ${player.fName} ${player.lName} (${player.pos} #${player.id})`);
              return error(ws,`Player ID #${player.id} released`,result.method);
            });
          });
        });
      } else if (result.method == 'acceptTrade') {
        if (!acc) {
          return error(ws,'505','505');
        }
        if (!span.canTrade()) {
          return error(ws,'The trade deadline has passed',result.method);
        }
        deals.getTradeFromId(result.id).then(trade => {
          selections.getAllPicks().then(picks => {
            clubs.getTeamFromAbbr(trade.fromTeam).then(fromTeam => {
              let toTeam = acc;
              let fromOffer = JSON.parse(trade.fromOffer);
              let toOffer = JSON.parse(trade.toOffer);
              let sql = '';
              let fromAssets = [];
              let toAssets = [];
              let pickList = [];
              for (let o of fromOffer) { //give FROM draft picks to TO
                if (o.type == 'pick') {
                  if (o.pick <= currentPick) { //pick has already happened
                    return error(ws,'A draft pick in this trade has already been used',result.method);
                  }
                  pickList.push(o.pick)
                  fromAssets.push(`the ${ordinal(o.pick)} overall pick`);
                  picks[o.pick].team = toTeam.abbr;
                  picks[o.pick].trades = JSON.stringify(JSON.parse(picks[o.pick].trades).concat(toTeam.abbr));
                  sql += `UPDATE draft SET team='${toTeam.abbr}',trades=${JSON.stringify(picks[o.pick].trades)} WHERE pick=${o.pick};`;
                }
              }
              for (let o of toOffer) { //give TO draft picks to FROM
                if (o.type == 'pick') {
                  if (o.pick <= currentPick) { //pick has already happened
                    return error(ws,'A draft pick in this trade has already been used',result.method);
                  }
                  pickList.push(o.pick);
                  toAssets.push(`the ${ordinal(o.pick)} overall pick`);
                  picks[o.pick].team = fromTeam.abbr;
                  picks[o.pick].trades = JSON.stringify(JSON.parse(picks[o.pick].trades).concat(fromTeam.abbr));
                  sql += `UPDATE draft SET team='${fromTeam.abbr}',trades=${JSON.stringify(picks[o.pick].trades)} WHERE pick=${o.pick};`;
                }
              }
              let fromPlayersIds = [];
              let toPlayersIds = [];
              for (let o of fromOffer) { //get all ids
                if (o.type == 'player') {
                  fromPlayersIds.push(o.id);
                }
              }
              for (let o of toOffer) { //get all ids
                if (o.type == 'player') {
                  toPlayersIds.push(o.id);
                }
              }
              athletes.getPlayers(fromPlayersIds).then(fromPlayers => {
                for (let p of fromPlayers) { //check if players still on teams
                  if (p.team != fromTeam.abbr) {
                    return error(ws,`${p.fName} ${p.lName} is no longer on the ${fromTeam.mascot}`,result.method);
                  }
                  fromAssets.push(`${p.fName} ${p.lName} (${p.pos} #${p.id})`);
                }
                athletes.getPlayers(toPlayersIds).then(toPlayers => {
                  for (let p of toPlayers) { //check if players still on teams
                    if (p.team != toTeam.abbr) {
                      return error(ws,`${p.fName} ${p.lName} is no longer on the ${toTeam.mascot}`,result.method);
                    }
                    toAssets.push(`${p.fName} ${p.lName} (${p.pos} #${p.id})`);
                  }
                  let fromRoster = JSON.parse(fromTeam.roster);
                  let toRoster = JSON.parse(toTeam.roster);
                  let fromDead = 0;
                  let toDead = 0;
                  clubs.getGamesLeft(fromTeam.abbr).then(fromLeft => {
                    clubs.getGamesLeft(toTeam.abbr).then(toLeft => {
                      for (let id of fromPlayersIds) { //players to removed from FROM in roster array
                        fromRoster = fromRoster.filter(e => e !== id);
                        toRoster.push(id);
                      }
                      for (let id of toPlayersIds) { //players to removed from TO in roster array
                        toRoster = toRoster.filter(e => e !== id);
                        fromRoster.push(id);
                      } //all players have been moved in roster array
                      for (let p of fromPlayers) { //move money and update players
                        fromDead += p.guar / 2 + (p.duration - fromLeft) * p.base;
                        p.guar /= 2;
                        p.duration = toLeft;
                        p.team = toTeam.abbr;
                        p.weekSigned = getCurrentWeek();
                        sql += `UPDATE players SET guar=${p.guar},duration=${p.duration},team='${p.team}',weekSigned=${getCurrentWeek()} WHERE id='${p.id}';`;
                      }
                      for (let p of toPlayers) { //move money and update players
                        toDead += p.guar / 2 + (p.duration - toLeft) * p.base;
                        p.guar /= 2;
                        p.duration = fromLeft;
                        p.team = fromTeam.abbr;
                        p.weekSigned = getCurrentWeek();
                        sql += `UPDATE players SET guar=${p.guar},duration=${p.duration},team='${p.team}',weekSigned=${getCurrentWeek()} WHERE id='${p.id}';`;
                      }
                      sql += `UPDATE teams SET dead=dead+${fromDead} WHERE abbr='${fromTeam.abbr}';`;
                      sql += `UPDATE teams SET dead=dead+${toDead} WHERE abbr='${toTeam.abbr}';`;
                      let fromIds = [], toIds = [];
                      for (let p of fromPlayers) { fromIds.push(p.id); }
                      for (let p of toPlayers) { toIds.push(p.id); }
                      let fromPlays = bulkAlterPlays(fromTeam,fromIds,false).plays;
                      fromTeam.offPlays = fromPlays.off;
                      fromTeam.defPlays = fromPlays.def;
                      fromTeam.spePlays = fromPlays.spe;
                      let toPlays = bulkAlterPlays(toTeam,toIds,false).plays;
                      toTeam.offPlays = toPlays.off;
                      toTeam.defPlays = toPlays.def;
                      toTeam.spePlays = toPlays.spe;
                      sql += bulkAlterPlays(fromTeam,toIds,true).sql;
                      sql += bulkAlterPlays(toTeam,fromIds,true).sql;
                      sql += `UPDATE trades SET status='accepted' WHERE id=${con.escape(result.id)}`;
                      if (fromAssets.length == 2) {
                        var fromStr = fromAssets.toString().replace(/(.*),(.*)$/, '$1 and $2');
                      } else {
                        var fromStr = fromAssets.toString().replaceAll(',',', ');
                      }
                      if (toAssets.length == 2) {
                        var toStr = toAssets.toString().replace(/(.*),(.*)$/, '$1 and $2');
                      } else {
                        var toStr = toAssets.toString().replaceAll(',',', ');
                      }
                      let story = `The ${fromTeam.mascot} have traded ${fromStr} to the ${toTeam.mascot} for ${toStr}`;
                      request(sql).then(() => {
                        athletes.getPlayers(fromRoster).then(fullFrom => {
                          athletes.getPlayers(toRoster).then(toFrom => {
                            clubs.breakdown(fullFrom,fromTeam,'all');
                            clubs.breakdown(toFrom,toTeam,'all');
                            let res = {method:'tradeUpdate',time:trade.tradeTime,status:'ACCEPTED',id:result.id};
                            announce(trade.toTeam,res);
                            announce(trade.fromTeam,res);
                            news.newStory([fromTeam.abbr,toTeam.abbr],story);
                            selections.getPicks(pickList).then(list => {
                              if (list.length > 0) {
                                announceToAll({method:'updatePicks',picks:list});
                                announceToAll({method:'breaking',text:story});
                              }
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      } else if (result.method == 'getFullRoster') {
        if (!acc) {
          return error(ws,'505','505');
        }
        athletes.getPlayers(acc.roster).then(players => {
          ws.send(JSON.stringify({method:'gottenFullRoster',players:expandPlayers(players)}));
        });
      } else if (result.method == 'savePlays') { //off,def,spe,cases
        if (!acc) {
          return error(ws,'505','505');
        }
        let compOff = acc.offPlays;
        let compDef = acc.defPlays;
        let compSpe = acc.spePlays;
        let off = JSON.parse(acc.offPlays);
        let def = JSON.parse(acc.defPlays);
        let spe = JSON.parse(acc.spePlays);
        let caseCheck = ['1s','1m','1l','1e','2s','2m','2l','2e','3s','3m','3l','3e','4s','4m','4l','4e','2p'];
        let labels = ['pass1','pass2','pass3','pass4','pass5','rush1','rush2','rush3'];
        for (let a in caseCheck) { //check validity of cases
          if (result.cases[a] == '' || result.cases[a] == undefined) {
            return error(ws,'Not all play cases declared',result.method);
          }
          if (!labels.includes(result.cases[a])) {
            return error(ws,'Invalid play case',result.method);
          }
        }
        for (let a in off) { //remove and replace cases
          off[a].cases.length = 0;
          for (let c in result.cases) {
            if (result.cases[c] == a) {
              off[a].cases.push(c);
            }
          }
        }
        for (let a in result.off) { //does not do cases
          if (!labels.includes(a)) {
            return error(ws,'Invalid play name',result.method);
          }
          let onField = [];
          for (let i in result.off[a]) {
            if (['wr1r','wr2r','ter','name','type','first','second','third','cases'].includes(i)) {
              if (['wr1r','wr2r','ter'].includes(i)) {
                if (!['go','post','corner','in','out','slant'].includes(result.off[a][i])) {
                  return error(ws,'Invalid route name',result.method);
                }
                off[a][i] = result.off[a][i];
              } else if (['first','second','third'].includes(i)) {
                if (!['wr1','wr2','te'].includes(result.off[a][i])) {
                  return error(ws,'Invalid read position',result.method);
                }
                off[a][i] = result.off[a][i];
              } else if (i == 'name') {
                off[a].name = result.off[a].name.substring(0,10); //only keep first ten chars
              }
              continue;
            }
            if (!JSON.parse(acc.roster).includes(result.off[a][i].id)) {
              return error(ws,`Player ID #${result.off[a][i].id} is not on team`,result.method);
            }
            if (!isMatch(i,result.off[a][i].id)) {
              return error(ws,`Player ID #${result.off[a][i].id} is not in the right position`,result.method);
            }
            if (onField.includes(result.off[a][i].id)) {
              return error(ws,`Player ID #${result.off[a][i].id} is used twice`,result.method);
            } else {
              onField.push(result.off[a][i].id);
            }
            off[a][i] = result.off[a][i].id;
          }
        }
        for (let a in result.def) {
          if (!labels.includes(a)) {
            return error(ws,'Invalid play name',result.method);
          }
          let onField = [];
          for (let i in result.def[a]) {
            if (!JSON.parse(acc.roster).includes(result.def[a][i].id)) {
              return error(ws,`Player ID #${result.def[a][i].id} is not on team`,result.method);
            }
            if (!isMatch(i,result.def[a][i].id)) {
              return error(ws,`Player ID #${result.def[a][i].id} is not in the right position`,result.method);
            }
            if (onField.includes(result.def[a][i].id)) {
              return error(ws,`Player ID #${result.def[a][i].id} is used twice`,result.method);
            } else {
              onField.push(result.def[a][i].id);
            }
            def[a][i] = result.def[a][i].id;
          }
        }
        for (let a in result.spe) {
          if (!['fg','longFg','pat','punt','puntReturn','kickoff','return'].includes(a)) {
            return error(ws,'Invalid play name',result.method);
          }
          let onField = [];
          for (let i in result.spe[a]) {
            if (!JSON.parse(acc.roster).includes(result.spe[a][i])) {
              return error(ws,`Player ID #${result.spe[a][i]} is not on team`,result.method);
            }
            if (!isMatch(i,result.spe[a][i])) {
              return error(ws,`Player ID #${result.spe[a][i]} is not in the right position`,result.method);
            }
            if (onField.includes(result.spe[a][i].id)) {
              return error(ws,`Player ID #${result.spe[a][i]} is used twice`,result.method);
            } else {
              onField.push(result.spe[a][i]);
            }
            spe[a][i] = result.spe[a][i];
          }
        }
        let sql = '';
        clubs.nextGame(acc.abbr).then(next => {
          let untilNext = new Date(next.schedule).getTime() - new Date().getTime();
          let tooLate = false;
          if (compOff != JSON.stringify(off) && untilNext > 1000 * 60 * 60 * 6) {
            sql += `UPDATE teams SET offPlays='${JSON.stringify(off)}' WHERE abbr='${acc.abbr}';`;
          } else if (compOff != JSON.stringify(off)) {
            tooLate = true;
          }
          if (compDef != JSON.stringify(def)) {
            sql += `UPDATE teams SET defPlays='${JSON.stringify(def)}' WHERE abbr='${acc.abbr}';`;
          }
          if (compSpe != JSON.stringify(spe)) {
            sql += `UPDATE teams SET spePlays='${JSON.stringify(spe)}' WHERE abbr='${acc.abbr}';`;
          }
          if (sql != '') {
            request(sql).then(() => {
              if (tooLate) {
                error(ws,'Offensive changes cannot be saved now (all other changes saved)',result.method);
              } else {
                error(ws,'Changes saved',result.method);
              }
            });
          } else {
            error(ws,'No changes to save',result.method);
          }
        });
      } else if (result.method == 'getAssets') {
        if (!Teams.getAbbrs().includes(result.to)) {
          return error(ws,`Invalid team: ${result.to}`,result.method);
        }
        if (!Teams.getAbbrs().includes(result.from)) {
          return error(ws,`Invalid team: ${result.from}`,result.method);
        }
        clubs.getAssets(result.to).then(toAssets => {
          clubs.getAssets(result.from).then(fromAssets => {
            ws.send(JSON.stringify({method:'gottenAssets',to:result.to,from:result.from,fromAssets:fromAssets,toAssets:toAssets}));
          });
        });
      }
    });
  });
});

//general resources

function getCurrentWeek() {
  var d = DateTime.now().setZone('America/Denver');
  var m = d.month;
  var t = d.day;
  if (m > 2 && m < 9) { //preseason for march to august
    return 0;
  } else if (m == 9) { //september
    if (t < 9) {
      return 0;
    } else if (t < 15) {
      return 1;
    } else if (t < 22) {
      return 2;
    } else if (t < 29) {
      return 3;
    }
    return 4;
  } else if (m == 10) { //october
    if (t < 6) {
      return 4;
    } else if (t < 13) {
      return 5;
    } else if (t < 20) {
      return 6;
    } else if (t < 27) {
      return 7;
    }
    return 8;
  } else if (m == 11) { //november
    if (t < 3) {
      return 8;
    } else if (t < 10) {
      return 9;
    } else if (t < 17) {
      return 10;
    } else if (t < 24) {
      return 11;
    }
    return 12;
  } else if (m == 12) { //december
    if (t < 8) {
      return 13;
    } else if (t < 15) {
      return 14;
    } else if (t < 22) {
      return 15;
    } else if (t < 29) {
      return 16;
    }
    return 17;
  } else if (m == 1) { //january
    if (t < 5) {
      return 17;
    } else if (t < 12) {
      return 18;
    } else if (t < 19) {
      return 19;
    } else if (t < 25) {
      return 20;
    } else if (t < 28) {
      return 21; //wild card
    }
    return 22; //divsional
  } else if (m == 2) { //february
    if (t < 4) {
      return 23; //conference
    }
  }
  return 24; //championship
}

function plural(str,num) {
  if (num == 1) {
    return str;
  } else {
    return str + 's';
  }
}

function ordinal(num) {
  if (num % 10 == 1 && num % 100 != 11) {
    return `${num}st`;
  } else if (num % 10 == 2 && num % 100 != 12) {
    return `${num}nd`;
  } else if (num % 10 == 3 && num % 100 != 13) {
    return `${num}rd`;
  } else {
    return `${num}th`;
  }
}

function clean(arr) {
  return arr.filter((el) => el != null);
}

function normalRandom(m,s) {
  var u = 0;
  var v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) * s + m;
}

//main methods

function expandDelegates(list) {
  if (typeof list == 'string') {
    list = JSON.parse(list);
  }
  let n = new Date();
  for (let d of list) {
    d.render = renderAmount(d.investment);
    if (n.getTime() < d.available) { //dele not yet available
      d.frozen = true;
      let x = d.available - n.getTime();
      d.timeout = timeBetween(x);
      if (!span.faPeriod()) {
        x /= 4;
      }
      let bail = 2.143347050754458 / 1e13 * x ** 2;
      bail = Math.ceil(bail);
      d.bail = renderAmount(bail);
      d.bailAmount = bail;
    } else {
      d.timeout = 'None';
      d.bail = '$0';
      d.bailAmount = 0;
      d.frozen = false;
    }
  }
  return list;
}

function expandPlayers(list) {
  var sds = Teams.getStatsByPos();
  for (let p of list) {
    if (typeof p.stats == 'string') {
      p.stats = JSON.parse(p.stats);
    }
    p.s = {};
    for (let attr in p.stats) {
      p.s[attr] = 0;
    }
    if (typeof p.stat1 == 'string') {
      p.stat1 = JSON.parse(p.stat1);
    }
    if (typeof p.stat2 == 'string') {
      p.stat2 = JSON.parse(p.stat2);
    }
    if (typeof p.stat3 == 'string') {
      p.stat3 = JSON.parse(p.stat3);
    }
    if (typeof p.stat4 == 'string') {
      p.stat4 = JSON.parse(p.stat4);
    }
    for (let e of [p.stat1,p.stat2,p.stat3,p.stat4]) {
      if (e.sn != e.ln) {
        e.h = `<abbr title="${e.ln}">${e.sn}</abbr>`;
      } else {
        e.h = e.sn;
      }
    }
    if (p.team == 'UFA') {
      p.clean = 'league';
      p.mascot = 'Free Agent';
    } else {
      p.mascot = clubs.getAttrFromAbbr(p.team,'mascot');
      p.clean = clubs.clean(p.mascot);
    }
    let s = sds[p.pos];
    p[s[0].js] = {m:p.stat1.m,s:p.stat1.s};
    p[s[1].js] = {m:p.stat2.m,s:p.stat2.s};
    p[s[2].js] = {m:p.stat3.m,s:p.stat3.s};
    p[s[3].js] = {m:p.stat4.m,s:p.stat4.s};
    if (s[0].flip) {
      p.stat1.z *= -1;
    }
    if (s[1].flip) {
      p.stat2.z *= -1;
    }
    if (s[2].flip) {
      p.stat3.z *= -1;
    }
    if (s[3].flip) {
      p.stat4.z *= -1;
    }
    switch (p.pos) {
      case 'QB':
        var m = 10;
        break;
      case 'WR': case 'CB':
        var m = 9;
        break;
      case 'TE': case 'LB': case 'RB': case 'S':
        var m = 8;
        break;
      case 'OL': case 'DL':
        var m = 6.5;
        break;
      case 'K': case 'P':
        var m = 5;
        break;
    }
    let sum = (p.stat1.z + p.stat2.z + p.stat3.z + p.stat4.z) + 5;
    sum = (sum<0)?0:sum;
    sum = (sum>10)?10:sum;
    p.composite = sum * m * 0.8 + 20;
    p.stat1.r = ranking(p.stat1.z);
    p.stat2.r = ranking(p.stat2.z);
    p.stat3.r = ranking(p.stat3.z);
    p.stat4.r = ranking(p.stat4.z);
    p.renderBase = renderAmount(p.base);
    p.renderGuar = renderAmount(p.guar);
    p.salary = p.guar + p.base * p.duration;
    p.renderSalary = renderAmount(p.salary);
    if (p.weekSigned == 0) {
      p.ws = 'Preseason';
    } else {
      p.ws = `Week ${p.weekSigned}`;
    }
  }
  return list;
}

function onlyRankings(p) {
  let s = Teams.getStatsByPos()[p.pos];
  p.stat1 = JSON.parse(p.stat1);
  p.stat2 = JSON.parse(p.stat2);
  p.stat3 = JSON.parse(p.stat3);
  p.stat4 = JSON.parse(p.stat4);
  for (let e of [p.stat1,p.stat2,p.stat3,p.stat4]) {
    if (e.sn != e.ln) {
      e.h = `<abbr title="${e.ln}">${e.sn}</abbr>`;
    } else {
      e.h = e.sn;
    }
  }
  p[s[0].js] = {m:p.stat1.m,s:p.stat1.s};
  p[s[1].js] = {m:p.stat2.m,s:p.stat2.s};
  p[s[2].js] = {m:p.stat3.m,s:p.stat3.s};
  p[s[3].js] = {m:p.stat4.m,s:p.stat4.s};
  if (s[0].flip) {
    p.stat1.z = -p.stat1.z;
  }
  if (s[1].flip) {
    p.stat2.z = -p.stat2.z;
  }
  if (s[2].flip) {
    p.stat3.z = -p.stat3.z;
  }
  if (s[3].flip) {
    p.stat4.z = -p.stat4.z;
  }
  p.stat1.r = ranking(p.stat1.z);
  p.stat2.r = ranking(p.stat2.z);
  p.stat3.r = ranking(p.stat3.z);
  p.stat4.r = ranking(p.stat4.z);
  return {fName:p.fName,lName:p.lName,id:p.id,pos:p.pos,stat1:p.stat1,stat2:p.stat2,stat3:p.stat3,stat4:p.stat4};
}

function calcQBRating(comp,att,yards,tdPasses,int) {
  if (att == 0) {
    return '0.0';
  }
	var a = ((comp / att) - 0.3) * 5;
	a = (a>2.375)?2.375:a;
	a = (a<0)?0:a;
	var b = ((yards / att) - 3) * .25;
	b = (b>2.375)?2.375:b;
	b = (b<0)?0:b;
	var c = (tdPasses / att) * 20;
	c = (c>2.375)?2.375:c;
	c = (c<0)?0:c;
	var d = 2.375 - ((int / att) * 25);
	d = (d>2.375)?2.375:d;
	d = (d<0)?0:d;
	var rating = (a + b + c + d) / 6 * 100;
	return rating.toFixed(1);
}

function calcOffRating(plays,td,pts,yds) {
  if (plays == 0) {
    return '0.0';
  }
	var a = (pts/plays - 0.05) * 12;
	a = (a>4.5)?4.5:a;
	a = (a<0)?0:a;
	var b = (yds/plays - 1) / 2;
	b = (b>2.5)?2.5:b;
	b = (b<0)?0:b;
	var c = td/plays * 50;
	c = (c>2.5)?2.5:c;
	c = (c<0)?0:c;
	var rating = (a + b + c) / 6 * 100;
	return rating.toFixed(1);
}

function calcDefRating(plays,sacks,int,td,yds,pts) {
  if (plays == 0) {
    return '0.0';
  }
	var a = sacks/plays * 32;
	a = (a>1.9)?1.9:a;
	a = (a<0)?0:a;
	var b = int/plays * 24;
	b = (b>1.9)?1.9:b;
	b = (b<0)?0:b;
	var c = (0.14 - td/plays) * 16;
	c = (c>1.9)?1.9:c;
	c = (c<0)?0:c;
  var d = (12 - yds/plays) * 0.24;
  d = (d>1.9)?1.9:d;
	d = (d<0)?0:d;
  var e = (1.2 - pts/plays) * 1.9;
  e = (e>1.9)?1.9:e;
	e = (e<0)?0:e;
	var rating = (a + b + c + d + e) / 6 * 100;
	return rating.toFixed(1);
}

//seeding

function sortTeams(games) {
  return function(a,b) {
    return compareTeams(a,b,games);
  }
}

function compareTeams(a,b,games) {
  //1. record
  if (a.record != b.record) {
    return b.record - a.record;
  }
  if (a.record == 1 && b.record == 1 && a.w != b.w) {
    return b.w - a.w;
  }
  if (a.record == 0 && b.record == 0 && a.l != b.l) {
    return a.l - b.l;
  }
  //2. direct matchup
  var win = wonMatchup(a.abbr,b.abbr,games);
  if (win == true) {
    return -1;
  } else if (win == false) {
    return 1;
  }
  //3. div record
  if (a.divRecord != b.divRecord) {
    return b.divRecord - a.divRecord;
  }
  if (a.divRecord == 1 && b.divRecord == 1 && a.dw != b.dw) {
    return b.dw - a.dw;
  }
  if (a.divRecord == 0 && b.divRecord == 0 && a.dl != b.dl) {
    return a.dl - b.dl;
  }
  var at = differential(a.abbr,games);
  var bt = differential(a.abbr,games);
  //4. average point diff
  if (at.d != bt.d) {
    return bt.d - at.d;
  }
  //5. total points scored
  if (at.t != bt.t) {
    return bt.t - at.t;
  }
  //6. assume no change
  return 0;
}

function checkClinch(team,checks,games) {
  var pseudoTeam = {};
  pseudoTeam.abbr = team.abbr;
  pseudoTeam.record = (team.w) / 20;
  pseudoTeam.divRecord = (team.dw) / 6;
  for (let oppo of checks) {
    if (oppo.abbr == team.abbr) { //do not compare team to itself
      continue;
    }
    var pseudoOppo = {};
    pseudoOppo.abbr = oppo.abbr;
    var gamesLeft = 20 - oppo.w - oppo.l;
    pseudoOppo.record = (gamesLeft + oppo.w) / 20;
    var divGamesLeft = 6 - oppo.dw - oppo.dl;
    pseudoOppo.divRecord = (divGamesLeft + oppo.dw) / 6;
    if (compareTeams(pseudoTeam,pseudoOppo,games) > 0) {
      return false;
    }
  }
  return true;
}

function checkElim(team,checks,games) {
  for (let c of checks) {
    if (!checkClinch(c,[team],games)) { //if other team has not clinched over this team, team can still make it
      return false;
    }
  }
  return true;
}

function wonMatchup(a,b,games) {
  for (let g of games) {
    if (g.away == a && g.home == b && g.week != 0 && g.week < 21) {
      if (g.awayScore > g.homeScore) {
        return true;
      } else if (g.awayScore < g.homeScore) {
        return false;
      }
      break;
    } else if (g.away == b && g.home == a && g.week != 0 && g.week < 21) {
      if (g.awayScore > g.homeScore) {
        return false;
      } else if (g.awayScore < g.homeScore) {
        return true;
      }
      break;
    }
  }
  return undefined;
}

function differential(abbr,games) {
  let t = 0;
  let d = 0;
  for (let g of games) {
    if (g.away == abbr && g.week != 0 && g.week < 21) {
      t += g.awayScore;
      d += g.awayScore;
      d -= g.homeScore;
    } else if (g.home == abbr && g.week != 0 && g.week < 21) {
      t += g.homeScore;
      d += g.homeScore;
      d -= g.awayScore;
    }
  }
  return {t:t,d:d};
}

//plays and players

function bulkAlterPlays(acc,ids,add) { //does NOT return sqlByType
  let changed = {off:false,def:false,spe:false};
  for (let id of ids) {
    let o = alterPlaysWithPlayer(acc,id,add);
    for (let a in o.changed) {
      if (changed[a] == false && o.changed[a] == true) { //update /changed/
        changed[a] = true;
      }
      if (o.changed[a] == true) { //update plays for future iters
        acc[`${a}Plays`] = o.plays[a];
      }
    }
  }
  let sql = '';
  for (let a in changed) {
    if (changed[a] == true) {
      sql += `UPDATE teams set ${a}Plays='${JSON.stringify(acc[`${a}Plays`])}' WHERE abbr='${acc.abbr}';`;
    }
  }
  return {sql:sql,plays:{off:acc.offPlays,def:acc.defPlays,spe:acc.spePlays},changed:changed};
}

function alterPlaysWithPlayer(acc,id,add) {
  let pos = idToPos(id).toLowerCase();
  let type = '';
  let altered = false;
  let plays = {};
  let changed = {off:false,def:false,spe:false};
  for (let t of ['off','def','spe']) {
    if (typeof acc[`${t}Plays`] == 'string') {
      plays[t] = JSON.parse(acc[`${t}Plays`]);
    } else {
      plays[t] = acc[`${t}Plays`];
    }
  }
  if (['qb','rb','wr','te','ol'].includes(pos)) { //offense
    type = 'off';
  } else if (['k','p'].includes(pos)) { //special teams
    type = 'spe';
  } else { //defense
    type = 'def';
  }
  let book = plays[type];
  for (let name in book) {
    let play = book[name];
    if (JSON.stringify(play).indexOf(id) != -1 && add == true) { //already somewhere in play and cannot duplicate
      continue;
    }
    for (let loc in play) {
      if (loc.indexOf(pos) != -1 && (play[loc] == '' || play[loc] == undefined) && add == true) { //space is empty and need to add
        play[loc] = id;
        altered = true;
      } else if (play[loc] == id && add == false) { //need to remove player from position
        play[loc] = '';
        altered = true;
      }
    }
  }
  let sqlByType = {off:'',def:'',spe:''};
  let sql = '';
  if (altered) {
    changed[type] = true;
    sql[type] = `UPDATE teams SET ${type}Plays='${JSON.stringify(book)}' WHERE abbr='${acc.abbr}';`;
    sql = `UPDATE teams SET ${type}Plays='${JSON.stringify(book)}' WHERE abbr='${acc.abbr}';`;
  }
  altered = false; //reset for rb
  if (pos == 'rb') {
    var spe = plays.spe;
    if ((spe.return.rb == '' || spe.return.rb == undefined) && add == true) { //need to add returner
      spe.return.rb = id;
      altered = true;
    } else if (spe.return.rb == id && add == false) { //need to remove returner
      spe.return.rb = '';
      altered = true;
    }
    if ((spe.puntReturn.rb == '' || spe.puntReturn.rb == undefined) && add == true) { //need to add returner
      spe.puntReturn.rb = id;
      altered = true;
    } else if (spe.puntReturn.rb == id && add == false) { //need to remove returner
      spe.puntReturn.rb = '';
      altered = true;
    }
  }
  if (altered) {
    changed.spe = true;
    sqlByType.spe = `UPDATE teams SET spePlays='${JSON.stringify(spe)}' WHERE abbr='${acc.abbr}';`;
    sql += `UPDATE teams SET spePlays='${JSON.stringify(spe)}' WHERE abbr='${acc.abbr}';`;
  }
  return {sql:sql,plays:plays,changed:changed,sqlByType:sqlByType};
}

function isMatch(label,id) {
  switch (label) {
    case 'qb':
      var req = ['0'];
      break;
    case 'rb':
      var req = ['1'];
      break;
    case 'wr1': case 'wr2':
      var req = ['2','3'];
      break;
    case 'te':
      var req = ['4'];
      break;
    case 'ol1': case 'ol2':
      var req = ['5','6'];
      break;
    case 'dl1': case 'dl2':
      var req = ['7','8'];
      break;
    case 'lb':
      var req = ['9'];
      break;
    case 'cb1': case 'cb2': case 'cb3':
      var req = ['A','B','C'];
      break;
    case 's':
      var req = ['D'];
      break;
    case 'k':
      var req = ['E'];
      break;
    case 'p':
      var req = ['F'];
      break;
  }
  if (req.includes(id.charAt(0))) {
    return true;
  }
  return false;
}

function idToPos(id) {
  switch (id.charAt(0)) {
    case '0':
      return 'QB';
    case '1':
      return 'RB';
    case '2': case '3':
      return 'WR';
    case '4':
      return 'TE';
    case '5': case '6':
      return 'OL';
    case '7': case '8':
      return 'DL';
    case '9':
      return 'LB';
    case 'A': case 'B': case 'C':
      return 'CB';
    case 'D':
      return 'S';
    case 'E':
      return 'K';
    case 'F':
      return 'P';
  }
}

function ranking(val) {
  if (val >= 1.6) {
    return {abbr:'GE',cls:'generational',name:'Generational'};
  } else if (val <= -1.6) {
    return {abbr:'IN',cls:'inept',name:'Inept'};
  } else if (val >= 1.2) {
    return {abbr:'EX',cls:'excellent',name:'Excellent'};
  } else if (val <= -1.2) {
    return {abbr:'TE',cls:'terrible',name:'Terrible'};
  } else if (val >= 0.4) {
    return {abbr:'AA',cls:'aboveaverage',name:'Above Average'};
  } else if (val <= -0.4) {
    return {abbr:'BA',cls:'belowaverage',name:'Below Average'};
  } else {
    return {abbr:'AV',cls:'average',name:'Average'};
  }
}

function validPlayer(id) {
  if (id.length != 3) {
    return false;
  }
  if (parseInt(id.charAt(0),16) > 15 || isNaN(parseInt(id.charAt(0),16))) {
    return false;
  }
  if (Number(id.substring(1,3)) > 100 || isNaN(Number(id.substring(1,3)))) {
    return false;
  }
  return true;
}

//other

function roundAndPick(num) {
  return {r:Math.floor(num / 40) + 1,p:num % 40 + 1};
}

function pickValue(pick) {
  return 1.1155e8 / (19368.6 * pick + 1.4967e6) + 25.4658;
}

function reduce(arr,not) { //slices by default
  if (!Array.isArray(arr)) {
    return 0;
  }
  if (not === true) {
    return arr.reduce((a,b) => a + b,0);
  }
  if (arr.slice(1).reduce((a,b) => a + b,0) == undefined) {
    return 0;
  }
  return arr.slice(1).reduce((a,b) => a + b,0);
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

function power(lvl) {
  return 1.5 / Math.log(5) * Math.log(lvl) + 0.5;
}

function renderAmount(num) {
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

function timeBetween(l) {
  if (l < 60 * 1000) { //less than minute
    return Math.round(l / 1000) + ' ' + plural('second',Math.round(l / 1000));
  } else if (l < 60 * 60 * 1000) { //less than hour
    return Math.floor(l / 60000) + ' ' + plural('minute',Math.floor(l / 60000));
  } else if (l < 24 * 60 * 60 * 1000) { //less than day
    return Math.floor(l / 3600000) + ' ' + plural('hour',Math.floor(l / 3600000));
  } else if (l < 7 * 24 * 60 * 60 * 1000) { //less than week
    return Math.floor(l / 86400000) + ' ' + plural('day',Math.floor(l / 86400000));
  } else if (l < 56 * 24 * 60 * 60 * 1000) { //less than 8 weeks
    return Math.floor(l / 604800000) + ' ' + plural('week',Math.floor(l / 604800000));
  } else {
    return 'Forever ago';
  }
}

function timeSince(epoch) {
  if (epoch == 0) {
    return '';
  }
  var d = new Date();
  return timeBetween(d.getTime() - epoch);
}

//ws methods

function announceToAll(mess) {
  for (let abbr in activeCxns) {
    console.log(abbr,activeCxns[abbr].length);
    for (let cxn of activeCxns[abbr]) {
      if (cxn) {
        console.log('can send to',abbr);
        cxn.send(JSON.stringify(mess));
      }
    }
  }
}

function announce(abbr,mess) {
  if (activeCxns[abbr]) {
    for (let cxn of activeCxns[abbr]) {
      if (cxn) {
        cxn.send(JSON.stringify(mess));
      }
    }
  }
}

//security

function limitAttempts(ws) {
  if (!ws._socket.remoteAddress) {
    ws._socket.remoteAddress = 'x';
  }
  if (attemptIPs[ws._socket.remoteAddress] == undefined) {
    attemptIPs[ws._socket.remoteAddress] = 0;
  }
  if (attemptIPs[ws._socket.remoteAddress] > 10) {
    if (attemptTimeouts[ws._socket.remoteAddress]) {
      clearTimeout(attemptTimeouts[ws._socket.remoteAddress]);
    }
    attemptTimeouts[ws._socket.remoteAddress] = setTimeout(() => {
      attemptIPs[ws._socket.remoteAddress] = 0;
    },1000 * 60 * 10);
    return true;
  }
  if (attemptIPs[ws._socket.remoteAddress] == 7) {
    error(ws,'You have 3 attempts left','signIn');
  }
  attemptIPs[ws._socket.remoteAddress]++;
  return false;
}

function getSixDigit() {
  return Math.floor(Math.random() * 9 * 1e5) + 1e5;
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function checkPassword(pass,acc) {
  if (crypto.createHash('sha512').update(pass + acc.salt).digest('hex') == acc.hash) {
    return true;
  }
  return false;
}

function isASCII(str) {
  if (cleanMessage(str) != str) {
    return false;
  }
  return true;
}

function cleanMessage(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x00-\x7F]/g,'');
}

function error(ws,text,type) {
  ws.send(JSON.stringify({method:'error',type:type,text:text}));
}

function genHexTriString(len) {
  let output = '';
  for (let i = 0; i < len; i++) {
    output += (Math.floor(Math.random() * 36)).toString(36);
  }
  return output;
}

function secStr(len) {
  if (!len) {
    len = 36;
  }
  return genHexTriString(len);
}
