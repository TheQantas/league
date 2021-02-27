const PORT = process.env.PORT || 3000;
const express = require('express');
//const red = express();
//red.get('*', function(req, res) {  
//  res.redirect('https://' + req.headers.host + req.url);
//})
//red.listen(8080);
const app = express();
app.set('views','./views');
app.set('view engine','ejs');
app.use(express.static('/var/www/html'));
const ejs = require('ejs');
const crypto = require('crypto');
const path = require('path');
const WebSocket = require('ws');
//const players = require('./players.js');
const players = {};
//const games = require('./games.js');
const games = {};
//const teams = require('./teams.js');
const teams = {};
//const draft = require('./draft.js');
const draft = {};
const users = {};
const clubs = require('./clubs.js');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const useragent = require('express-useragent');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');
const { DateTime } = require('luxon');
const mysql = require('mysql');
app.use(requestIp.mw());
app.use('/css', express.static(__dirname + '/css'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));
app.use('/logos', express.static(__dirname + '/logos'));
app.use('/audio', express.static(__dirname + '/audio'));
const cookieParser = require('cookie-parser');
var devices = {};

//block

// var url = require('url');
// var WebSocket = require('ws');
// var HttpsProxyAgent = require('https-proxy-agent');

// // HTTP/HTTPS proxy to connect to
// var proxy = process.env.http_proxy || 'http://3.131.119.119:3128';
// console.log('using proxy server %j', proxy);

// // WebSocket endpoint for the proxy to connect to
// var endpoint = process.argv[2] || 'ws://echo.websocket.org';
// var parsed = url.parse(endpoint);
// console.log('attempting to connect to WebSocket %j', endpoint);

// // create an instance of the `HttpsProxyAgent` class with the proxy server information
// var options = url.parse(proxy);

// var agent = new HttpsProxyAgent(options);

// // finally, initiate the WebSocket connection
// var socket = new WebSocket(endpoint, { agent: agent });

// socket.on('open', function () {
//   console.log('"open" event!');
//   socket.send('hello world');
// });

// socket.on('message', function (data, flags) {
//   console.log('"message" event! %j %j', data, flags);
//   socket.close();
// });

//v2

// const https = require('https');
// const fs = require('fs');

// const options = {
//   key: fs.readFileSync('fullchain1.pem'),
//   cert: fs.readFileSync('privkey1.pem')
// };

// var server = https.createServer(options, (req, res) => {
//   console.log(3000);
//   console.log(`Listening on ${PORT}`)
// }).listen(3000);

//time code

const tiempo = {};

tiempo.getFormatTime = (utc,tz) => {
  let zone = tiempo.getTime(utc,tz);
  if (zone.error) {
    return 'Time Error';
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
  return `${zone.weekdayShort} ${zone.day} ${zone.monthShort} ${h}:${m}${r}`;
}

tiempo.getFormatHour = (utc,tz) => {
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

//sql sim
const con = mysql.createConnection({
  //host: 'localhost',
  host: 'localhost',
  port: 3306,
  user: 'root',
  //password: '5$nm12@kbV9)',
  password: 'eHL0cThfzctM4d3ece#12kx0nLfvYkDU',
  database: 'league',
  multipleStatements: true
});

var busy = false;
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
        //console.log('resolved');
      })
    }).then(function(result) {
      busy = false;
      return result;
    });
  } else {
    console.log('query is busy');
    return new Promise(function(resolve, reject) {
      setTimeout(() => { resolve(); },100);
    }).then(() => {
      return request(sql);
    });
  }
}

teams.getTeamFromAbbr = function(abbr) {
  return request(`SELECT * FROM teams WHERE Abbr = ${con.escape(abbr)}`).then(list => {
    return list[0];
  });
}

teams.getTeamFromMascot = function(mascot) {
  return request(`SELECT * FROM teams WHERE mascot = ${con.escape(mascot)}`).then(list => {
    return list[0];
  });
}

teams.getAllTeams = function() {
  return request('SELECT * FROM teams');
}

teams.getAllTeamsByConf = function(conf) {
  var z = con.escape(conf.toUpperCase()).replace("'",'').replace("'",'');
  return request(`SELECT * FROM teams WHERE DIVISION LIKE '${z}%'`);
}

teams.getAccountFromToken = function(token) {
  return request('SELECT * FROM teams').then(list => {
    //let matches = [];
    for (let team of list) {
      let tokenSalt = JSON.parse(team.tokenSalt);
      let tokenHash = JSON.parse(team.tokenHash);
      for (let i = 0; i < tokenSalt.length; i++) {
        if (crypto.createHash('sha512').update(token + tokenSalt[i]).digest('hex') == tokenHash[i]) {
          //matches.push(team);
          return team;
          //break;
        }
      }
    }
//     if (matches.length == 1) {
//       return matches[0];
//     } else {
//       return;
//     }
  });
}

teams.deleteToken = function(token) {
  return teams.getAccountFromToken(token).then(acc => {
    if (!acc) {
      return false;
    }
    var allSalts = JSON.parse(acc.tokenSalt);
    var allHashes = JSON.parse(acc.tokenHash);
    var allDevices = JSON.parse(acc.devices);
    for (let i = 0; i < allHashes.length; i++) {
      if (crypto.createHash('sha512').update(token + allSalts[i]).digest('hex') == allHashes[i]) {
        allSalts[i] = undefined;
        allHashes[i] = undefined;
        allDevices[i] = undefined;
      } 
    }
    allSalts = clean(allSalts);
    allHashes = clean(allHashes);
    allDevices = clean(allDevices);
    return updateTeam(acc.abbr,['tokenSalt','tokenHash','devices'],[allSalts,allHashes,allDevices]).then(function() {
      return true;
    });
  });
}

teams.getOpponentsFromGame = function(game) {
  return request('SELECT * FROM teams').then(list => {
    let exp = {};
    for (let team of list) {
      if (team.abbr == game.away) {
        exp.away = team;
      } else if (team.abbr == game.home) {
        exp.home = team;
      }
    }
    return exp;
  });
}

games.getTeamSchedule = function(abbr) {
  return request(`SELECT * FROM games WHERE away = ${con.escape(abbr)} OR home = ${con.escape(abbr)}`);
}

games.getAllGames = function() {
  return request('SELECT * FROM games');
}

games.getWeek = function(num) {
  if (typeof num == 'string') {
    num = Number(num);
  }
  return request('SELECT * FROM games').then(list => {
    var exp = [];
    for (let game of list) {
      if (game.week == num) {
        exp.push(game);
      }
    }
    return exp;
  });
}

games.getNextGame = function(abbr) {
  return request(`SELECT * FROM games WHERE away = ${con.escape(abbr)} OR home = ${con.escape(abbr)}`).then(list => {
    for (let game of list) {
      if (game.status == 'upcoming') {
        return game;
      }
    }
  });
}

games.getOppo = function(abbr,game) {
  if (!game) {
    return 'XXX';
  }
  if (game.away == abbr) {
    return game.home;
  } else if (game.home == abbr) {
    return game.away;
  } else {
    return 'XXX';
  }
}

games.wonMatchup = function(teamA,teamB,list) {
  for (let game of list) {
    if (((game.away == teamA && game.home == teamB) || (game.away == teamB && game.home == teamA)) && game.week < 11) {
      return game;
    } else if (game.week > 10) {
      return undefined;
    }
  }
  return undefined;
}

games.wonGame = function(teamA,teamB,list) {
  var game = games.getMatchup(teamA,teamB,list);
  if (!game) {
    return undefined;
  }
  if (game.status.toLowerCase().indexOf('final') == -1) {
    return undefined;
  }
  if (game.away == teamA) {
    if (game.awayScore > game.homeScore) {
      return true;
    } else if (game.awayScore < game.homeScore) {
      return false;
    }
  } else if (game.home == teamA) {
    if (game.awayScore > game.homeScore) {
      return false;
    } else if (game.awayScore < game.homeScore) {
      return true;
    }
  }
  return undefined;
}

games.getTotalPointsScored = function(abbr,list) {
  var total = 0;
  for (let game of list) {
    if (game.week > 10) {
      break;
    } else if (game.away == abbr && game.status.toLowerCase().indexOf('final') != -1) {
      total += game.awayScore;
    } else if (game.home == abbr && game.status.toLowerCase().indexOf('final') != -1) {
      total += game.homeScore;
    }
  }
  return total;
}

games.getTotalPointDiff = function(abbr,list) {
  var total = 0;
  for (let game of list) {
    if (game.week > 10) {
      break;
    } else if (game.away == abbr && game.status.toLowerCase().indexOf('final') != -1) {
      total += (game.awayScore - game.homeScore);
    } else if (game.home == abbr && game.status.toLowerCase().indexOf('final') != -1) {
      total += (game.homeScore - game.awayScore);
    }
  }
  return total;
}

players.getAllPlayers = function() {
  return request('SELECT * FROM players');
}

players.getPlayerFromNum = function(num) {
  if (num == undefined || num == null) {
    throw 'No player id provided';
  }
  return request(`SELECT * FROM players WHERE id=${con.escape(num)}`).then(list => {
    return list[0];
  })
}

players.getPlayerFromNumAndList = function(num,list) {
  for (let player of list) {
    if (player.id == num) {
      return player;
    }
  }
}

players.getFreeAgents = function() {
  return request('SELECT * FROM players WHERE team = -1 OR team = -2').then(list => {
    let byPos = {qb:[],rb:[],wr:[],te:[],de:[],lb:[],cb:[],s:[],k:[],p:[]};
    for (let player of list) {
      byPos[player.pos.toLowerCase()].push(player);
    }
    return byPos;
  });
}

players.getPlayersByPos = function(pos) {
  return request(`SELECT * FROM players WHERE pos = ${con.escape(pos.toUpperCase())}`);
}

draft.getWholeDraft = function() {
  return request('SELECT * FROM draft').then(rounds => {
    var whole = [];
    for (let round of rounds) {
      for (let pick in round) {
        if (pick != 'round') {
          whole.push(round[pick]);
        }
      }
    }
    return whole;
  });
}

draft.getNextTwenty = function(whole,num) {
  var picks = whole.slice(num,num + 20);
  var exp = [];
  for (let i = 0; i < 20; i++) {
    let obj = {};
    if (picks[i] != undefined) {
      obj.n = picks[i];
    } else {
      obj.n = -1;
    }
    obj.p = num + i;
    exp.push(obj);
  }
  return exp;
}

draft.getPicksFromTeamIndex = function(whole,num) {
  var exp = [];
  for (let i = 0; i < whole.length; i++) {
    if (whole[i] == num) {
      exp.push(i + 1);
    }
  }
  return exp;
}

users.getAllUsers = () => {
  return request('SELECT * FROM users');
}

users.getAccountFromToken = (token) => {
  return request('SELECT * FROM users').then(list => {
    for (let team of list) {
      //console.log(team);
      //console.log(team.tokenSalt);
      let tokenSalt = JSON.parse(team.tokenSalt);
      let tokenHash = JSON.parse(team.tokenHash);
      for (let i = 0; i < tokenSalt.length; i++) {
        if (crypto.createHash('sha512').update(token + tokenSalt[i]).digest('hex') == tokenHash[i]) {
          return team;
        }
      }
    }
  });
}

users.deleteToken = (token) => {
  return users.getAccountFromToken(token).then(acc => {
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
    var sql = `UPDATE users SET tokenSalt='${JSON.stringify(allSalts)}',tokenHash='${JSON.stringify(allHashes)}' WHERE username=${con.escape(acc.username)}`;
    request(sql);
  });
}

users.getUserFromName = (name) => {
  return request(`SELECT * FROM users WHERE username = ${con.escape(name)}`).then(list => {
    return list[0];
  });
}

// function updateTeam(abbr,attrs,vals,back) {
//   return new Promise(function(resolve, reject) {
//     con.connect(function(err) {
//     var sql = 'UPDATE teams SET ';
//       for (let i = 0; i < attrs.length; i++) {
//         let val = vals[i];
//         let attr = attrs[i];
//         if (typeof val == 'number' || val == null) {
//           sql += `${attr} = ${val}`;
//         } else if (typeof val == 'boolean') {
//           sql += `${attr} = ${Number(val)}`;
//         } else if (typeof val == 'object') {
//           sql += `${attr} = '${JSON.stringify(val)}'`;
//         } else {
//           sql += `${attr} = '${val}'`;
//         }
//         if (i != attrs.length - 1) {
//           sql += ',';
//         }
//       }
//       sql += ` WHERE abbr = '${abbr}'`;
//       con.query(sql,function (error,result) {
//         if (error) throw error;
//         resolve(result);
//         console.log(result.affectedRows + " record(s) updated");
//       })
//     });
//   })
//   .then(function() {
//     return back;
//   })
// }

function updateTeam(abbr,attrs,vals,back) {
  return update('teams',`abbr = '${abbr}'`,attrs,vals,back);
}

function updatePlayer(id,attrs,vals,back) {
  return update('players',`id = '${id}'`,attrs,vals,back);
}

function update(d,w,attrs,vals,back) {
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
      sql += ` WHERE ${w}`;
      return request(sql);
      // con.query(sql,function (error,result) {
      //   if (error) throw error;
      //   resolve(result);
      //   console.log(result.affectedRows + " record(s) updated");
      // })
  //   });
  // })
  // .then(function() {
  //   return back;
  // })
}

function setPlayersSql(idList,attrs,vals,back) {
 //return new Promise(function(resolve, reject) {
    //con.connect(function(err) {
      var sql = '';
      //for (let id of idList) {
        //sql += 'UPDATE players SET ';
      for (let i = 0; i < attrs.length; i++) {
        sql += 'UPDATE players SET ';
        let val = vals[i];
        let attr = attrs[i];
        if (typeof val == 'number' || val == null) {
          sql += `${attr} = ${val}`;
        } else if (typeof val == 'boolean') {
          sql += `${attr} = ${Number(val)}`;
        } else if (typeof val == 'object') {
          sql += `${attr} = ${con.escape(JSON.stringify(val))}`;
        } else {
          sql += `${attr} = ${con.escape(val)}`;
        }
        sql += ` WHERE id=${con.escape(idList[i])};`;
      }
        //sql += ` WHERE id='${id}';`;
      //}
      return request(sql);
      // con.query(sql,function (error,result) {
      //   if (error) throw error;
      //   resolve(result);
      //   console.log(result.affectedRows + " record(s) updated");
      // })
  //   });
  // })
  // .then(function() {
  //   return back;
  // })
}

function setTeamsSql(abbrList,attrs,vals,back) {
  //return new Promise(function(resolve, reject) {
    //con.connect(function(err) {
      var sql = '';
      //for (let id of abbrList) {
        //sql += 'UPDATE teams SET ';
      for (let i = 0; i < attrs.length; i++) {
        sql += 'UPDATE teams SET ';
        let val = vals[i];
        let attr = attrs[i];
        if (typeof val == 'number' || val == null) {
          sql += `${attr} = ${val}`;
        } else if (typeof val == 'boolean') {
          sql += `${attr} = ${Number(val)}`;
        } else if (typeof val == 'object') {
          sql += `${attr} = ${con.escape(JSON.stringify(val))}`;
        } else {
          sql += `${attr} = ${con.escape(val)}`;
        }
        sql += ` WHERE abbr=${con.escape(abbrList[i])};`;
      }
        //sql += ` WHERE id='${id}';`;
      //}
      //console.log(sql);
      return request(sql);
      // con.query(sql,function (error,result) {
      //   if (error) throw error;
      //   resolve(result);
      //   console.log(result.affectedRows + " record(s) updated");
      // })
    // });
  // })
  // .then(function() {
  //   return back;
  // })
}

function sqlDraft(abbr,roster,id) {
  var sql = `UPDATE players SET team=${clubs.getTeamIndex(abbr)} WHERE id=${con.escape(id)};`;
  sql += `UPDATE teams SET roster=${con.escape(JSON.stringify(roster))} WHERE abbr=${con.escape(abbr)}`;
  //return new Promise(function(resolve, reject) {
    return request(sql);
    // con.query(sql,function (error,result) {
    //   if (error) throw error;
    //   resolve(result);
    //   //console.log('resolved');
    // })
  // }).then(function(result) {
  //   return result;
  // });
}

//draft code

var draftInt = false;
var draftStart = '2021-02-27T02:00:00Z';
var draftOpen = '2021-02-26T22:00:00Z';
var ddx = new Date(draftStart);
var draftFinished = true;                               //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
var draftLive = false;
var currentPick = 384;
var canPick = true;
var draftTimer = 30;
var draftResolved;
var draftTrades = [];
var stories = [{time:ddx.getTime(),text:'Draft is upcoming',stamp:`${dayFromNum(ddx.getDay())} ${ddx.getDate()} ${monthFromNum(ddx.getMonth())} ${getTime(draftStart)}`}];
var cfcLeague = [];
var nfcLeague = [];
var dnx = new Date();
var tradesDone = {};
// setTimeout(() => {
//   draftLive = true;
//   for (let a in draftCxns) {
//     for (let cxn of draftCxns[a]) {
//       cxn.send(JSON.stringify({method:'draftStarted'}));
//     }
//   }
//   startDraftTimer();
// //}, ddx.getTime() - dnx.getTime());
// }, 10000);

function startDraftTimer() {
  if (draftInt != false) {
    return;
  }
  draftInt = setInterval(() => {
    draftTimer--;
    if (draftTimer == 0) {
      stopDraftTimer();
      boardDraft();
    }
  }, 1000);
}

function stopDraftTimer() {
  clearInterval(draftInt);
  draftInt = false;
  canPick = false;
}

function boardDraft() {
  draftResolved = false;
  canPick = false;
  draft.getWholeDraft().then(picks => {
    var currAbbr = clubs.getTeamFromIndex(picks[currentPick]).abbr;
    var cxnFound = false;
    if (draftCxns[currAbbr]) {
      for (let id in draftCxns[currAbbr]) {
        draftCxns[currAbbr][id].send(JSON.stringify({method:'getBoard'}));
        cxnFound = true;
        break;
      }
    }
    if (cxnFound) {
      setTimeout(() => {
        computerDraft();
      },1000);
    } else {
      computerDraft();
    }
  });
}

function computerDraft() {
  if (draftResolved) {
    return;
  }
  //console.log('computer draft');
  draft.getWholeDraft().then(picks => {
    players.getFreeAgents().then(agents => {
      teams.getTeamFromAbbr(clubs.getTeamFromIndex(picks[currentPick]).abbr).then(team => {
        let canDraft = [];
        let positions = ['qb','rb','wr','te','de','lb','cb','s','k','p'];
        for (let i = 0; i < 10; i++) {
          if (!JSON.parse(team.roster)[i]) {
            canDraft = canDraft.concat(agents[positions[i]]);
          }
        }
        //console.log(canDraft);
        let randomPlayer = canDraft[Math.floor(Math.random() * canDraft.length)];
        let roster = JSON.parse(team.roster);
        roster[Number(randomPlayer.id.substring(0,1))] = randomPlayer.id;
        //console.log(roster);
        draftPlayer(team,roster,randomPlayer,picks,true);
      });
    });
  });
}

function advPick() {
  currentPick++;
  if (currentPick == 400) {
    for (let a in draftCxns) {
      for (let cxn of draftCxns[a]) {
        cxn.send({method:'draftFinished'});
      }
    }
    draftFinished = true;
    return;
  }
  draftTimer = getDraftTimer(currentPick);
  startDraftTimer();
  canPick = true;
}

//game code

const match = {};
var fieldGame = {finished:true};
var firstGame = '2021-02-27T16:30:00Z';
function init() {
  if (fieldGame.finished == false) {
    return;
  }
  console.log('game starting');
  match.sendUpdate({method:'newGame'});
  games.getAllGames().then(sch => {
    let game;
    let unix = Infinity;
    for (let gamex of sch) {
      let d = new Date(gamex.schedule);
      console.log(gamex.schedule);
      if (d.getTime() < unix && gamex.status == 'upcoming') {
        game = gamex;
        unix = d.getTime();
      }
    }
    players.getAllPlayers().then(list => {
      teams.getOpponentsFromGame(game).then(oppos => {
        fieldGame = new Game(list,oppos);
        for (let bet of weekWinBets) {
          if (bet.away == fieldGame.away && bet.home == fieldGame.home) {
            bet.started = true;
            break;
          }
        }
        for (let bet of weekOverBets) {
          if (bet.away == fieldGame.away && bet.home == fieldGame.home) {
            bet.started = true;
            break;
          }
        }
        match.newDrive();
        let l = {away:fieldGame.away,home:fieldGame.home,awayPlayers:fieldGame.awayRoster,homePlayers:fieldGame.homeRoster};
        l.awayStats = {off:fieldGame.awayOffStats,def:fieldGame.awayDefStats};
        l.homeStats = {off:fieldGame.homeOffStats,def:fieldGame.homeDefStats};
        //console.log(l);
        request(`UPDATE games SET status='ongoing' WHERE away='${game.away}' AND home='${game.home}' AND week=${getCurrentWeek()}`);
      });
    });
  });
}
var dgx = new Date(firstGame);
function startFirstGame() {
  let delay = dgx.getTime() - dnx.getTime();
  if (delay < 0.2 * 60 * 1000) {
    delay = 0.2 * 60 * 1000;
  }
  console.log(delay);
  setTimeout(() => {
    init();
  },delay);
}
startFirstGame();
// setTimeout(() => {
//   init();
// },200);
//init();

let Game = class {
  constructor(list,oppos) {
    let d = new Date();
    this.prevPlay = d.getTime();
    this.away = oppos.away.abbr;
    this.home = oppos.home.abbr;
    this.awayTeam = oppos.away;
    this.homeTeam = oppos.home;
    let awayRoster = getFullRoster(list,JSON.parse(oppos.away.roster));
    let homeRoster = getFullRoster(list,JSON.parse(oppos.home.roster));
    this.awayRoster = awayRoster;
    this.homeRoster = homeRoster;
    this.awayScore = 0;
    this.homeScore = 0;
    this.awaySbq = [0,0,0,0];
    this.homeSbq = [0,0,0,0];
    this.playGoing = false;
    this.updates = [];
    for (let pos in awayRoster) {
      if (pos.indexOf('flx') != -1) {
        continue;
      }
      let player = awayRoster[pos];
      //console.log(player);
      player.statsArch = JSON.parse(player.stats);
      player.stats = {};
      for (let attr in player.statsArch) {
        player.stats[attr] = 0;
      }
      let stats = [JSON.parse(player.statA),JSON.parse(player.statB),JSON.parse(player.statC)];
      for (let stat of stats) {
        if (stat.name != 'speed' && stat.name != 'dist' && stat.name != 'yac') {
          player[stat.name] = normalRandom(stat.m,stat.s);
        } else {
          player[`${stat.name}Distr`] = {m:stat.m,s:stat.s};
        }
      }
    }
    for (let pos in homeRoster) {
      if (pos.indexOf('flx') != -1) {
        continue;
      }
      let player = homeRoster[pos];
      console.log(player,pos);
      player.statsArch = JSON.parse(player.stats);
      player.stats = {};
      for (let attr in player.statsArch) {
        player.stats[attr] = 0;
      }
      let stats = [JSON.parse(player.statA),JSON.parse(player.statB),JSON.parse(player.statC)];
      for (let stat of stats) {
        if (stat.name != 'speed' && stat.name != 'dist' && stat.name != 'yac') {
          player[stat.name] = normalRandom(stat.m,stat.s);
        } else {
          player[`${stat.name}Distr`] = {m:stat.m,s:stat.s};
        }
      }
    }
    console.log(homeRoster):
    this.awayPlayers = awayRoster;
    this.homePlayers = homeRoster;
    this.awayPlayers.de.tackle = 0.7;
    this.homePlayers.de.tackle = 0.7;
    this.awayPlayers.lb.tackle = 0.7;
    this.homePlayers.lb.tackle = 0.7;
    this.awayPlayers.cb.tackle = 0.8;
    this.homePlayers.cb.tackle = 0.8;
    this.awayPlayers.s.tackle = 0.97;
    this.homePlayers.s.tackle = 0.97;
    this.q = 1;
    this.t = 900;
    this.int = false;
    this.off = 'home';
    this.def = 'away';
    this.down = 1;
    this.toGo = 10;
    this.los = 25;
    this.awayOffStats = JSON.parse(oppos.away.offStats);
    this.awayDefStats = JSON.parse(oppos.away.defStats);
    this.homeOffStats = JSON.parse(oppos.home.offStats);
    this.homeDefStats = JSON.parse(oppos.home.defStats);
    let statList = [this.awayOffStats,this.awayDefStats,this.homeOffStats,this.homeDefStats];
    for (let stat of statList) {
      for (let attr in stat) {
        stat[attr] = 0;
      }
    }
    this.awayOffStatsArch = JSON.parse(oppos.away.offStats);
    this.awayDefStatsArch = JSON.parse(oppos.away.defStats);
    this.homeOffStatsArch = JSON.parse(oppos.home.offStats);
    this.homeDefStatsArch = JSON.parse(oppos.home.defStats);
    let plays = ['deRushEarly','deRushLate','lbRushEarly','lbRushLate','passEarly','passLate','wrEarly','wrLate'];
    this.awayPlays = {};
    for (let play of plays) {
      this.awayPlays[play] = oppos.away[play];
    }
    this.homePlays = {};
    for (let play of plays) {
      this.homePlays[play] = oppos.away[play];
    }
    this.finished = false;
  }
};
match.startClock = () => {
  if (fieldGame.q > 4) {
    return;
  }
  match.sendUpdate({method:'startClock',q:fieldGame.q,t:fieldGame.t});
  if (fieldGame.int == false) {
    fieldGame.int = setInterval(() => {
      fieldGame.t--;
      if (fieldGame.t == 0) {
        console.log('period over');
        match.stopClock();
      }
    },1000);
  }
}
match.stopClock = () => {
  clearInterval(fieldGame.int);
  fieldGame.int = false;
  match.sendUpdate({method:'stopClock'});
  console.log('clock stopped @',fieldGame.t,fieldGame.playGoing);
  if (!fieldGame.playGoing && fieldGame.t <= 0) {
    console.log('END OF PERIOD',fieldGame.q);
    match.advPeriod();
  }
}
match.newDrive = (newLos) => {
  match.updateGame();
  if (fieldGame.t <= 0 && fieldGame.q < 5) {
    match.advPeriod();
    return;
  }
  if (fieldGame.awayPoss && fieldGame.homePoss) {
    match.advPeriod();
    return;
  }
  if (fieldGame.off == 'away') {
    fieldGame.off = 'home';
    fieldGame.def = 'away';
    if (fieldGame.q > 4) {
      fieldGame.homePoss = true;
    }
  } else {
    fieldGame.def = 'home';
    fieldGame.off = 'away';
    if (fieldGame.q > 4) {
      fieldGame.awayPoss = true;
    }
  }
  match.sendUpdate({method:'updatePoss',poss:fieldGame.off});
  console.log('new off',fieldGame.off);
  if (!newLos || fieldGame.q > 4) {
    newLos = 25;
  }
  fieldGame.down = 1;
  fieldGame.toGo = 10;
  fieldGame.los = Math.round(newLos);
  fieldGame[`${fieldGame.off}OffStats`].drives++;
  fieldGame[`${fieldGame.off}Players`].rb.tire = 0;
  fieldGame[`${fieldGame.off}Players`].wr.tire = 0;
  fieldGame[`${fieldGame.off}Players`].te.tire = 0;
  match.startClock();
  match.play();
}
match.play = () => {
  if (fieldGame.t <= 0 && fieldGame.q < 5) {
    return;
  }
  console.log(`play @ ${fieldGame.t} in q${fieldGame.q}`);
  match.sendUpdate({method:'updateDown',down:fieldGame.down,toGo:fieldGame.toGo,los:fieldGame.los,poss:fieldGame.off});
  fieldGame[`${fieldGame.off}OffStats`].plays++;
  fieldGame[`${fieldGame.def}DefStats`].playsDef++;
  fieldGame[`${fieldGame.off}Players`].qb.x = fieldGame.los - 3;
  fieldGame[`${fieldGame.off}Players`].qb.y = 5;
  fieldGame[`${fieldGame.off}Players`].rb.x = fieldGame.los - 3;
  fieldGame[`${fieldGame.off}Players`].rb.y = 7;
  fieldGame[`${fieldGame.off}Players`].wr.x = fieldGame.los;
  fieldGame[`${fieldGame.off}Players`].wr.y = 3;
  fieldGame[`${fieldGame.off}Players`].te.x = fieldGame.los;
  fieldGame[`${fieldGame.off}Players`].te.y = 9;
  fieldGame[`${fieldGame.def}Players`].de.x = fieldGame.los + 1;
  fieldGame[`${fieldGame.def}Players`].de.y = 5;
  fieldGame[`${fieldGame.def}Players`].lb.x = fieldGame.los + 3;
  fieldGame[`${fieldGame.def}Players`].lb.y = 7;
  fieldGame[`${fieldGame.def}Players`].cb.x = fieldGame.los + 5;
  fieldGame[`${fieldGame.def}Players`].cb.y = 9;
  fieldGame[`${fieldGame.def}Players`].s.x = fieldGame.los + 7;
  fieldGame[`${fieldGame.def}Players`].s.y = 3;
  fieldGame.playGoing = true;
  if (fieldGame.down < 3) {
    var el = 'Early';
  } else {
    var el = 'Late';
  }
  console.log(fieldGame[`${fieldGame.off}Plays`][`pass${el}`]);
  if ((fieldGame.q == 2 || fieldGame.q == 4) && fieldGame.t < 5) {
    console.log('in final 5 seconds of half');
    var diff = fieldGame[`${fieldGame.off}Score`] - fieldGame[`${fieldGame.def}Score`];
    if (fieldGame.q == 2) {
      if (fieldGame.los >= 55) {
        match.fieldGoal();
      } else { //do nothing otherwise
        fieldGame.playGoing = false;
      }
    } else { //q == 4
      if (diff >= -3 && fieldGame.los >= 55) {
        match.fieldGoal();
      } else if (diff < 0 && fieldGame.los < 85) { //need td, too far or too far for fg
        match.hail();
      } else if (diff < 0) { //need td, w/in 15
        match.pass();
      } else { //do nothing otherwise
        fieldGame.playGoing = false;
      }
    }
    return;
  }
  if (Math.random() < fieldGame[`${fieldGame.off}Plays`][`pass${el}`]) {
    match.pass();
  } else {
    match.rush();
  }
}
match.pass = () => {
  console.log('pass');
  let passDelay = Math.floor(Math.random() * 1500) + 1500;
  if (fieldGame.down < 3) {
    var el = 'Early';
  } else {
    var el = 'Late';
  }
  if (Math.random() < fieldGame[`${fieldGame.off}Plays`][`wr${el}`]) {
    var rec = fieldGame[`${fieldGame.off}Players`].wr;
    var def = fieldGame[`${fieldGame.def}Players`].s;
    var isWr = true;
  } else {
    var rec = fieldGame[`${fieldGame.off}Players`].te;
    var def = fieldGame[`${fieldGame.def}Players`].cb;
    var isWr = false;
  }
  var speed = normalRandom(rec.speedDistr.m - rec.tire / 5,rec.speedDistr.s);
  //console.log('speed',speed);
  var dist = speed * (passDelay / 1000);
  rec.x += dist;
  def.x = rec.x;
  var qb = fieldGame[`${fieldGame.off}Players`].qb;
  if (dist > 10) {
    var acc = qb.longAcc;
    if (isWr) {
      var cat = rec.longRecep - rec.tire / 50;
    } else {
      var cat = rec.recep - rec.tire / 50;
    }
  } else {
    var acc = qb.acc;
    var cat = rec.recep - rec.tire / 50;
  }
  rec.tire++;
  rec.tire = (rec.tire > 10)?10:rec.tire;
  if (Math.random() < fieldGame[`${fieldGame.def}Plays`][`deRush${el}`]) {
    var rusher = fieldGame[`${fieldGame.def}Players`].de;
    fieldGame[`${fieldGame.def}Players`].de.stats.blitz++;
  } else if (Math.random() < fieldGame[`${fieldGame.def}Plays`][`lbRush${el}`]) {
    var rusher = fieldGame[`${fieldGame.def}Players`].lb;
    fieldGame[`${fieldGame.def}Players`].lb.stats.blitz++;
  }
  if (rusher) {
    //console.log('rusher',rusher.pressPerc);
    if (Math.random() < rusher.pressPerc) {
      console.log('qb pressured');
      acc -= qb.press;
    }
  }
  //console.log(qb);
  qb.stats.att++;
  rec.stats.targets++;
  def.stats.targets++;
  //console.log(acc,cat,def.cover);
  setTimeout(() => {
    if (rusher) {
      if (Math.random() < rusher.sack) {
        console.log('qb was sacked');
        let u = {method:'newEvent',team:fieldGame.def,q:fieldGame.q,t:fieldGame.t};
        u.text = `${rusher.fName} ${rusher.lName} SACKED ${qb.fName} ${qb.lName} for a 5-yd loss`;
        fieldGame.updates.push(u);
        match.sendUpdate(u);
        rusher.stats.sack++;
        fieldGame[`${fieldGame.def}DefStats`].sacks++;
        qb.x -= 2;
        match.tackled(qb,undefined,undefined);
        return;
      }
    }
    if (Math.random() < acc) { //qb was accurate
      if (Math.random() < cat * def.cover) { //ball was caught
        qb.stats.comp++;
        rec.stats.receps++;
        console.log('caught',Math.round(rec.x));
        if (Math.random() < def.tackle) { //receiver was tackled
          //console.log('tackled');
          match.tackled(rec,def,true,[qb,rec]);
        } else { //receiver was not tackled
          def.stats.tAtt++;
          if (isWr) { //wr not tackled, to the house
            console.log('wr to the house');
            rec.x = 101;
            match.tackled(rec,undefined,true,[qb,rec]);
          } else {
            let safety = fieldGame[`${fieldGame.def}Players`].s;
            if (Math.random() < safety.tackle) { //safety tackled the rec
              //console.log('tackled by s');
              let sprint = normalRandom(safety.speedDistr.m,safety.speedDistr.s);
              let time = match.getTime(rec,safety,speed,sprint);
              console.log('time',time);
              rec.x += speed * time;
              match.tackled(rec,safety,true,[qb,rec]);
            } else { //te to the house
              console.log('te to the house');
              safety.stats.tAtt++;
              rec.x = 101;
              match.tackled(rec,undefined,true,[qb,rec]);
            }
          }
        }
      } else { //incomplete
        console.log('incomplete acc');
        qb.x += 3;
        match.tackled(qb,undefined,true);
      }
    } else { //qb was inaccurate
      if (Math.random() < def.int) { //ball was intercepted
        console.log('intercepted');
        def.stats.int++;
        qb.stats.int++;
        let u = {method:'newEvent',team:fieldGame.def,q:fieldGame.q,t:fieldGame.t};
        u.text = `${def.fName} ${def.lName} INTERCEPTED a pass`;
        fieldGame.updates.push(u);
        match.sendUpdate(u);
        fieldGame[`${fieldGame.def}DefStats`].int++;
        match.newDrive(100 - def.x);
      } else { //incomplete
        console.log('incomplete !acc');
        qb.x += 3;
        match.tackled(qb,undefined,true);
      }
    }
  }, passDelay);
}
match.rush = () => {
  console.log('rush');
  if (fieldGame.down < 3) {
    var el = 'Early';
  } else {
    var el = 'Late';
  }
  var rb = fieldGame[`${fieldGame.off}Players`].rb;
  rb.stats.att++;
  var rbSpeed = normalRandom(rb.speedDistr.m - rb.tire * 0.1,rb.speedDistr.s);
  if (Math.random() < fieldGame[`${fieldGame.def}Plays`][`deRush${el}`]) {
    var deRush = true;
    fieldGame[`${fieldGame.def}Players`].de.stats.blitz++;
  } else if (Math.random() < fieldGame[`${fieldGame.def}Plays`][`lbRush${el}`]) {
    var lbRush = true;
    fieldGame[`${fieldGame.def}Players`].lb.stats.blitz++;
  }
  var tacklers = [];
  if (!deRush) {
    tacklers.push(fieldGame[`${fieldGame.def}Players`].de);
    fieldGame[`${fieldGame.def}Players`].de.line = true;
  }
  if (!lbRush) {
    tacklers.push(fieldGame[`${fieldGame.def}Players`].lb);
    fieldGame[`${fieldGame.def}Players`].lb.line = true;
  }
  tacklers.push(fieldGame[`${fieldGame.def}Players`].cb);
  tacklers.push(fieldGame[`${fieldGame.def}Players`].s);
  var rbTackled = false;
  var tack;
  var delay;
  for (let tackler of tacklers) {
    defSpeed = normalRandom(tackler.speedDistr.tackler.speedDistr.s);
    if (!match.canCatchRB(rb,tackler,rbSpeed,defSpeed)) {
      continue;
    }
    let time = match.getTime(rb,tackler,rbSpeed,defSpeed);
    //console.log(tackler.pos,'t',time);
    if (time < 0) {
      continue;
    }
    var chance = tackler.tackle * (rb.elus + rb.tire * 0.01);
    if (tackler.line) {
      chance = chance * fieldGame[`${fieldGame.off}Players`].te.block;
    }
    //console.log(tackler.pos,chance);
    if (Math.random() < chance) {
      rbTackled = true;
      tack = tackler;
      rb.x += rbSpeed * time;
      delay = time * 1000;
      break;
    }
  }
  if (!rbTackled) {
    console.log('rb escaped');
    rb.x += normalRandom(rb.yacDistr.m - rb.tire / 2,rb.yacDistr.s);
  }
  rb.tire++;
  rb.tire = (rb.tire>10)?10:rb.tire;
  if (!delay) {
    delay = 5000;
  }
  //console.log('rb.x',rb.x,'delay',delay);
  setTimeout(() => {
    match.tackled(rb,tack,false,[rb]);
  },delay);
}
match.hail = () => {
  let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
  u.text = `${fieldGame[`${fieldGame.off}Team`].mascot} are going for a HAIL MARY`;
  fieldGame.updates.push(u);
  match.sendUpdate(u);
  var qb = fieldGame[`${fieldGame.off}Players`].qb;
  var wr = fieldGame[`${fieldGame.off}Players`].wr;
  var s = fieldGame[`${fieldGame.def}Players`].s;
  var prob = 0.004 * Math.pow(100 - fieldGame.los,2) + 0.1;
  var mult = (prob / 100) / (0.75 * 0.75 * 0.97);
  console.log('mult',mult,'prob',prob,'catchp',qb.longAcc * wr.longRecep * mult);
  var speed = normalRandom(wr.speedDistr.m,wr.speedDistr.s);
  var delay = 5000;
  var tackler;
  if (Math.random() < qb.longAcc * wr.longRecep * mult) {
    //console.log('hail mary caught');
    if (Math.random() < s.tackle) {
      console.log('hail caught but tackled');
      wr.x += (delay / 1000) * speed;
    } else {
      console.log('hail caught but not tackled');
      s.stats.tAtt++;
      tackler = s;
      wr.x = 101;
    }
  } else {
    console.log('hail not caught');
  }
  setTimeout(() => {
    match.tackled(wr,tackler,true,[qb,wr]);
  },delay);
}
match.tackled = (tackled,tackler,isPass,credit) => {
  if (!credit) {
    credit = [];
  }
  fieldGame.playGoing = false;
  //console.log(tackled.x);
  if (tackler) {
    tackler.stats.tAtt++;
    tackler.stats.tackles++;
  }
  if (fieldGame.los < 100) {
    var progress = Math.round(tackled.x) - fieldGame.los;
  } else {
    var progress = 100 - fieldGame.los;
  }
  for (let player of credit) {
    player.stats.yds += progress;
  }
  fieldGame[`${fieldGame.off}OffStats`].yds += progress;
  fieldGame[`${fieldGame.def}DefStats`].ydsGiven += progress;
  if (isPass == true) {
    fieldGame[`${fieldGame.off}OffStats`].passYds += progress;
  } else if (isPass == false) {
    fieldGame[`${fieldGame.off}OffStats`].rushYds += progress;
  }
  //console.log('progress',progress,'x',tackled.x,'poss',fieldGame.off);
  if (tackled.x <= 0) {
    let u = {method:'newEvent',team:fieldGame.def,q:fieldGame.q,t:fieldGame.t};
    u.text = `${tackler.fName} ${tackler.lName} tackled ${tackled.fName} ${tackled.lName} for a SAFETY`;
    fieldGame.updates.push(u);
    match.sendUpdate(u);
    match.updateScore(4);
    return;
  } else if (tackled.x >= 100) {
    for (let player of credit) {
      player.stats.td++;
    }
    let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
    if (isPass) {
      if (100 - fieldGame.los == 0) {
        u.text = `${tackled.fName} ${tackled.lName} caught a 1-yd pass for a TOUCHDOWN`;
      } else {
        u.text = `${tackled.fName} ${tackled.lName} caught a ${100 - fieldGame.los}-yd pass for a TOUCHDOWN`;
      }
    } else {
      if (100 - fieldGame.los <= 1) {
        u.text = `${tackled.fName} ${tackled.lName} ran for 1 yd for a TOUCHDOWN`;
      } else {
        u.text = `${tackled.fName} ${tackled.lName} ran for ${100 - fieldGame.los} yds for a TOUCHDOWN`;
      }
    }
    fieldGame.updates.push(u);
    match.sendUpdate(u);
    fieldGame[`${fieldGame.off}OffStats`].td++;
    fieldGame[`${fieldGame.def}DefStats`].tdGiven++;
    match.updateScore(6);
    return;
  }
  var leftToGo = fieldGame.toGo - progress;
  if (leftToGo <= 0) {
    fieldGame.down = 1;
    fieldGame.toGo = 10;
    fieldGame[`${fieldGame.off}OffStats`].first++;
  } else {
    fieldGame.down++;
    fieldGame.toGo -= progress;
  }
  fieldGame.los += progress;
  console.log(fieldGame.down,fieldGame.toGo);
  match.sendStatUpdate();
  match.sendUpdate({method:'updateDown',down:fieldGame.down,toGo:fieldGame.toGo,los:fieldGame.los,poss:fieldGame.off});
  if (fieldGame.down == 4) {
    console.log('go for 4th',match.onFourth());
    if (!match.onFourth()) { //not going for it
      match.stopClock();
      if (fieldGame.los >= 55) {
        setTimeout(() => {
          match.fieldGoal();
        },3000);
      } else {
        setTimeout(() => {
          match.punt();
        },3000);
      }
      return;
    } else { //going for it
      let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
      u.text = `${fieldGame[`${fieldGame.off}Team`].mascot} are going for it on FOURTH DOWN`;
      fieldGame.updates.push(u);
      match.sendUpdate(u);
    }
  } else if (fieldGame.down > 4) {
    console.log('TURNOVER ON DOWNS');
    let u = {method:'newEvent',team:fieldGame.def,q:fieldGame.q,t:fieldGame.t};
    u.text = `${fieldGame[`${fieldGame.def}Team`].mascot} got a TURNOVER ON DOWNS`;
    fieldGame.updates.push(u);
    match.sendUpdate(u);
    match.newDrive(100 - fieldGame.los);
    return;
  }
  if (fieldGame.t <= 0 && fieldGame.q < 5) {
    console.log('END OF PERIOD',fieldGame.q);
    match.advPeriod();
    return;
  }
  //var playDelay = 3000;
  var playDelay = Math.round(Math.random() * 10000) + 25000;
  if ((fieldGame.q == 2 || fieldGame.q == 4) && fieldGame.t < 120) { //two-minute drill
    var diff = fieldGame[`${fieldGame.off}Score`] - fieldGame[`${fieldGame.def}Score`];
    if (fieldGame.q == 2 || (fieldGame.q == 4 && diff <= 0)) { //end of q2 or end of q4 & team is tied or behind
      if (fieldGame.t < 10 && fieldGame.t > 2) {
        playDelay = (fieldGame.t - 2) * 1000;
      } else if (fieldGame.t < 10 && fieldGame.t > 0) {
        playDelay = 0;
      } else { //more than ten seconds left
        playDelay = 10000;
      }
    }
  } else if (fieldGame.q > 4) {
    playDelay = 10000;
  }
  if ((playDelay / 1000) < fieldGame.t || fieldGame.q > 4) {
    setTimeout(() => {
      match.play();
    },playDelay);
  }
}
match.getDistance = (a,b) => {
  return Math.sqrt(Math.pow(a.x - b.x,2) + Math.pow(a.y - b.y,2));
}
match.getTime = (off,def,speed,sprint) => {
  var dx = Math.abs(off.x - def.x);
  var dy = Math.abs(off.y - def.y);
  if (speed <= 0 || sprint <= 0) {
    return -1;
  } else if (speed == sprint) {
    return (Math.pow(dx,2) + Math.pow(dy,2)) / (2 * speed * dx);
  }
  //var numer = Math.pow(def.y-off.y,2);
  //var denom = Math.pow(sprint,2) - Math.pow(speed,2);
  //if (denom < 0) {
  //  return -1;
  //}
  //return Math.sqrt(numer / denom);
  var a = Math.pow(speed,2) - Math.pow(sprint,2);
  var b = -2 * speed * dx;
  var c = Math.pow(dx,2) + Math.pow(dy,2);
  var d = Math.pow(b,2) - 4 * a * c;
  if (d < 0) {
    return -1;
  }
  var n = -b + Math.sqrt(Math.pow(b,2) - 4 * a * c);
  var t = -b - Math.sqrt(Math.pow(b,2) - 4 * a * c);
  var l = 2 * a;
  if (n/l < t/l && n/l > 0) {
    return n/l;
  } else {
    return t/l;
  }
}
match.canCatchRB = (rb,def,rbSpeed,defSpeed) => {
  var simRB = {x:rb.x,y:rb.y};
  var simDef = {x:def.x,y:def.y};
  var initDist = match.getDistance(simRB,simDef);
  simRB.x += rbSpeed;
  var v = match.getVector(simDef,simRB,defSpeed);
  //console.log(v);
  simDef.x += v.x;
  simDef.y += v.y;
  var finalDist = match.getDistance(simRB,simDef);
  //console.log(initDist,finalDist);
  if (finalDist < initDist) {
    return true;
  } else {
    return false;
  }
}
match.getVector = (move,stat,dist) => {
  var dx = Math.abs(move.x - stat.x);
  var dy = Math.abs(move.y - stat.y);
  if (dx < 1) {
    if (move.y > stat.y) {
      return {x:0,y:-dist};
    }
    return {x:0,y:dist};
  }
  if (dy < 1) {
    if (move.x > stat.x) {
      return {y:0,x:-dist};
    }
    return {y:0,x:dist};
  }
  var a = dy / dx;
  var rad = Math.pow(dist,2) / (1 + Math.pow(a,2));
  var v = {x:0,y:0};
  v.x = Math.sqrt(rad);
  v.y = v.x * a;
  if (move.x > stat.x) {
    v.x = -v.x;
  }
  if (move.y > stat.y) {
    v.y = -v.y;
  }
  return v;
}
match.updateScore = (val) => {
  match.stopClock();
  if (val == 4) { //safety
    fieldGame[`${fieldGame.def}Score`] += 2;
    fieldGame[`${fieldGame.def}Sbq`][fieldGame.q - 1] += 2;
    match.sendUpdate({method:'updateScore',q:fieldGame.q,awayScore:fieldGame.awayScore,homeScore:fieldGame.homeScore,awaySbq:fieldGame.awaySbq,homeSbq:fieldGame.homeSbq});
    match.newDrive(50);
  } else {
    fieldGame[`${fieldGame.off}OffStats`].pts += val;
    fieldGame[`${fieldGame.def}DefStats`].ptsGiven += val;
    fieldGame[`${fieldGame.off}Score`] += val;
    fieldGame[`${fieldGame.off}Sbq`][fieldGame.q - 1] += val;
    match.sendUpdate({method:'updateScore',q:fieldGame.q,awayScore:fieldGame.awayScore,homeScore:fieldGame.homeScore,awaySbq:fieldGame.awaySbq,homeSbq:fieldGame.homeSbq});
    if (val != 6) {
      setTimeout(() => {
        match.newDrive();
      },3000);
    } else {
      console.log('TOUCHDOWN');
      match.conversion();
    }
  }
}
match.updateGame = () => {
  console.log('updating game');
  var sql = `UPDATE games SET awayScore=${fieldGame.awayScore},homeScore=${fieldGame.homeScore}`;
  sql += `,awaySbq='${JSON.stringify(fieldGame.awaySbq)}',homeSbq='${JSON.stringify(fieldGame.homeSbq)}'`;
  sql += ` WHERE away='${fieldGame.away}' AND home='${fieldGame.home}' AND week=${getCurrentWeek()};`;
  //console.log(fieldGame.awayOffStats);
  //console.log(fieldGame.awayOffStatsArch);
  for (let attr in fieldGame.awayOffStats) {
    fieldGame.awayOffStatsArch[attr][getCurrentWeek()] = fieldGame.awayOffStats[attr];
  }
  for (let attr in fieldGame.homeOffStats) {
    fieldGame.homeOffStatsArch[attr][getCurrentWeek()] = fieldGame.homeOffStats[attr];
  }
  for (let attr in fieldGame.awayDefStats) {
    fieldGame.awayDefStatsArch[attr][getCurrentWeek()] = fieldGame.awayDefStats[attr];
  }
  for (let attr in fieldGame.homeDefStats) {
    fieldGame.homeDefStatsArch[attr][getCurrentWeek()] = fieldGame.homeDefStats[attr];
  }
  sql += `UPDATE teams SET offStats='${JSON.stringify(fieldGame.awayOffStatsArch)}',defStats='${JSON.stringify(fieldGame.awayDefStatsArch)}' WHERE abbr='${fieldGame.away}';`
  sql += `UPDATE teams SET offStats='${JSON.stringify(fieldGame.homeOffStatsArch)}',defStats='${JSON.stringify(fieldGame.homeDefStatsArch)}' WHERE abbr='${fieldGame.home}';`
  //console.log(fieldGame.awayPlayers);
  let awayPlayerStats = {};
  for (let pos in fieldGame.awayPlayers) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    awayPlayerStats[pos] = fieldGame.awayPlayers[pos].statsArch;
    for (let attr in awayPlayerStats[pos]) {
      awayPlayerStats[pos][attr][getCurrentWeek()] = fieldGame.awayPlayers[pos].stats[attr];
    }
    sql += `UPDATE players SET stats='${JSON.stringify(awayPlayerStats[pos])}' WHERE id='${fieldGame.awayPlayers[pos].id}';`
  }
  let homePlayerStats = {};
  for (let pos in fieldGame.homePlayers) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    homePlayerStats[pos] = fieldGame.homePlayers[pos].statsArch;
    for (let attr in homePlayerStats[pos]) {
      homePlayerStats[pos][attr][getCurrentWeek()] = fieldGame.homePlayers[pos].stats[attr];
    }
    sql += `UPDATE players SET stats='${JSON.stringify(homePlayerStats[pos])}' WHERE id='${fieldGame.homePlayers[pos].id}';`
  }
  return request(sql);
}
match.conversion = () => {
  console.log('conversion');
  var diff = fieldGame[`${fieldGame.off}Score`] - fieldGame[`${fieldGame.def}Score`];
  var diffs = [-15,-13,-11,-10,-8,-5,-2,1,5,12];
  if (fieldGame.q == 4 && fieldGame.t < 601 && diffs.includes(diff)) {
    match.twoPoint();
  } else {
    match.pat();
  }
}
match.pat = () => {
  var k = fieldGame[`${fieldGame.off}Players`].k;
  let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
  k.stats.patAtt++;
  if (Math.random() < k.pat) {
    console.log('pat GOOD');
    u.text = `${k.fName} ${k.lName}'s extra point is GOOD`;
    k.stats.pat++;
    k.stats.pts++;
    match.updateScore(1);
  } else {
    console.log('pat NO GOOD');
    u.text = `${k.fName} ${k.lName}'s extra point is NO GOOD`;
    match.newDrive();
  }
  fieldGame.updates.push(u);
  match.sendUpdate(u);
}
match.twoPoint = () => {
  let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
  if (Math.random() < 0.5) {
    u.text = `${fieldGame[`${fieldGame.off}Team`].mascot} two-point conversion is GOOD`;
    console.log('two point');
    match.updateScore(2);
  } else {
    u.text = `${fieldGame[`${fieldGame.off}Team`].mascot} two-point conversion is NO GOOD`;
    console.log('failed two point');
    match.newDrive();
  }
  fieldGame.updates.push(u);
  match.sendUpdate(u);
}
match.onFourth = () => {
  if (fieldGame.q < 4 || (fieldGame.q == 4 && fieldGame.t > 600)) {
    return false;
  }
  var diff = fieldGame[`${fieldGame.off}Score`] - fieldGame[`${fieldGame.def}Score`];
  if (fieldGame.q == 4) {
    if (fieldGame.los >= 97) { //inside oppo 3
      return true;
    } else if (fieldGame.los >= 55 && diff >= -3) { //in field goal range & can tie/win w/ field goal
      return false;
    } else if (fieldGame.los < 55 && diff >= 0) { //out of field goal range & ahead
      return false;
    } else if (fieldGame.toGo > 2 && diff >=0) { //ahead w/ over 2 yds to go
      return false;
    } else if (diff > -9 && fieldGame.los < 40 && fieldGame.t > 180) { //team is behind by one possession inside own 40 w/ over 3 minutes
      return false;
    }
    var shouldGo = 100 * (fieldGame.t / 60) + 25 * diff + 9 * fieldGame.los;
    if (shouldGo < 750) {
      return true;
    }
    return false;
  } else if (fieldGame.q > 4) { //overtime
    if ((fieldGame.awayPoss && !fieldGame.homePoss) || (!fieldGame.awayPoss && fieldGame.homePoss)) { //only one team has had the ball
      if (fieldGame.los >= 55) { //can get ahead by 3
        return false;
      } else { //may as well
        return true;
      }
    } else { //both teams have had the ball
      if (diff >= -3 && fieldGame.los >= 55) { //behind no more than 3 pts in fg range (content to tie)
        return false;
      } else { //either outside of fg range or behind by more than 3 pts
        return true;
      }
    }
  }
}
match.fieldGoal = () => {
  match.sendUpdate({method:'updateDown',down:fieldGame.down,toGo:fieldGame.toGo,los:fieldGame.los,poss:fieldGame.off});
  var dist = 117 - fieldGame.los;
  let u = {method:'newEvent',team:fieldGame.off,q:fieldGame.q,t:fieldGame.t};
  var k = fieldGame[`${fieldGame.off}Players`].k;
  if (dist > 40) {
    var chance = k.longFg;
    k.stats.over40Att++;
    var long = true;
  } else {
    k.stats.under40Att++;
    var chance = k.fg;
    var long = false;
  }
  fieldGame.playGoing = false;
  if (Math.random() < chance) {
    console.log('fg GOOD');
    u.text = `${k.fName} ${k.lName}'s ${dist}-yd field goal is GOOD`;
    if (long) {
      k.stats.over40++;
    } else {
      k.stats.under40++;
    }
    k.stats.pts += 3;
    match.updateScore(3);
  } else {
    console.log('fg NO GOOD');
    u.text = `${k.fName} ${k.lName}'s ${dist}-yd field goal is NO GOOD`;
    match.newDrive(107 - fieldGame.los);
  }
  match.sendStatUpdate();
  fieldGame.updates.push(u);
  match.sendUpdate(u);
}
match.punt = () => {
  match.sendUpdate({method:'updateDown',down:fieldGame.down,toGo:fieldGame.toGo,los:fieldGame.los,poss:fieldGame.off});
  var p = fieldGame[`${fieldGame.off}Players`].p;
  if (Math.random() < p.blocked) {
    console.log('blocked');
    match.newDrive(100 - fieldGame.los);
    p.stats.blocked++;
    return;
  }
  p.stats.punts++;
  var dist = normalRandom(p.distDistr.m,p.distDistr.s);
  var newLos = fieldGame.los + dist;
  console.log('chance of aware',p.aware);
  if (newLos > 99 && Math.random() < p.aware) {
    console.log('punter was aware');
    newLos = Math.floor(Math.random() * 20) + 80;
    dist = Math.round(newLos - fieldGame.los);
  }
  if (newLos > 80) {
    p.stats.in20++;
  }
  p.stats.yds += dist;
  console.log('puntlos',newLos);
  setTimeout(() => {
    fieldGame.playGoing = false;
    if (newLos > 99) {
      p.stats.net += dist - 20;
      match.newDrive(20);
    } else {
      p.stats.net += dist;
      match.newDrive(100 - newLos);
    }
    match.sendStatUpdate();
  },10000);
}
match.advPeriod = () => {
  if (fieldGame.q == 4) {
    match.sendUpdate({method:'eor'});
  }
  setTimeout(() => {
    console.log('starting new period');
    if (fieldGame.q == 1 || fieldGame.q == 3) {
      console.log('end of 1st || 3rd');
      fieldGame.q++;
      fieldGame.t = 900;
      match.startClock();
      match.play();
    } else if (fieldGame.q == 2) {
      console.log('end of first half/updating player stats');
      fieldGame.off = 'away';
      fieldGame.q++;
      fieldGame.t = 900;
      match.randomPlayers();
      match.startClock();
      match.newDrive();
    } else if (fieldGame.q == 4) {
      console.log('end of regulation');
      if (fieldGame.awayScore != fieldGame.homeScore) {
        match.endGame();
      } else { //start ot
        fieldGame.q = 5;
        fieldGame.awaySbq[fieldGame.q - 1] = 0;
        fieldGame.homeSbq[fieldGame.q - 1] = 0;
        fieldGame.awayPoss = false;
        fieldGame.homePoss = false;
        match.randomPlayers();
        if (Math.random() < 0.5) {
          fieldGame.off = 'home';
        } else {
          fieldGame.off = 'away';
        }
        match.sendUpdate({method:'startClock',q:fieldGame.q});
        match.newDrive();
      }
    } else if (fieldGame.q == 5) { //in ot
      if (!fieldGame.awayPoss || !fieldGame.homePoss) { //one or more team has not had the ball, do not advance
        return;
      }
      if (fieldGame.awayScore != fieldGame.homeScore) {
        match.endGame();
      } else { //start 2ot
        fieldGame.q = 6;
        fieldGame.awaySbq[fieldGame.q - 1] = 0;
        fieldGame.homeSbq[fieldGame.q - 1] = 0;
        fieldGame.awayPoss = false;
        fieldGame.homePoss = false;
        match.sendUpdate({method:'startClock',q:fieldGame.q});
        if (Math.random() < 0.5) {
          fieldGame.off = 'home';
        } else {
          fieldGame.off = 'away';
        }
        match.newDrive();
      }
    } else if (fieldGame.q == 6) {
      if (!fieldGame.awayPoss || !fieldGame.homePoss) { //one or more team has not had the ball, do not advance
        return;
      }
      if (fieldGame.awayScore != fieldGame.homeScore || getCurrentWeek() < 11) { //game is not tied, or is tied in regular season
        match.endGame();
      } else { //game is in postseason, we need a winner
        fieldGame.q++;
        fieldGame.awaySbq[fieldGame.q - 1] = 0;
        fieldGame.homeSbq[fieldGame.q - 1] = 0;
        fieldGame.awayPoss = false;
        fieldGame.homePoss = false;
        match.sendUpdate({method:'startClock',q:fieldGame.q});
        if (Math.random() < 0.5) {
          fieldGame.off = 'home';
        } else {
          fieldGame.off = 'away';
        }
        match.newDrive();
      }
    } else { //game is in over 2ot
      if (getCurrentWeek() < 11) { //game is in regular season
        match.endGame();
      } else { //game is in post season
        fieldGame.q++;
        fieldGame.awayPoss = false;
        fieldGame.homePoss = false;
        if (Math.random() < 0.5) {
          fieldGame.off = 'home';
        } else {
          fieldGame.off = 'away';
        }
        match.newDrive();
      }
    }
  },10000);
}
match.endGame = () => {
  console.log('END OF GAME',fieldGame.away,fieldGame.home);
  fieldGame.finished = true;
  match.sendUpdate({method:'declareFinal',q:fieldGame.q});
  match.updateGame().then(() => {
    //console.log('div check',fieldGame.awayTeam.division,fieldGame.homeTeam.division)
    if (fieldGame.awayScore > fieldGame.homeScore) {
      fieldGame.awayTeam.w++;
      fieldGame.homeTeam.l++;
      if (fieldGame.awayTeam.division == fieldGame.homeTeam.division) {
        //console.log('div mtch, away won');
        fieldGame.awayTeam.dw++;
        fieldGame.homeTeam.dl++;
      }
      var winner = 'away';
      if (getCurrentWeek() > 10) {
        for (let team of cfcLeague) {
          if (team.abbr == game.home) {
            team.lost = true;
          }
        }
        for (let team of nfcLeague) {
          if (team.abbr == game.home) {
            team.lost = true;
          }
        }
      }
    } else if (fieldGame.awayScore < fieldGame.homeScore) {
      fieldGame.awayTeam.l++;
      fieldGame.homeTeam.w++;
      if (fieldGame.awayTeam.division == fieldGame.homeTeam.division) {
        //console.log('div mtch, home won');
        fieldGame.awayTeam.dl++;
        fieldGame.homeTeam.dw++;
      }
      var winner = 'home';
      if (getCurrentWeek() > 10) {
        for (let team of cfcLeague) {
          if (team.abbr == game.away) {
            team.lost = true;
          }
        }
        for (let team of nfcLeague) {
          if (team.abbr == game.away) {
            team.lost = true;
          }
        }
      }
    } else {
      fieldGame.awayTeam.t++;
      fieldGame.homeTeam.t++;
      if (fieldGame.awayTeam.division == fieldGame.homeTeam.division) {
        //console.log('div mtch, tie won');
        fieldGame.awayTeam.dt++;
        fieldGame.homeTeam.dt++;
      }
      var winner = 'tie';
    }
    if (fieldGame.q < 5) {
      var sql = `UPDATE games SET status='FINAL' WHERE away='${fieldGame.away}' AND home = '${fieldGame.home}' AND week=${getCurrentWeek()};`;
    } else {
      var sql = `UPDATE games SET status='FINAL-${getPeriod(fieldGame.q)}' WHERE away='${fieldGame.away}' AND home = '${fieldGame.home}' AND week=${getCurrentWeek()};`;
    }
    let at = fieldGame.awayTeam;
    let ht = fieldGame.homeTeam;
    sql += `UPDATE teams SET w=${at.w},l=${at.l},t=${at.t} WHERE abbr='${fieldGame.away}';`;
    sql += `UPDATE teams SET dw=${at.dw},dl=${at.dl},dt=${at.dt} WHERE abbr='${fieldGame.away}';`;
    sql += `UPDATE teams SET w=${ht.w},l=${ht.l},t=${ht.t} WHERE abbr='${fieldGame.home}';`;
    sql += `UPDATE teams SET dw=${ht.dw},dl=${ht.dl},dt=${ht.dt} WHERE abbr='${fieldGame.home}';`;
    if (at.w + at.t + at.l > getCurrentWeek() + 1) { //game has already been ended
      console.log('no double end');
      return;
    }
    console.log(sql);
    //award bets
    var sqlx = '';
    for (let bet of weekWinBets) {
      if (bet.away == fieldGame.away && bet.home == fieldGame.home) {
        var winBet = bet;
        winBet.winningBet = winner;
        break;
      }
    }
    for (let bet of weekOverBets) {
      if (bet.away == fieldGame.away && bet.home == fieldGame.home) {
        var overBet = bet;
        break;
      }
    }
    winBet.resolved = true;
    overBet.resolved = true;
    if (winBet.awayCoins + winBet.homeCoins != 0) {
      var winnings = roundToE3(winBet[`${other(winner)}Coins`] / (winBet.awayCoins + winBet.homeCoins));
      winBet.winnings = winnings;
    } else {
      var winnings = 0;
    }
    if (fieldGame.awayScore + fieldGame.homeScore > overBet.ou) {
      var cover = 'over';
    } else {
      var cover = 'under';
    }
    overBet.winningCover = cover;
    //console.log(bets);
    for (let bet of bets) {
      //console.log(1726,bet.away,fieldGame.away,bet.home,fieldGame.home);
      if (bet.away == fieldGame.away && bet.home == fieldGame.home) {
        //console.log(bet);
        if (bet.cat == 'win' && winner == 'tie') { //tie game
          sqlx += `UPDATE users SET balance=balance+${getBetCost()} WHERE username=${con.escape(bet.name)};`;
        } else if (bet.cat == 'win' && bet.type == winner) { //correct
          sqlx += `UPDATE users SET balance=balance+${getBetCost() + winnings} WHERE username=${con.escape(bet.name)};`;
        } else if (bet.cat == 'cover' && bet.type == cover) { //correct cover
          sqlx += `UPDATE users SET balance=balance+${getBetCost() * 2} WHERE username=${con.escape(bet.name)};`;
        }
      }
    }
    request(sql).then(() => { //update game
      if (sqlx != '') {
        request(sqlx).then(() => { //update user balances if needed
          match.setNextGame();
        });
      } else {
        match.setNextGame();
      }
    });
  });
}
match.setNextGame = () => {
  console.log('set timeout for next game after',fieldGame.away,fieldGame.home);
  games.getAllGames().then(sch => { //set timeout for next game
    let nextGame;
    let unix = Infinity;
    for (let game of sch) {
      let d = new Date(game.schedule);
      if (d.getTime() < unix && game.status == 'upcoming') {
        nextGame = game;
        unix = d.getTime();
      }
    }
    if (!nextGame) {
      return;
    }
    if (getCurrentWeek() == 10 && nextGame.week == 11) { //set wild card weekend
      getPlayoffs();
    } else if (getCurrentWeek() > 10 && getCurrentWeek() != nextGame.week) { //set next playoff round
      setPlayoffWeek();
    } else if (getCurrentWeek() != nextGame.week) {
      var dbx = new Date();
      var dnx = new Date(getNextWeekStart());
      setTimeout(() => {
        getBets();
      },dnx.getTime() - dbx.getTime() + 100);
      //},3000);
    }
    let dx = new Date();
    let dg = new Date(nextGame.schedule);
    var delay = dg.getTime() - dx.getTime();
    if (delay <= 5 * 60 * 1000) {
      delay = 5 * 60 * 1000;
    }
    setTimeout(() => {
      init();
    },delay);
    //},5000);
  });
}
//fix next games and bets timeout                              !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
match.randomPlayers = () => {
  console.log('randomizing players');
  for (let pos in fieldGame.awayRoster) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    let player = fieldGame.awayRoster[pos];
    let stats = [JSON.parse(player.statA),JSON.parse(player.statB),JSON.parse(player.statC)];
    for (let stat of stats) {
      if (stat.name != 'speed' && stat.name != 'dist' && stat.name != 'yac') {
        player[stat.name] = normalRandom(stat.m,stat.s);
      }
    }
  }
  for (let pos in fieldGame.homeRoster) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    let player = fieldGame.homeRoster[pos];
    let stats = [JSON.parse(player.statA),JSON.parse(player.statB),JSON.parse(player.statC)];
    for (let stat of stats) {
      if (stat.name != 'speed' && stat.name != 'dist' && stat.name != 'yac') {
        player[stat.name] = normalRandom(stat.m,stat.s);
      }
    }
  }
}
match.sendStatUpdate = () => {
  let mess = {method:'statUpdate'};
  mess.awayStats = {off:fieldGame.awayOffStats,def:fieldGame.awayDefStats};
  mess.homeStats = {off:fieldGame.homeOffStats,def:fieldGame.homeDefStats};
  mess.away = fieldGame.away;
  mess.home = fieldGame.home;
  mess.awayPlayers = {};
  mess.homePlayers = {};
  let attrs = ['td','fName','lName','pos','team','stats'];
  for (let pos in fieldGame.awayPlayers) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    mess.awayPlayers[pos] = {};
    for (let attr of attrs) {
      mess.awayPlayers[pos][attr] = fieldGame.awayPlayers[pos][attr];
    }
  }
  for (let pos in fieldGame.homePlayers) {
    if (pos.indexOf('flx') != -1) {
      continue;
    }
    mess.homePlayers[pos] = {};
    for (let attr of attrs) {
      mess.homePlayers[pos][attr] = fieldGame.homePlayers[pos][attr];
    }
  }
  match.sendUpdate(mess);
}
match.sendUpdate = (msg) => {
  if (msg.los) {
    if (msg.los == 0) {
      msg.los = 1;
    } else if (msg.los == 100) {
      msg.los = 99;
    }
  }
  for (let cxn of updateCxns) {
    cxn.send(JSON.stringify(msg));
  }
}
function getPlayoffs() {
  teams.getAllTeams().then(list => {
    let confs = [];
    confs[0] = list.slice(0,20);
    confs[1] = list.slice(20,40);
    let league = [];
    games.getAllGames().then(sch => {
      for (let i = 0; i < 2; i++) {
        let conf = confs[i];
        for (let team of conf) {
          if (team.w + team.l + team.t != 0) {
            team.record = (team.w + team.t / 2) / (team.w + team.l + team.t);
          } else {
            team.record = 0.01;
          }
          if (team.dw + team.dl + team.dt != 0) {
            team.divRecord = (team.dw + team.dt / 2) / (team.dw + team.dl + team.dt);
          } else {
            team.divRecord = 0.01;
          }
        }
        conf.sort(teamCompare(sch));
        let divisions = [];
        let leaders = [];
        let leaderAbbrs = [];
        let playoffs = [];
        //order playoff teams
        for (let team of conf) {
          if (!divisions.includes(team.division)) {
            divisions.push(team.division);
            leaders.push(team);
            leaderAbbrs.push(team.abbr);
            playoffs.push(team);
            team.eliminated = false;
          }
        }
        for (let team of conf) {
          if (!leaderAbbrs.includes(team.abbr)) {
            playoffs.push(team);
            team.clinchedDiv = false;
          }
        }
        for (let i = 5; i < 8; i++) { //check elim
          playoffs[i].eliminated = false;
        }
        //check clinches/elims
        for (let leader of leaders) { //check div clinch
          let restOfDiv = [];
          for (let team of conf) {
            if (team.division == leader.division && team.abbr != leader.abbr) {
              restOfDiv.push(team);
            }
          }
          leader.clinchedDiv = checkClinch(leader,restOfDiv,sch);
          leader.clinched = checkClinch(leader,restOfDiv,sch);
        }
        let inTheHunt = [];
        for (let i = 8; i < 20; i++) { //check elim
          let huntTeam = playoffs[i];
          inTheHunt.push(huntTeam);
          let blockers = [];
          for (let leader of leaders) {
            if (huntTeam.division == leader.division) {
              blockers.push(leader);
              break;
            }
          }
          for (let j = 5; j < 8; j++) {
            blockers.push(playoffs[j]);
          }
          let eliminated = true;
          let arr = [huntTeam];
          for (let team of blockers) {
            if (checkClinch(team,arr,sch) == false) {
              eliminated = false;
              break;
            }
          }
          playoffs[i].eliminated = eliminated;
          playoffs[i].clinched = false;
        }
        for (let i = 0; i < 8; i++) { //check playoff clinch
          if (!conf[i].clinchedDiv) {
            conf[i].clinched = checkClinch(conf[i],inTheHunt);
          }
        }
        //send data
        let safeConf = [];
        for (let i = 0; i < playoffs.length; i++) {
          let team = playoffs[i];
          let obj = {};
          obj.abbr = team.abbr;
          obj.mascot = team.mascot;
          obj.clinched = team.clinched;
          obj.clinchedDiv = team.clinchedDiv;
          obj.eliminated = team.eliminated;
          obj.division = team.division;
          obj.w = team.w;
          obj.l = team.l;
          obj.t = team.t;
          obj.seed = i + 1;
          safeConf.push(obj);
        }
        league[i] = safeConf;
        //console.log(safeConf);
      }
      //console.log(league);
      let cfc = league[0].slice(0,8);
      let nfc = league[1].slice(0,8);
      for (let team of cfc) {
        team.lost = false;
      }
      for (let team of cfc) {
        team.lost = false;
      }
      cfcLeague = cfc;
      nfcLeague = nfc;
      setPlayoffWeek();
    });
  });
}
function setPlayoffWeek() {
  games.getWeek(getCurrentWeek() + 1).then(sch => {
    let cfcStill = [];
    let nfcStill = [];
    for (let team of cfcLeague) {
      if (!team.lost) {
        cfcStill.push(team);
      }
    }
    for (let team of nfcLeague) {
      if (!team.lost) {
        nfcStill.push(team);
      }
    }
    cfcStill.sort(function(a,b) {
      return a.seed - b.seed;
    });
    nfcStill.sort(function(a,b) {
      return a.seed - b.seed;
    });
    let sql = '';
    if (getCurrentWeek() == 10) { //week 11, set wild card
      sql += `UPDATE games SET away='${cfcStill[7].abbr}',home='${cfcStill[0].abbr}' WHERE schedule='${sch[0].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[7].abbr}',home='${nfcStill[0].abbr}' WHERE schedule='${sch[1].schedule}';`;
      sql += `UPDATE games SET away='${cfcStill[6].abbr}',home='${cfcStill[1].abbr}' WHERE schedule='${sch[2].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[6].abbr}',home='${nfcStill[1].abbr}' WHERE schedule='${sch[3].schedule}';`;
      sql += `UPDATE games SET away='${cfcStill[5].abbr}',home='${cfcStill[2].abbr}' WHERE schedule='${sch[4].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[5].abbr}',home='${nfcStill[2].abbr}' WHERE schedule='${sch[5].schedule}';`;
      sql += `UPDATE games SET away='${cfcStill[4].abbr}',home='${cfcStill[3].abbr}' WHERE schedule='${sch[6].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[4].abbr}',home='${nfcStill[3].abbr}' WHERE schedule='${sch[7].schedule}';`;
    } else if (getCurrentWeek() == 11) { //wild card, set divisional
      sql += `UPDATE games SET away='${cfcStill[3].abbr}',home='${cfcStill[0].abbr}' WHERE schedule='${sch[0].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[3].abbr}',home='${nfcStill[0].abbr}' WHERE schedule='${sch[1].schedule}';`;
      sql += `UPDATE games SET away='${cfcStill[2].abbr}',home='${cfcStill[1].abbr}' WHERE schedule='${sch[2].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[2].abbr}',home='${nfcStill[1].abbr}' WHERE schedule='${sch[3].schedule}';`;
    } else if (getCurrentWeek() == 12) { //divisional, set conference
      sql += `UPDATE games SET away='${cfcStill[1].abbr}',home='${cfcStill[0].abbr}' WHERE schedule='${sch[0].schedule}';`;
      sql += `UPDATE games SET away='${nfcStill[1].abbr}',home='${nfcStill[0].abbr}' WHERE schedule='${sch[1].schedule}';`;
    } else if (getCurrentWeek() == 13) { //conference, set championship
      sql += `UPDATE games SET away='${cfcStill[0].abbr}',home='${nfcStill[0].abbr}' WHERE schedule='${sch[0].schedule}';`;
    }
    request(sql).then(() => {
      var dbx = new Date();
      var dnx = new Date(getNextWeekStart());
      setTimeout(() => {
        getBets();
      },dnx.getTime() - dbx.getTime() + 100);
    });
  });
}

//bet code

var weekWinBets = [];
var weekOverBets = [];
var bets = [];
getBets();
function getBets() {
  var week = getCurrentWeek();
  weekWinBets.length = 0;
  weekOverBets.length = 0;
  bets.length = 0;
  games.getAllGames().then(sch => {
    //console.log(sch);
    var nextWeek = [];
    for (let game of sch) {
      if (game.week == week) {
        game.ou = 26.5;
        nextWeek.push(game);
      }
    }
    for (let match of nextWeek) {
      let t = 26.5;
      let n = 1;
      for (let game of sch) {
        if (game.week >= week) {
          break;
        }
        if (game.away == match.away || game.home == match.away || game.away == match.home || game.home == match.home) {
          n++;
          t += game.awayScore + game.homeScore;
        }
      }
      match.ou = roundToHalf(t / n);
      weekOverBets.push({away:match.away,home:match.home,over:0,under:0,ou:match.ou,resolved:false,started:false});
      weekWinBets.push({away:match.away,home:match.home,awayCoins:0,homeCoins:0,resolved:false,started:false});
    }
    //console.log(weekOverBets);
  });
}

//app code

app.use(cookieParser());
app.use(useragent.express());
app.get('/', (req, res) => {
  games.getWeek(getCurrentWeek()).then(sch => {
    teams.getAllTeams().then(list => {
      var geo = geoip.lookup(req.clientIp);
      var tz = 'utc';
      if (geo) {
        if (geo.timezone) {
          tz = geo.timezone;
        }
      }
      sch.sort(sortGame);
      for (let game of sch) {
        let t = tiempo.getTime(game.schedule,tz);
        game.time = tiempo.getFormatHour(game.schedule,tz);
        game.day = t.weekdayShort;
      }
      for (let game of sch) {
        for (let team of list) {
          if (team.abbr == game.away) {
            game.awayTeam = team;
            break;
          }
        }
        for (let team of list) {
          if (team.abbr == game.home) {
            game.homeTeam = team;
            break;
          }
        }
      }
      if (fieldGame != false && fieldGame.finished == false) {
        if (fieldGame.q < 5) {
          var period = `${getPeriod(fieldGame.q)} ${toMins(fieldGame.t).m}:${toMins(fieldGame.t).s}`;
        } else {
          var period = getPeriod(fieldGame.q);
        }
        console.log('game found',period);
      }
      stories.sort(function(a,b) {
        return b.time - a.time;
      })
      //var dd = new Date(draftStart);
      //var dt = `${dd.getDate()} ${onlyFirst(monthFromNum(dd.getMonth()))} ${getTime(draftStart)}`;
      var eventTimes = [];
      eventTimes[0] = '2021-02-26T23:00:00Z'; //draft open
      eventTimes[1] = '2021-02-27T02:00:00Z'; //draft
      eventTimes[2] = '2021-02-27T16:30:00Z'; //first game
      eventTimes[3] = '2021-04-07T05:59:00Z'; //trade deadline
      eventTimes[4] = '2021-04-28T05:59:00Z'; //free agency deadline
      eventTimes[5] = '2021-05-09T00:30:00Z'; //last game
      eventTimes[6] = '2021-05-12T15:00:00Z'; //first postseason
      eventTimes[7] = '2021-05-23T18:00:00Z'; //championship
      var clientTimes = [];
      for (let time of eventTimes) {
        clientTimes.push(tiempo.getFormatTime(time,tz));
      }
      let currWeek = [];
      for (let game of sch) {
        //console.log(game.away,game.home);
        currWeek.push(game);
      }
      //console.log(currWeek);
      let pseudo = [];
      for (let story of stories) {
        pseudo.push(story);
      }
      for (let s of pseudo) {
        let ps = new Date(s.time);
        s.stamp = tiempo.getFormatTime(ps.toISOString(),tz);
      }
      res.render('index', {
        games: sch,
        headlines: getHeadlines(currWeek,list,tz),
        stories: pseudo,
        period: period,
        times: clientTimes
      });
    });
  });
});
app.get('/bet', (req, res) => {
  if (!draftFinished) {
    res.sendFile('notlive.html', { root: __dirname });
    return;
  }
  var token = req.cookies.userToken;
  users.getAccountFromToken(token).then(user => {
    if (!user) {
      res.sendFile('betlogin.html', { root: __dirname });
      return;
    }
    users.getAllUsers().then(all => {
      var betsx = [];
      for (let i = 0, o = weekOverBets[0], w = weekWinBets[0]; i < weekOverBets.length; i++, o = weekOverBets[i], w = weekWinBets[i]) {
        //console.log(o,w);
        let obj = {away:o.away,home:o.home,ou:o.ou};
        obj.resolved = o.resolved;
        obj.started = o.started;
        obj.awayMascot = clubs.getTeamFromAbbr(obj.away).mascot;
        obj.homeMascot = clubs.getTeamFromAbbr(obj.home).mascot;
        obj.awayClass = obj.awayMascot.toLowerCase().replace(/\s/g,'');
        obj.homeClass = obj.homeMascot.toLowerCase().replace(/\s/g,'');
        if (w.awayCoins + w.homeCoins == 0) {
          obj.awayChance = '+0 (-%)';
          obj.homeChance = '+0 (-%)';
        } else {
          if (w.awayCoins > w.homeCoins && w.homeCoins != 0) {
            obj.awayChance = `-${Math.round(w.awayCoins / w.homeCoins * 100)}`;
            obj.homeChance = `+${Math.round(w.awayCoins / w.homeCoins * 100)}`;
          } else if (w.awayCoins > w.homeCoins) {
            obj.awayChance = '-100';
            obj.homeChance = '+100';
          } else if (w.awayCoins < w.homeCoins && w.awayCoins != 0) {
            obj.awayChance = `+${Math.round(w.homeCoins / w.awayCoins * 100)}`;
            obj.homeChance = `-${Math.round(w.homeCoins / w.awayCoins * 100)}`;
          } else if (w.awayCoins < w.homeCoins) {
            obj.awayChance = '+100';
            obj.homeChance = '-100';
          } else {
            obj.awayChance = '-100';
            obj.homeChance = '-100';
          }
          obj.awayChance += ` (${(w.awayCoins / (w.awayCoins + w.homeCoins) * 100).toFixed(1)}%)`;
          obj.homeChance += ` (${(w.homeCoins / (w.awayCoins + w.homeCoins) * 100).toFixed(1)}%)`;
        }
        for (let bet of bets) {
          if (bet.away == w.away && bet.home == w.home && bet.cat == 'win' && bet.name == user.username) {
            obj[`${bet.type}WinClass`] = 'selected';
            obj[`${other(bet.type)}WinClass`] = 'notselected';
            obj.resolved = w.resolved;
            if (w.resolved === true && w.winningBet == bet.type) {
              obj.winChange = `+${w.winnings}`;
              obj.winChangeColor = 'limegreen';
            } else if (w.resolved === true && w.winningBet != 'tie') {
              obj.winChange = `-${getBetCost()}`;
              obj.winChangeColor = 'orangered';
            } else if (w.resolved === true) {
              obj.winChange = `+0`;
              obj.winChangeColor = 'white';
            }
          }
          if (bet.away == o.away && bet.home == o.home && bet.cat == 'cover' && bet.name == user.username) {
            obj[`${bet.type}CoverClass`] = 'selected';
            obj[`${other(bet.type)}CoverClass`] = 'notselected';
            obj.resolved = o.resolved;
            if (o.resolved === true && o.winningCover == bet.type) {
              obj.coverChange = `+${getBetCost()}`;
              obj.coverChangeColor = 'limegreen';
            } else if (o.resolved === true) {
              obj.coverChange = `-${getBetCost()}`;
              obj.coverChangeColor = 'orangered';
            }
          }
        }
        betsx.push(obj);
      }
      for (let bet of betsx) {
        if (bet.resolved && !bet.coverChange) {
          bet.coverChange = 'DNB';
          bet.coverChangeColor = 'white';
        }
        if (bet.resolved && !bet.winChange) {
          bet.winChange = 'DNB';
          bet.winChangeColor = 'white';
        }
      }
      //console.log(betsx);
      for (let user of all) { //for leaderboard
        user.bal = numberWithCommas(user.balance);
      }
      all.sort(function(a,b) {
        return b.balance - a.balance;
      })
      res.render('bet', {
        bets: betsx,
        balance: numberWithCommas(user.balance),
        cost: numberWithCommas(getBetCost()),
        all: all,
        rawBalance: user.balance,
        name: user.username,
        rawCost: getBetCost()
      });
    });
  });
});
app.get('/draft', (req, res) => {
  if (draftFinished) {
    res.sendFile('notfound.html', { root: __dirname });
    return;
  }
  var token = req.cookies.token;
  if (token) {
    teams.getAccountFromToken(token).then(acc => {
      if (!acc) {
        let user = req.useragent;
        let id = secStr();
        let offerDraft = false;
        let dox = new Date(draftOpen);
        let dax = new Date();
        if (dax.getTime() > dox.getTime() && !draftFinished) {
          offerDraft = true;
        }
        console.log(offerDraft);
        devices[id] = {platform:user.platform,os:user.os,browser:user.browser};
        res.render('login', {
          id: id,
          offerDraft: offerDraft
        });
        return;
      }
      draft.getWholeDraft().then(picks => {
        let nextTwenty = draft.getNextTwenty(picks,currentPick + 1);
        for (let obj of nextTwenty) {
          if (obj.n != -1 && obj != undefined) {
            obj.p++;
            let t = clubs.getTeamFromIndex(obj.n);
            obj.t = t.abbr;
            obj.c = t.mascot.toLowerCase().replace(/\s/g,'');
          } else {
            obj.p++;
            let t = {mascot:'league',abbr:'LEA'};
            obj.t = t.abbr;
            obj.c = t.mascot.toLowerCase().replace(/\s/g,'');
          }
        }
        let pickList = [];
        for (let i = 0; i < picks.length; i++) {
          pickList.push(clubs.getTeamFromIndex(picks[i]));
        }
        let currentTeam = clubs.getTeamFromIndex(picks[currentPick]);
        let isPick = false;
        if (currentTeam == acc.abbr) {
          isPick = true;
        }
        let time;
        if (draftLive) {
          if (draftTimer < 10) {
            time = `0${draftTimer}`;
          } else {
            time = draftTimer;
          }
        } else {
          time = 'x';
        }
        let nextIndex = picks[currentPick];
        let nextRows = [];
        let nextPicks = [];
        for (let i = 0; i < picks.length; i++) {
          if (picks[i] == nextIndex) {
            nextPicks.push(i);
          }
        }
        nextPicks = nextPicks.reverse();
        for (let pick of nextPicks) {
          if (draftedPlayers[pick]) {
            let p = draftedPlayers[pick];
            nextRows.push(`Drafted ${p.fName} ${p.lName} (${p.pos}) <span class="num">#${p.id}</span>`);
          }
        }
        nextPicks = nextPicks.reverse();
        let lim = 0;
        while (nextRows.length < 3 && lim < 1000) {
          if (getRoundAndPick(nextPicks[lim] + 1).r >= getRoundAndPick(currentPick + 1).r) {
            let p = getRoundAndPick(nextPicks[lim] + 1);
            nextRows.push(`Has ${ordinal(p.p)} pick of ${ordinal(p.r)} round (${ordinal(nextPicks[lim] + 1)} overall)`);
          }
          lim++;
        }
        let trades = [];
        for (let trade of draftTrades) {
          if ((trade.from == acc.abbr || trade.to == acc.abbr) && trade.status != 'negated') {
            trade.fromMascot = clubs.getTeamFromAbbr(trade.from).mascot;
            trade.fromClass = trade.fromMascot.toLowerCase().replace(/\s/g,'');
            trade.toMascot = clubs.getTeamFromAbbr(trade.to).mascot;
            trade.toClass = trade.toMascot.toLowerCase().replace(/\s/g,'');
            trades.push(trade);
          }
        }
        players.getFreeAgents().then(agents => {
          res.render('draft', {
            qbAgents: agents.qb,
            rbAgents: agents.rb,
            wrAgents: agents.wr,
            teAgents: agents.te,
            deAgents: agents.de,
            lbAgents: agents.lb,
            cbAgents: agents.cb,
            sAgents: agents.s,
            kAgents: agents.k,
            pAgents: agents.p,
            teamClass: acc.mascot.toLowerCase().replace(/\s/g,''),
            teamMascot: acc.mascot,
            picks: draft.getPicksFromTeamIndex(picks,clubs.getTeamIndex(acc.abbr)),
            nextTwenty: nextTwenty,
            abbr: acc.abbr,
            pickList: pickList,
            currentTeam: currentTeam,
            isPick: isPick,
            live: draftLive,
            time: time,
            rows: nextRows,
            pick: getRoundAndPick(currentPick + 1).p,
            round: getRoundAndPick(currentPick + 1).r,
            signedIn: true,
            trades: trades,
            drafted: draftedPlayers
          });
        });
      });
    });
  } else {
    let user = req.useragent;
    let id = secStr();
    let offerDraft = false;
    let dox = new Date(draftOpen);
    let dax = new Date();
    if (dax.getTime() > dox.getTime() && !draftFinished) {
      offerDraft = true;
    }
    devices[id] = {platform:user.platform,os:user.os,browser:user.browser};
    res.render('login', {
      id: id,
      offerDraft: offerDraft
    });
  }
});
app.get('/draftguest', (req, res) => {
  if (draftFinished) {
    res.sendFile('notfound.html', { root: __dirname });
    return;
  }
  draft.getWholeDraft().then(picks => {
    let nextTwenty = draft.getNextTwenty(picks,currentPick + 1);
    for (let obj of nextTwenty) {
      if (obj.n != -1) {
        obj.p++;
        let t = clubs.getTeamFromIndex(obj.n);
        obj.t = t.abbr;
        obj.c = t.mascot.toLowerCase().replace(/\s/g,'');
      }
    }
    let pickList = [];
    for (let i = 0; i < picks.length; i++) {
      pickList.push(clubs.getTeamFromIndex(picks[i]));
    }
    let currentTeam = clubs.getTeamFromIndex(picks[currentPick]);
    let time;
    if (draftLive) {
      if (draftTimer < 10) {
        time = `0${draftTimer}`;
      } else {
        time = draftTimer;
      }
    } else {
      time = 'x';
    }
    let nextIndex = picks[currentPick];
    let nextRows = [];
    let nextPicks = [];
    for (let i = 0; i < picks.length; i++) {
      if (picks[i] == nextIndex) {
        nextPicks.push(i);
      }
    }
    nextPicks = nextPicks.reverse();
    for (let pick of nextPicks) {
      if (draftedPlayers[pick] && nextRows.length < 3) {
        let p = draftedPlayers[pick];
        nextRows.push(`Drafted ${p.fName} ${p.lName} (${p.pos}) <span class="num">#${p.id}</span>`);
      }
    }
    nextPicks = nextPicks.reverse();
    let lim = 0;
    while (nextRows.length < 3 && lim < 1000) {
      if (getRoundAndPick(nextPicks[lim] + 1).r >= getRoundAndPick(currentPick + 1).r) {
        let p = getRoundAndPick(nextPicks[lim] + 1);
        nextRows.push(`Has ${ordinal(p.p)} pick of ${ordinal(p.r)} round (${ordinal(nextPicks[lim] + 1)} overall)`);
      }
      lim++;
    }
    players.getFreeAgents().then(agents => {
      res.render('draft', {
        qbAgents: agents.qb,
        rbAgents: agents.rb,
        wrAgents: agents.wr,
        teAgents: agents.te,
        deAgents: agents.de,
        lbAgents: agents.lb,
        cbAgents: agents.cb,
        sAgents: agents.s,
        kAgents: agents.k,
        pAgents: agents.p,
        nextTwenty: nextTwenty,
        pickList: pickList,
        currentTeam: currentTeam,
        live: draftLive,
        time: time,
        rows: nextRows,
        pick: getRoundAndPick(currentPick + 1).p,
        round: getRoundAndPick(currentPick + 1).r,
        signedIn: false,
        abbr: 'XXX',
        isPick: false,
        drafted: draftedPlayers
      });
    });
  });
});
app.get('/schedule', (req, res) => {
  games.getWeek(getCurrentWeek()).then(list => {
    var geo = geoip.lookup(req.clientIp);
    var tz = 'utc';
    if (geo) {
      if (geo.timezone) {
        tz = geo.timezone;
      }
    }
    for (let game of list) {
      game.awayTeam = clubs.getTeamFromAbbr(game.away);
      game.homeTeam = clubs.getTeamFromAbbr(game.home);
      //game.time = getTime(game.schedule);
      game.time = tiempo.getFormatTime(game.schedule,tz).toUpperCase();
    }
    list.sort(sortGame);
    if (fieldGame != false && fieldGame.finished == false) {
      if (fieldGame.q < 5) {
        var period = `${getPeriod(fieldGame.q)} ${toMins(fieldGame.t).m}:${toMins(fieldGame.t).s}`;
      } else {
        var period = getPeriod(fieldGame.q);
      }
    }
    res.render('schedule', {
      games: list,
      week: getCurrentWeek(),
      period: period
    });
  });
  //res.sendFile('schedule.html', { root: __dirname });
});
app.get('/stats', (req, res) => {
  res.sendFile('stats.html', { root: __dirname });
});
app.get('/info', (req, res) => {
  res.sendFile('info.html', { root: __dirname });
});
app.get('/playoffs', (req, res) => {
  res.sendFile('playoffs.html', { root: __dirname });
});
app.get('/teams', function(req, res) {
  //console.log(req.useragent);
  var token = req.cookies.token;
  teams.getAllTeams().then(list => {
    let acc;
    let hash;
    for (let team of list) {
      //console.log(team);
      let tokenSalt = JSON.parse(team.tokenSalt);
      let tokenHash = JSON.parse(team.tokenHash);
      for (let i = 0; i < tokenSalt.length; i++) {
        if (crypto.createHash('sha512').update(token + tokenSalt[i]).digest('hex') == tokenHash[i]) {
          hash = crypto.createHash('sha512').update(token + tokenSalt[i]).digest('hex');
          acc = team;
          break;
        }
      }
    }
    if (!acc) {
      console.log('no acc when rendering page');
      let user = req.useragent;
      let id = secStr();
      devices[id] = {platform:user.platform,os:user.os,browser:user.browser};
      res.render('login', {
        id: id,
        offerDraft: false
      });
      return;
    }
    var geo = geoip.lookup(req.clientIp);
    var tz = 'utc';
    if (geo) {
      if (geo.timezone) {
        tz = geo.timezone;
      }
    }
    //console.log(acc);
    var teamAbbr = acc.abbr;
    games.getNextGame(teamAbbr).then(game => {
      if (!game) {
        res.sendFile('seasondone.html', { root: __dirname });
        return;
      }
      teams.getTeamFromAbbr(games.getOppo(teamAbbr,game)).then(oppo => {
        //console.log(oppo);
        var team = acc;
        var teamClass = team.mascot.toLowerCase().replace(/\s/g,'');
        if (oppo) {
          //var nextGame = game;
          //var oppoAbbr = oppo.abbr;
          var oppoClass = oppo.mascot.toLowerCase().replace(/\s/g,'');
          done = draftFinished;
        } else {
          //var nextGame = {};
          //var oppoAbbr = '';
          var oppo = '';
          var oppoClass = '';
          done = false;
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
        attrs['k'] = [{a:'pat',l:'PAT'},{a:'fg',l:'<abbr title="Field Goals 20 Yards or Under">FG</abbr>'},{a:'longFg',l:'<abbr title="Field Goals Over 20 Yards">Long FG</abbr>'}];
        attrs['p'] = [{a:'dist',l:'<abbr title="Punt Distance">Dist.</abbr>'},{a:'aware',l:'<abbr title="Awareness">Aware.</abbr>'},{a:'block',l:'Blocked'}];
        attrs['flx1'] = [];
        attrs['flx2'] = [];
        attrs['flx3'] = [];
        let numRoster = JSON.parse(team.roster);
        if (!numRoster[10] || !numRoster[11] || !numRoster[12]) {
          var openSlot = true;
        } else {
          var openSlot = false;
        }
        let devs = [];
        for (let dev of JSON.parse(team.devices)) {
          if (dev == undefined) {
            continue;
          } else {
            devs.push(dev);
          }
          for (let attr in dev) {
            if (!dev[attr]) {
              dev[attr] = 'Unknown';
            } else if (dev[attr] == undefined) {
              dev[attr] = 'Unknown';
            }
          }
        }
        var teamTrades = [];
        for (let t in trades) {
          let trade = trades[t];
          let use = false;
          if (trade.to == teamAbbr && trade.toHide != true) {
            teamTrades.push(trade);
            use = true;
          }
          if (trade.from == teamAbbr && trade.fromHide != true) {
            teamTrades.push(trade);
            use = true;
          }
          if (use) {
            trade.fromClass = trade.fromMascot.toLowerCase().replace(/\s/g,'');
            trade.toClass = trade.toMascot.toLowerCase().replace(/\s/g,'');
          }
        }
        for (let trade of teamTrades) {
          trade.time = tiempo.getFormatTime(trade.stamp,tz);
        }
        let calls = [team.passEarly,team.passLate,team.wrEarly,team.wrLate,team.deRushEarly,team.deRushLate,team.lbRushEarly,team.lbRushLate];
        players.getAllPlayers().then(p => {
          players.getFreeAgents().then(agents => {
            let d = new Date(game.schedule);
            //res.cookie('test','express');
            res.render('teampage', {
              abbr: teamAbbr,
              teamMascot: team.mascot,
              teamClass: teamClass,
              day: fullDay(d.getDay()),
              month: fullMonth(d.getMonth()),
              date: d.getDate(),
              time: tiempo.getFormatHour(game.schedule,tz),
              oppoMascot: oppo.mascot,
              oppoClass: oppoClass,
              teamRecord: `${formatRecord(team,false)} | ${formatRecord(team,true)}`,
              oppoRecord: `${formatRecord(oppo,false)} | ${formatRecord(oppo,true)}`,
              teamRoster: getFullRoster(p,JSON.parse(team.roster)),
              oppoRoster: getFullRoster(p,JSON.parse(oppo.roster)),
              attrs: attrs,
              qbAgents: agents.qb,
              rbAgents: agents.rb,
              wrAgents: agents.wr,
              teAgents: agents.te,
              deAgents: agents.de,
              lbAgents: agents.lb,
              cbAgents: agents.cb,
              sAgents: agents.s,
              kAgents: agents.k,
              pAgents: agents.p,
              openSlot: openSlot,
              done: done,
              fact: Boolean(team.factActivated),
              email: Boolean(team.emailActivated),
              devices: devs,
              hash: hash,
              factRecovery: Boolean(team.useFact),
              emailRecovery: Boolean(team.useEmail),
              emailUpdates: team.emailUpdates,
              trades: teamTrades,
              canFreeAgent: canFreeAgent(),
              canTrade: canMakeTrade(),
              calls: calls
            });
          });
        });
      });
    });
  });
});
app.get('/api', function(req, res)  { 
  //console.log(req);
  console.log(req.originalUrl);
  //var url = new URL(req.originalUrl);
  var query = parseQuery(req.originalUrl.substring(req.originalUrl.indexOf('?'),req.originalUrl.length));
  var types = ['games','playoffOrder','players','draftOrder','roster'];
  if (!types.includes(query.type)) {
    query.data = 'Error: Invalid Request Type';
    res.json(query);
    return;
  }
  if (!query.qual && query.type != 'draftOrder') {
    query.data = `Error: Missing qual attribute in request type ${query.type}`;
    res.json(query);
    return;
  }
  var cfc = ['FLA','FOX','NAT','PEN','GRE','PAN','PIR','SNA','DRA','ENG','PIO','RED','COU','FAL','GRI','WAR','AAR','COO','ROT','SEN'];
  var nfc = ['BAD','HUM','LON','WOL','AVI','CHA','EAG','GAL','CHE','PEG','STR','ZEB','COL','HUS','LYN','STA','GOL','REB','SHA','SQU'];
  var all = cfc.concat(nfc);
  if (query.type == 'playoffOrder' && query.qual.toUpperCase() != 'CFC'  && query.qual.toUpperCase() != 'NFC' ) {
    query.data = `Error: Invalid qual attribute in type "playoffOrder": unknown conference id - ${query.qual}`;
    res.json(query);
    return;
  }
  var pos = ['all','off','def','qb','rb','wr','te','de','lb','cb','s','k','p'];
  if (query.type == 'players' && !pos.includes(query.qual.toLowerCase())) {
    query.data = `Error: Invalid qual attribute in type "players": unknown position id - ${query.qual}`;
    res.json(query);
    return;
  }
  if (query.type == 'roster' && !all.includes(query.qual.toUpperCase())) {
    query.data = `Error: Invalid qual attribute in type "roster": unknown team id - ${query.qual}`;
    res.json(query);
    return;
  }
  //needs crit
  if (query.type == 'games' && !query.crit) {
    query.data = `Error: Missing crit attribute in request type ${query.type}`;
    res.json(query);
    return;
  }
  if (query.type == 'games' && query.qual != 'week' && query.qual != 'team') {
    query.data = 'Error: Invalid qual attribute in type "games"';
    res.json(query);
    return;
  }
  if (query.type == 'games' && query.qual == 'week' && isNaN(Number(query.crit))) {
    query.data = 'Error: Invalid crit attribute in type "games": cannot be converted to number';
    res.json(query);
    return;
  }
  if (query.type == 'games' && query.qual == 'week' && (Number(query.crit) > 14 || Number(query.crit) < 0)) {
    query.data = 'Error: Invalid crit attribute in type "games": must be between 0 and 14, inclusive';
    res.json(query);
    return;
  }
  if (query.type == 'games' && query.qual == 'team' && !all.includes(query.crit)) {
    query.data = `Error: Invalid crit attribute in type "games": unknown team id - ${query.crit}`;
    res.json(query);
    return;
  }
  requestData(query,undefined,res);
  //console.log(query);
  //res.send(request.json) //then returning the response.. The request.json is empty over here
  //res.sendFile('notfound.html', { root: __dirname });
});
app.get('*', function(req, res){
  res.sendFile('notfound.html', { root: __dirname });
});
var server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));
//const WebSocket = require('ws');
//const { parse } = require('path');
//const { send } = require('process');
//const { isObject } = require('util');
//const { resolve } = require('path');
//const { timeStamp } = require('console');
//const { brotliCompress } = require('zlib');
const wss = new WebSocket.Server({server : server});
var activeCxns = {};
var trades = {};
var teamCxns = {};
var draftCxns = {};
var draftedPlayers = [];
var updateCxns = [];

wss.on('connection', (ws) => {
  console.log('Client connected 2');
  let id = guid(activeCxns);
  activeCxns[id] = ws;
  ws.id = id;
  ws.on('close', () => {
    delete activeCxns[ws.id];
    for (let attr in teamCxns) {
      for (let cxn in teamCxns[attr]) {
        if (!teamCxns[attr][cxn]) {
          continue;
        }
        if (!teamCxns[attr][cxn].id) {
          continue;
        }
        if (teamCxns[attr][cxn].id == ws.id) {
          teamCxns[attr][cxn] = undefined;
          teamCxns[attr] = teamCxns[attr].filter(function (el) {return el != null; });
        }
      }
    }
    for (let attr in draftCxns) {
      for (let cxn in draftCxns[attr]) {
        if (draftCxns[attr][cxn]) {
          if (draftCxns[attr][cxn].id == ws.id) {
            draftCxns[attr][cxn] = undefined;
            draftCxns[attr] = draftCxns[attr].filter(function (el) {return el != null; });
          }
        }
      }
    }
    for (let cxn in updateCxns) {
      if (!updateCxns[cxn]) {
        continue;
      }
      if (!updateCxns[cxn].id) {
        continue;
      }
      if (ws.id == updateCxns[cxn].id) {
        updateCxns[cxn] = undefined;
      }
    }
    updateCxns = updateCxns.filter(function (el) {return el != null; });
    console.log('Client disconnected');
  });
});

// teams.getTeamFromMascot(result.username).then(acc => {
//   if (!acc) {
//     let res = {method:'error',type:'505'}; //leave
//     ws.send(JSON.stringify(res));
//     return;
//   }
// });

// teams.getAccountFromToken(result.token).then(acc => {
//   if (!acc) {
//     let res = {method:'error',type:'505'}; //leave
//     ws.send(JSON.stringify(res));
//     return;
//   }
// });

// teams.getAccountFromToken(result.token).then(team => {
//   if (!team) {
//     let res = {method:'error',type:'505'}; //leave
//     ws.send(JSON.stringify(res));
//     return;
//   }
// });

wss.on('connection', ws => {
  //connect
  //const connection = request.accept(null, request.origin);
  ws.on('open', () => console.log('opened!'));
  ws.on('close', () => console.log('closed!'));
  ws.on('message', message => {
    let result = JSON.parse(message);
    //I have received a message from the client
    console.log(result);
    if (result.method == 'request') {
      requestData(result,ws);
    } else if (result.method == 'activate') {
      teams.getTeamFromMascot(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'activate',mess:'Account not found'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (acc.hash && acc.salt) {
          let res = {method:'error',type:'activate',mess:'Account already activated'};
          ws.send(JSON.stringify(res));
          return;
        }
        let hash = crypto.createHash('sha512').update(result.code + acc.initSalt).digest('hex');
        if (hash != acc.initHash) {
          console.log(secStr());
          let res = {method:'error',type:'activate',mess:'Code is not correct'};
          ws.send(JSON.stringify(res));
          return;
        }
        let temp = secStr();
        let salt = secStr();
        let saltHash = crypto.createHash('sha512').update(temp + salt).digest('hex');
        updateTeam(acc.abbr,['tempSalt','tempHash'],[salt,saltHash]);
        let res = {method:'activated',temp:temp,username:result.username};
        ws.send(JSON.stringify(res));
      });
    } else if (result.method == 'setPass') {
      teams.getTeamFromMascot(result.username).then(acc => {
        console.log('running');
        if (!acc) {
          let res = {method:'error',type:'activate',mess:'Account not found'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex') != acc.tempHash) {
          let res = {method:'error',type:'505'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (result.password.length < 12) {
          let res = {method:'error',type:'activate',mess:'Password must be at least 12 characters'};
          ws.send(JSON.stringify(res));
          return;
        }
        let salt = secStr();
        let hash = crypto.createHash('sha512').update(result.password + salt).digest('hex');
        let tokenSalt = secStr();
        let token = secStr();
        let tokenHash = crypto.createHash('sha512').update(token + tokenSalt).digest('hex');
        let accSalts = JSON.parse(acc.tokenSalt);
        let accHashes = JSON.parse(acc.tokenHash);
        accSalts.push(tokenSalt);
        accHashes.push(tokenHash);
        let accDevices = JSON.parse(acc.devices);
        if (devices[result.id]) {
          let dev = devices[result.id];
          dev.hash = tokenHash;
          accDevices.push(dev);
          delete devices[result.id];
        }
        let attrs = ['salt','hash','tokenSalt','tokenHash','devices','tempSalt','tempHash','useEmail','useFact'];
        let vals = [salt,hash,accSalts,accHashes,accDevices,null,null,false,false];
        updateTeam(acc.abbr,attrs,vals,ws).then(function(){
          let mess = {method:'signedIn',redirect:'teams',token:token};
          ws.send(JSON.stringify(mess));
        });
        return;
      });
    } else if (result.method == 'signIn') {
      teams.getTeamFromMascot(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let hash = crypto.createHash('sha512').update(result.password + acc.salt).digest('hex');
        if (hash == acc.hash && !acc.factActivated) {
          let salt = secStr();
          let allSalts = JSON.parse(acc.tokenSalt);
          let allHashes = JSON.parse(acc.tokenHash);
          let allDevices = JSON.parse(acc.devices);
          allSalts.push(salt);
          let token = secStr();
          let newHash = crypto.createHash('sha512').update(token + salt).digest('hex');
          allHashes.push(newHash);
          if (devices[result.id]) {
            let dev = devices[result.id];
            dev.hash = newHash;
            allDevices.push(dev);
            delete devices[result.id];
          }
          updateTeam(acc.abbr,['tokenSalt','tokenHash','devices'],[allSalts,allHashes,allDevices]).then(() => {
            let mess = {method:'signedIn',redirect:'teams',token:token};
            ws.send(JSON.stringify(mess));
            return;
          });
        } else if (hash == acc.hash) {
          let temp = secStr();
          let tempSalt = secStr();
          let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
          updateTeam(acc.abbr,['tempSalt','tempHash'],[tempSalt,tempHash]).then(() => {
            let res = {method:'promptFact',temp:temp};
            ws.send(JSON.stringify(res));
            setTimeout(function() {
              updateTeam(acc.abbr,['tempSalt','tempHash'],[null,null]);
            },1000 * 60 * 10);
            return;
          });
        } else {
          let res = {method:'error',type:'signIn',mess:'Incorrect password'};
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'signOut') {
      teams.deleteToken(result.token).then(() => {
        let res = {method:'error',type:'505'}; //leave
        ws.send(JSON.stringify(res));
        return;
      });
    } else if (result.method == 'confirmPass') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (crypto.createHash('sha512').update(result.password + acc.salt).digest('hex') != acc.hash) {
          let res = {method:'error',type:'changePass',mess:'Incorrect password'};
          ws.send(JSON.stringify(res));
          return;
        }
        let temp = secStr();
        let tempSalt = secStr();
        let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
        updateTeam(acc.abbr,['tempSalt','tempHash'],[tempSalt,tempHash]).then(() => {
          let res = {method:'confirmed',temp:temp};
          ws.send(JSON.stringify(res));
          setTimeout(function() {
            updateTeam(acc.abbr,['tempSalt','tempHash'],[null,null]);
          },1000 * 60 * 10);
          return;
        });
      });
    } else if (result.method == 'changePass') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex') != acc.tempHash) {
          let res = {method:'error',type:'changePass',mess:'An error occurred'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (result.password.length < 12) {
          let res = {method:'error',type:'changePass',mess:'Password must be at least 12 characters'};
          ws.send(JSON.stringify(res));
          return;
        }
        let newSalt = secStr();
        let newHash = crypto.createHash('sha512').update(result.password + newSalt).digest('hex');
        updateTeam(acc.abbr,['salt','hash'],[newSalt,newHash]).then(() => {
          ws.send(JSON.stringify({method:'passChanged'}));
        });
      });
    } else if (result.method == 'univSignOut') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        updateTeam(acc.abbr,['tokenSalt','tokenHash','devices'],[[],[],[]]).then(() => {
          //ws.send(JSON.stringify({method:'signOut'}));
          if (teamCxns[acc.abbr]) {
            for (let cxn of teamCxns[acc.abbr]) {
              cxn.send(JSON.stringify({method:'signOut'}));
            }
          }
        });
      });
    } else if (result.method == 'enable2fa') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (acc.twoFactor && Boolean(acc.factActivated)) {
          let res = {method:'error',type:'enable2fa',mess:'2FA is already enabled'};
          ws.send(JSON.stringify(res));
          return;
        }
        let secret = speakeasy.generateSecret();
        secret.otpauth_url += '&issuer=The League';
        secret.otpauth_url = secret.otpauth_url.replace('SecretKey',acc.mascot);
        let encSecret = encrypt(secret.base32,acc.mascot);
        updateTeam(acc.abbr,['twoFactor'],[encSecret]).then(() => {
          qrcode.toDataURL(secret.otpauth_url, function(err, data_url) {
            ws.send(JSON.stringify({method:'qr',data:data_url}));
          });
        });
      });
    } else if (result.method == 'verify2fa') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let decSecret = decrypt(acc.twoFactor,acc.mascot);
        let verified = speakeasy.totp.verify({secret:decSecret,encoding:'base32',token:result.code});
        if (verified) {
          updateTeam(acc.abbr,['factActivated'],[true]).then(() => {
            let res = {method:'error',type:result.method,mess:'2FA successfully enabled'};
            ws.send(JSON.stringify(res));
            return;
          });
        } else {
          let res = {method:'error',type:result.method,mess:'Incorrect code entered'};
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'emailValidate') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (!validateEmail(result.email)) {
          let res = {method:'error',type:result.method,mess:'Email is not valid'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (acc.emailActivated) {
          let res = {method:'error',type:result.method,mess:'Email is already verified'};
          ws.send(JSON.stringify(res));
          return;
        }
        let veriCode = getSixDigit();
        let veriSalt = secStr();
        let veriHash = crypto.createHash('sha512').update(veriCode + veriSalt).digest('hex');
        let encAddress = encrypt(result.email,acc.mascot);
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'theleagueupdates@gmail.com',
            pass: 'Fz$6&rQ$P5YN@N*@H77#AyiEp&DtDop%'
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        let mailOptions = {
          from: 'theleagueupdates@gmail.com',
          to: result.email,
          subject: 'The League Verification Code',
          text: `Your Code is: ${veriCode}. You have 2 minutes from the time you requested this code to enter it on the same device.`
        };
        updateTeam(acc.abbr,['tempSalt','tempHash','email'],[veriSalt,veriHash,encAddress]).then(() => {
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
              let res = {method:'error',type:result.method,mess:'An error occurred'};
              ws.send(JSON.stringify(res));
            } else {
              console.log('Email sent: ' + info.response);
              let res = {method:'emailSent'};
              ws.send(JSON.stringify(res));
            }
          });
          setTimeout(function() {
            updateTeam(acc.abbr,['tempSalt','tempHash'],[null,null]);
          }, 120 * 1000);
        });
      });
    } else if (result.method == 'veriCode') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let hash = crypto.createHash('sha512').update(result.code + acc.tempSalt).digest('hex');
        if (acc.tempHash == hash) {
          updateTeam(acc.abbr,['emailActivated','useEmail','useFact','emailUpdates'],[true,true,false,false]).then(() => {
            let res = {method:'error',type:result.method,mess:'Email verified',success:true};
          ws.send(JSON.stringify(res));
          return;
          });
        } else {
          let res = {method:'error',type:result.method,mess:'Incorrect code'};
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'recoMethod') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (!acc.emailActivated && result.to == 'email') {
          let res = {method:'error',type:result.method,mess:'Email is not verified',to:result.to,fact:acc.factRecovery};
          ws.send(JSON.stringify(res));
          return;
        } else if (!acc.factActivated && result.to == 'fact') {
          let res = {method:'error',type:result.method,mess:'Two-factor authentication is not enabled',to:result.to,email:acc.emailRecovery};
          ws.send(JSON.stringify(res));
          return;
        }
        updateTeam(acc.abbr,[`use${capFirst(result.to)}`,`use${capFirst(result.from)}`],[true,false]).then(() => {
          let mess = {method:'newMethod',from:result.from,to:result.to};
          ws.send(JSON.stringify(mess));
        });
      });
    } else if (result.method == 'enableUpdates') {
      teams.getAccountFromToken(result.token).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let x = result.x;
        if (x == true || x == false) {
          updateTeam(acc.abbr,['emailUpdates'],[x]).then(() => {
            if (x == true) {
              let res = {method:'error',type:result.method,mess:`You will now receive occasional updates at ${starEmail(decrypt(acc.email,acc.mascot))}`};
              ws.send(JSON.stringify(res));
            } else if (x == false) {
              let res = {method:'error',type:result.method,mess:'You will no longer get any updates'};
              ws.send(JSON.stringify(res));
            }
          });
        } else {
          let res = {method:'error',type:result.method,mess:'An error occurred'};
          ws.send(JSON.stringify(res));
        }
      });
    } else if (result.method == 'signIn2fa') {
      teams.getTeamFromMascot(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let tempHash = crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex');
        if (acc.tempHash != tempHash) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let decSecret = decrypt(acc.twoFactor,acc.mascot);
        let verified = speakeasy.totp.verify({secret:decSecret,encoding:'base32',token:result.code});
        console.log('veri',verified,'.',acc.twoFactor,'.',result.code);
        if (verified) {
          let newSalt = secStr();
          let newToken = secStr();
          let newHash = crypto.createHash('sha512').update(newToken + newSalt).digest('hex');
          let allSalts = JSON.parse(acc.tokenSalt);
          let allHashes = JSON.parse(acc.tokenHash);
          let allDevices = JSON.parse(acc.devices);
          if (devices[result.id]) {
            let dev = devices[result.id];
            dev.hash = newHash;
            allDevices.push(dev);
            delete devices[result.id];
          }
          allSalts.push(newSalt);
          allHashes.push(newHash);
          updateTeam(acc.abbr,['tokenSalt','tokenHash','devices'],[allSalts,allHashes,allDevices]).then(() => {
            let mess = {method:'signedIn',redirect:'teams',token:newToken};
            ws.send(JSON.stringify(mess));
          });
        } else {
          let res = {method:'error',type:'signIn2fa',mess:'Incorrect code entered'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'forgotPass') {
      teams.getTeamFromMascot(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let temp = secStr();
        let tempSalt = secStr();
        let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
        if (acc.useEmail) {
          let recoCode = getSixDigit();
          let recoSalt = secStr();
          let recoHash = crypto.createHash('sha512').update(recoCode + recoSalt).digest('hex');
          let email = decrypt(acc.email,acc.mascot);
          let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'theleagueupdates@gmail.com',
              pass: 'Fz$6&rQ$P5YN@N*@H77#AyiEp&DtDop%'
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          let mailOptions = {
            from: 'theleagueupdates@gmail.com',
            to: email,
            subject: 'The League Account Recovery Code',
            text: `Your Code is: ${recoCode}. You have 2 minutes from the time you requested this code to enter it on the same device.`
          };
          updateTeam(acc.abbr,['tempSalt','tempHash','recoSalt','recoHash'],[tempSalt,tempHash,recoSalt,recoHash]).then(() => {
            transporter.sendMail(mailOptions, function(error, info){
              if (error) {
                console.log(error);
                let res2 = {method:'error',type:result.method,mess:'An error occurred'};
                ws.send(JSON.stringify(res2));
                return;
              } else {
                console.log('Email sent: ' + info.response);
                let res = {method:'promptCode',temp:temp};
                res.mess = `Check your email (${starEmail(email)}) for your verification code`;
                ws.send(JSON.stringify(res));
              }
            });
          });
        } else if (acc.useFact) {
          updateTeam(acc.abbr,['tempSalt','tempHash'],[tempSalt,tempHash]).then(() => {
            let res = {method:'promptCode',temp:temp};
            res.mess = 'Use your 2FA app to get the recovery code';
            ws.send(JSON.stringify(res));
          });
        } else {
          let res = {method:'promptCode',temp:temp};
          res.mess = 'You have not set up an account recovery system';
          res.able = false;
          ws.send(JSON.stringify(res));
        }
      });
    } else if (result.method == 'checkRecoCode') {
      teams.getTeamFromMascot(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (crypto.createHash('sha512').update(result.temp + acc.tempSalt).digest('hex') != acc.tempHash) {
          let res = {method:'error',type:'505'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (acc.useEmail) {
          if (crypto.createHash('sha512').update(result.code + acc.recoSalt).digest('hex') != acc.recoHash) {
            let res = {method:'error',type:result.method,mess:'Incorrect Code'};
            ws.send(JSON.stringify(res));
            return;
          }
        } else if (acc.useFact) {
          let secret = decrypt(acc.twoFactor,acc.mascot);
          let verified = speakeasy.totp.verify({secret:secret,encoding:'base32',token:result.code});
          console.log('veri',verified);
          if (!verified) {
            let res = {method:'error',type:result.method,mess:'Incorrect Code'};
            ws.send(JSON.stringify(res));
            return;
          }
        } else {
          let res = {method:'error',type:result.method,mess:'No account recovery set up'};
          ws.send(JSON.stringify(res));
          return;
        }
        let temp = secStr();
        let tempSalt = secStr();
        let tempHash = crypto.createHash('sha512').update(temp + tempSalt).digest('hex');
        updateTeam(acc.abbr,['tempSalt','tempHash','recoSalt','recoHash'],[tempSalt,tempHash,null,null]).then(() => {
          let res = {method:'activated',temp:temp,username:result.username};
          ws.send(JSON.stringify(res));
        });
      });
    } else if (result.method == 'activateFromFlex') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        players.getAllPlayers().then(list => {
          if (clubs.getTeamIndex(team.abbr) != players.getPlayerFromNumAndList(result.num,list).team) {
            let res = {method:'error',type:result.method,mess:'Player is not yours'};
            ws.send(JSON.stringify(res));
            return;
          }
          let roster = getFullRoster(list,JSON.parse(team.roster));
          let actPlayer = {};
          for (let p in roster) {
            if (roster[p].num == result.num) {
              actPlayer = roster[p];
              break;
            }
          }
          let deactPlayer = roster[actPlayer.pos.toLowerCase()];
          let conv = {qb:0,rb:1,wr:2,te:3,de:4,lb:5,cb:6,s:7,k:8,p:9};
          let fullRoster = JSON.parse(team.roster);
          if (actPlayer.pos != deactPlayer.pos) {
            let res = {method:'error',type:result.method,mess:'An Error Occurred'};
            ws.send(JSON.stringify(res));
            return;
          }
          for (let i in fullRoster) {
            if (fullRoster[i] == actPlayer.id) {
              fullRoster[i] = deactPlayer.id;
              break;
            }
          }
          fullRoster[conv[actPlayer.pos.toLowerCase()]] = actPlayer.id;
          let newRoster = getFullRoster(list,fullRoster);
          console.log(newRoster);
          updateTeam(team.abbr,['roster'],[fullRoster]).then(() => {
            let str = `The ${team.mascot} have activated ${actPlayer.pos} ${actPlayer.fName} ${actPlayer.lName} over ${deactPlayer.pos} ${deactPlayer.fName} ${deactPlayer.lName}`;
            newStory(str);
            let res = {method:'activatedFromFlex',roster:newRoster};
            ws.send(JSON.stringify(res));
          });
        });
      });
    } else if (result.method == 'releaseFromFlex') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        players.getAllPlayers().then(list => {
          if (clubs.getTeamIndex(team.abbr) != players.getPlayerFromNumAndList(result.num,list).team) {
            let res = {method:'error',type:result.method,mess:'Player is not yours'};
            ws.send(JSON.stringify(res));
            return;
          }
          let roster = getFullRoster(list,JSON.parse(team.roster));
          let relPlayer = {};
          for (let p in roster) {
            if (roster[p].id == result.num) {
              relPlayer = roster[p];
              break;
            }
          }
          let rosterList = JSON.parse(team.roster);
          let index = -1;
          for (let i = 10; i < 13; i++) {
            if (rosterList[i] == relPlayer.id) {
              rosterList[i] = undefined;
              index = i;
              break;
            }
          }
          if (index <= 10) {
            rosterList[10] = rosterList[11];
          }
          if (index <= 11) {
            rosterList[11] = rosterList[12];
          }
          if (index <= 12) {
            rosterList[12] = undefined;
          }
          for (let x in rosterList) {
            if (rosterList[x] == null) {
              rosterList[x] = undefined;
            }
          }
          updateTeam(team.abbr,['roster'],[rosterList]).then(() => {
            let str = `The ${team.mascot} have released ${relPlayer.pos} ${relPlayer.fName} ${relPlayer.lName}`;
            newStory(str);
            let res = {method:'releasedFromFlex',roster:getFullRoster(list,rosterList),open:true};
            ws.send(JSON.stringify(res));
            updatePlayer(relPlayer.id,['team'],[-2]).then(() => {
              setTimeout(() => {
                let stx = `${relPlayer.pos} ${relPlayer.fName} ${relPlayer.lName} is available in free agency`;
                newStory(stx);
                updatePlayer(relPlayer.id,['team'],[-1]);
              },untilNextNoon());
            });
          });
        });
      });
    } else if (result.method == 'claimFromAgency') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The free agency deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        players.getAllPlayers().then(list => {
          let claimedPlayer = players.getPlayerFromNumAndList(result.num,list);
          if (!claimedPlayer) {
            let res = {method:'error',type:result.method,mess:'Player is not available'};
            ws.send(JSON.stringify(res));
            return;
          }
          console.log(claimedPlayer);
          if (claimedPlayer.team != -1) {
            let res = {method:'error',type:result.method,mess:'Player is not available'};
            ws.send(JSON.stringify(res));
            return;
          }
          let rosterList = JSON.parse(team.roster);
          let firstIndex = -1;
          for (let i = 10; i < 13; i++) {
            if (!rosterList[i]) {
              firstIndex = i;
              break;
            }
          }
          if (firstIndex == -1) {
            let res = {method:'error',type:result.method,mess:'You have no open flex spots'};
            ws.send(JSON.stringify(res));
            return;
          }
          rosterList[firstIndex] = result.num;
          let openSlots = true;
          if (firstIndex == 12) {
            openSlots = false;
          }
          updateTeam(team.abbr,['roster'],[rosterList]).then(() => {
            updatePlayer(claimedPlayer.id,['team'],[clubs.getTeamIndex(team.abbr)]).then(() => {
              let str = `The ${team.mascot} have claimed ${claimedPlayer.pos} ${claimedPlayer.fName} ${claimedPlayer.lName} from free agency`;
              newStory(str);
              let res = {method:'claimedFromAgency',roster:getFullRoster(list,rosterList),open:openSlots,num:claimedPlayer.num};
              ws.send(JSON.stringify(res));
            });
          });
        });
      });
    } else if (result.method == 'proposeTrade') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The trade deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      if (result.toPlayers.length != result.fromPlayers.length) {
        let res = {method:'error',type:result.method,mess:'Unbalanced trade'};
        ws.send(JSON.stringify(res));
        return;
      }
      if (result.toPlayers.length == 0 || result.fromPlayers.length == 0) {
        let res = {method:'error',type:result.method,mess:'No players being traded'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        teams.getTeamFromAbbr(result.to).then(partner => {
          let fromRoster = JSON.parse(team.roster);
          let toRoster = JSON.parse(partner.roster);
          let valid = true;
          for (let num of result.fromPlayers) {
            if (!fromRoster.includes(num)) {
              valid = false;
              return;
            }
          }
          for (let num of result.toPlayers) {
            if (!toRoster.includes(num)) {
              valid = false;
              return;
            }
          }
          if (!valid) {
            let res = {method:'error',type:result.method,mess:'One or more players cannot be traded'};
            ws.send(JSON.stringify(res));
            return;
          }
          players.getAllPlayers().then(list => {
            let fromPlayers = [];
            let toPlayers = [];
            for (let num of result.fromPlayers) {
              let player = players.getPlayerFromNumAndList(num,list);
              fromPlayers.push({num:num,fName:player.fName,lName:player.lName,pos:player.pos});
            }
            for (let num of result.toPlayers) {
              let player = players.getPlayerFromNumAndList(num,list);
              toPlayers.push({num:num,fName:player.fName,lName:player.lName,pos:player.pos});
            }
            let newTrade = {from:result.from,to:result.to,fromPlayers:fromPlayers,toPlayers:toPlayers,status:'proposed',fromMascot:team.mascot,toMascot:partner.mascot};
            let now = new Date();
            newTrade.stamp = now.toISOString();
            console.log(newTrade);
            if (result.counter == true) {
              let counteredTrade = trades[result.id];
              if (counteredTrade.to != team.abbr) {
                let res = {method:'error',type:result.method,mess:'You cannot counter this trade'};
                ws.send(JSON.stringify(res));
                return;
              }
              counteredTrade.status = 'countered';
              let res2 = {method:'updateTrade',newStatus:'countered',id:result.id};
              ws.send(JSON.stringify(res2));
              if (teamCxns[counteredTrade.from]) {
                for (let cxn of teamCxns[counteredTrade.from]) {
                  cxn.send(JSON.stringify(res2));
                }
              }
              newTrade.status = 'counterproposal';
            }
            let d = new Date();
            // newTrade.month = monthFromNum(d.getMonth());
            // let t = d.getDate();
            // if (t < 10) {
            //   newTrade.date = `0${t}`;
            // } else {
            //   newTrade.date = String(t);
            // }
            // newTrade.fromMascot = team.mascot;
            // newTrade.toMascot = partner.mascot;
            // newTrade.year = d.getFullYear();
            // newTrade.time = getTimestamp(d.getHours(),d.getMinutes());
            newTrade.unix = d.getTime();
            let id = guid(trades);
            trades[id] = newTrade;
            newTrade.id = id;
            newTrade.toHide = false;
            newTrade.fromHide = false;
            console.log('ALL GOOD');
            let res = {method:'proposedTrade',trade:newTrade};
            ws.send(JSON.stringify(res));
            if (teamCxns[result.to]) {
              for (let cxn of teamCxns[result.to]) {
                cxn.send(JSON.stringify(res));
              }
            }
          });
        });
      });
    } else if (result.method == 'connectAsTeam') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          return;
        }
        if (!teamCxns[team.abbr]) {
          teamCxns[team.abbr] = [];
        }
        teamCxns[team.abbr] = teamCxns[team.abbr].filter(function (el) {return el != null; });
        teamCxns[team.abbr].push(ws);
      });
    } else if (result.method == 'connectToDraft') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          team = {};
          team.abbr = 'XXX';
        }
        if (!draftCxns[team.abbr]) {
          draftCxns[team.abbr] = [];
        }
        draftCxns[team.abbr] = draftCxns[team.abbr].filter(function (el) {return el != null; });
        draftCxns[team.abbr].push(ws);
      });
    } else if (result.method == 'connectToUpdates') {
      updateCxns.push(ws);
      let mess = {method:'init',poss:fieldGame.off,los:fieldGame.los,down:fieldGame.down,toGo:fieldGame.toGo,q:fieldGame.q,t:fieldGame.t};
      mess.away = fieldGame.away;
      mess.home = fieldGame.home;
      mess.awayScore = fieldGame.awayScore;
      mess.homeScore = fieldGame.homeScore;
      mess.awaySbq = fieldGame.awaySbq;
      mess.homeSbq = fieldGame.homeSbq;
      mess.updates = fieldGame.updates;
      mess.awayStats = {off:fieldGame.awayOffStats,def:fieldGame.awayDefStats};
      mess.homeStats = {off:fieldGame.homeOffStats,def:fieldGame.homeDefStats};
      mess.awayPlayers = {};
      mess.homePlayers = {};
      let attrs = ['td','fName','lName','pos','team','stats'];
      for (let pos in fieldGame.awayPlayers) {
        if (pos.indexOf('flx') != -1) {
          continue;
        }
        mess.awayPlayers[pos] = {};
        for (let attr of attrs) {
          mess.awayPlayers[pos][attr] = fieldGame.awayPlayers[pos][attr];
        }
      }
      for (let pos in fieldGame.homePlayers) {
        if (pos.indexOf('flx') != -1) {
          continue;
        }
        mess.homePlayers[pos] = {};
        for (let attr of attrs) {
          mess.homePlayers[pos][attr] = fieldGame.homePlayers[pos][attr];
        }
      }
      ws.send(JSON.stringify(mess));
    } else if (result.method == 'retractTrade') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The trade deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let trade = trades[result.id];
        if (!trade) {
          let res = {method:'error',type:result.method,mess:'Trade not found'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status == 'accepted') {
          let res = {method:'error',type:result.method,mess:'Trade has already been accepted'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status == 'declined') {
          let res = {method:'error',type:result.method,mess:'Trade has already been rejected'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.from != team.abbr) {
          let res = {method:'error',type:result.method,mess:'You cannot retract this trade'};
          ws.send(JSON.stringify(res));
          return;
        }
        trade.stats = 'retracted';
        let res = {method:'updateTrade',newStatus:'retracted',id:result.id};
        ws.send(JSON.stringify(res));
        if (teamCxns[trade.to]) {
          for (let cxn of teamCxns[trade.to]) {
            cxn.send(JSON.stringify(res));
          }
        }
      });
    } else if (result.method == 'declineTrade') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The trade deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let trade = trades[result.id];
        if (!trade) {
          let res = {method:'error',type:result.method,mess:'Trade not found'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status == 'accepted') {
          let res = {method:'error',type:result.method,mess:'Trade has already been accepted'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status == 'retracted') {
          let res = {method:'error',type:result.method,mess:'Trade has already been retracted'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.to != team.abbr) {
          let res = {method:'error',type:result.method,mess:'You cannot deline this trade'};
          ws.send(JSON.stringify(res));
          return;
        }
        let res = {method:'updateTrade',newStatus:'declined',id:result.id};
        trade.status = 'declined';
        ws.send(JSON.stringify(res));
        if (teamCxns[trade.from]) {
          for (let cxn of teamCxns[trade.from]) {
            cxn.send(JSON.stringify(res));
          }
        }
      });
    } else if (result.method == 'counterTrade') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The trade deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let trade = trades[result.id];
        if (!trade) {
          let res = {method:'error',type:result.method,mess:'Trade not found'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status == 'retracted') {
          let res = {method:'error',type:result.method,mess:'Trade has already been retracted'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.to != team.abbr) {
          let res = {method:'error',type:result.method,mess:'You cannot counter this trade'};
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'hideTrade') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let trade = trades[result.id];
        if (!trade) {
          let res = {method:'error',type:result.method,mess:'Trade not found'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.to == team.abbr) {
          trade.toHide = true;
        }
        if (trade.from == team.abbr) {
          trade.fromHide = true;
        }
        let res = {method:'hiddenTrade',id:result.id};
        ws.send(JSON.stringify(res));
      });
    } else if (result.method == 'acceptTrade') {
      if (!canMakeTrade()) {
        let res = {method:'error',type:result.method,mess:'The trade deadline has passed'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let trade = trades[result.id];
        if (!trade) {
          let res = {method:'error',type:result.method,mess:'Trade not found'};
          ws.send(JSON.stringify(res));
          return;
        }
        if (trade.status != 'proposed' && trade.status != 'counterProposal') {
          let res = {method:'error',type:result.method,mess:'Trade cannot be accepted'};
          ws.send(JSON.stringify(res));
          return;
        }
        teams.getTeamFromAbbr(trade.from).then(partner => {
          games.getWeek(getCurrentWeek()).then(sch => {
            for (let game of sch) {
              if ((game.away == team.abbr || game.home == team.abbr || game.away == partner.abbr || game.home == partner.abbr) && game.status == 'ongoing') {
                let res = {method:'error',type:result.method,mess:'One or more teams is playing right now'};
                ws.send(JSON.stringify(res));
                return;
              }
            }
            let toRoster = JSON.parse(team.roster);
            let fromRoster = JSON.parse(partner.roster);
            let toIndex = clubs.getTeamIndex(trade.to);
            let fromIndex = clubs.getTeamIndex(trade.from);
            players.getAllPlayers().then(list => {
              let valid = true;
              for (let player of trade.toPlayers) {
                let num = player.num;
                if (!toRoster.includes(num) || players.getPlayerFromNumAndList(num,list).team != toIndex) {
                  valid = false;
                  break;
                }
              }
              for (let player of trade.fromPlayers) {
                let num = player.num;
                if (!fromRoster.includes(num) || players.getPlayerFromNumAndList(num,list).team != fromIndex) {
                  valid = false;
                  break;
                }
              }
              if (!valid) {
                let res = {method:'error',type:result.method,mess:'One or more players have changed teams'};
                ws.send(JSON.stringify(res));
                return;
              }
              let ids = [];
              let attrs = [];
              let vals = [];
              for (let i = 0; i < trade.toPlayers.length; i++) {
                let toPlayer = trade.toPlayers[i].num;
                let fromPlayer = trade.fromPlayers[i].num;
                let toPos = -1;
                let fromPos = -1;
                for (let j = 0; j < toRoster.length; j++) {
                  if (toRoster[j] == toPlayer) {
                    toPos = j;
                    break;
                  }
                }
                for (let j = 0; j < fromRoster.length; j++) {
                  if (fromRoster[j] == fromPlayer) {
                    fromPos = j;
                    break;
                  }
                }
                if (toPos == -1 || fromPos == -1) {
                  console.log('someone not found');
                  continue;
                }
                toRoster[toPos] = fromPlayer;
                fromRoster[fromPos] = toPlayer;
                ids.push(fromPlayer);
                attrs.push('team');
                vals.push(clubs.getTeamIndex(trade.to));
                ids.push(toPlayer);
                attrs.push('team');
                vals.push(clubs.getTeamIndex(trade.from));
              }
              setTeamsSql([trade.to,trade.from],['roster','roster'],[toRoster,fromRoster]).then(() => {
                setPlayersSql(ids,attrs,vals).then(() => {
                  let tp = [];
                  for (let player of trade.toPlayers) {
                    tp.push(players.getPlayerFromNumAndList(player.num,list));
                  }
                  let fp = [];
                  for (let player of trade.fromPlayers) {
                    fp.push(players.getPlayerFromNumAndList(player.num,list));
                  }
                  let first = tp[0];
                  let str = `The ${team.mascot} have traded ${first.pos} ${first.fName} ${first.lName}`;
                  for (let i = 1; i < tp.length; i++) {
                    str += `,${tp[i].pos} ${tp[i].fName} ${tp[i].lName}`;
                  }
                  let one = fp[0];
                  str += ` to the ${partner.mascot} for ${one.pos} ${one.fName} ${one.lName}`
                  for (let i = 1; i < fp.length; i++) {
                    str += `,${fp[i].pos} ${fp[i].fName} ${fp[i].lName}`;
                  }
                  newStory(str);
                  let res = {method:'acceptedTrade',roster:getFullRoster(list,toRoster)};
                  ws.send(JSON.stringify(res));
                  res.mess = `Your trade to the ${team.mascot} has been accepted`;
                  res.roster = getFullRoster(list,fromRoster);
                  if (teamCxns[trade.from]) {
                    for (let cxn of teamCxns[trade.from]) {
                      cxn.send(JSON.stringify(res));
                    }
                  }
                  let res2 = {method:'updateTrade',newStatus:'accepted',id:result.id};
                  trade.status = 'accepted';
                  ws.send(JSON.stringify(res2));
                  if (teamCxns[trade.from]) {
                    for (let cxn of teamCxns[trade.from]) {
                      cxn.send(JSON.stringify(res2));
                    }
                  }
                });
              });
            });
          });
        }); //
      });
    } else if (result.method == 'getBoard') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (draftFinished) {
          let res = {method:'error',type:result.method,mess:'You cannot do that now'};
          ws.send(JSON.stringify(res));
          return;
        }
        players.getAllPlayers().then(list => {
          let board = [];
          for (let num of result.board) {
            for (let player of list) {
              if (player.id == num) {
                board.push(player);
                break;
              }
            }
          }
          let res = {method:'gottenBoard',board:board};
          ws.send(JSON.stringify(res));
        });
      });
    } else if (result.method == 'draftPlayer') {
      let dd = new Date(draftStart);
      let dn = new Date();
      if (dn.getTime() < dd.getTime()) {
        let res = {method:'error',type:result.method,mess:'You cannot draft a player until the draft has started'};
        ws.send(JSON.stringify(res));
        return;
      }
      if (!canPick) {
        let res = {method:'error',type:result.method,mess:'You cannot pick now'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let roster = JSON.parse(team.roster);
        if (roster[Number(result.id.substring(0,1))]) {
          let res = {method:'error',type:result.method,mess:'You have already drafted this position'};
          ws.send(JSON.stringify(res));
          return;
        }
        draft.getWholeDraft().then(picks => {
          if (picks[currentPick] != clubs.getTeamIndex(team.abbr)) {
            let res = {method:'error',type:result.method,mess:'It is not your pick'};
            ws.send(JSON.stringify(res));
            return;
          }
          players.getPlayerFromNum(result.id).then(player => {
            if (player.team != -1) {
              let res = {method:'error',type:result.method,mess:'This player has already been drafted'};
              ws.send(JSON.stringify(res));
              return;
            }
            draftPlayer(team,roster,player,picks,false);
          });
        });
      });
    } else if (result.method == 'gottenBoard') {
      teams.getAccountFromToken(result.token).then(team => {
        draft.getWholeDraft().then(picks => {
          if (!team) {
            let res = {method:'error',type:'505'}; //leave
            ws.send(JSON.stringify(res));
            return;
          }
          if (team.abbr != clubs.getTeamFromIndex(picks[currentPick]).abbr) {
            let res = {method:'error',type:result.method,mess:'It is not your turn'};
            ws.send(JSON.stringify(res));
            return;
          }
          players.getFreeAgents().then(agents => {
            let roster = JSON.parse(team.roster);
            let positions = ['qb','rb','wr','te','de','lb','cb','s','k','p'];
            let potAgents = [];
            for (let i = 0; i < 10; i++) {
              if (!roster[i]) {
                potAgents = potAgents.concat(agents[positions[i]]);
              }
            }
            let idList = [];
            for (let player of potAgents) {
              idList.push(player.id);
            }
            let boardPlayer;
            for (let id of result.board) {
              if (idList.includes(id)) {
                let found = false;
                for (let agent of agents[positions[Number(id.substring(0,1))]]) {
                  if (agent.id == id) {
                    boardPlayer = agent;
                    found = true;
                    break;
                  }
                }
                if (found) {
                  break;
                }
              }
            }
            draftPlayer(team,roster,boardPlayer,picks,false);
          });
        });
      });
    } else if (result.method == 'changePlayCalls') {
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        games.getWeek(getCurrentWeek()).then(sch => {
          for (let game of sch) {
            if ((game.away == team.abbr || game.home == team.abbr) && game.status == 'ongoing') {
              let res = {method:'error',type:result.method,mess:'You cannot change play calls during a game'};
              ws.send(JSON.stringify(res));
              return;
            }
          }
          var plays = ['passEarly','passLate','wrEarly','wrLate','deRushEarly','deRushLate','lbRushEarly','lbRushLate'];
          for (let call of result.calls) {
            if (call < 0) {
              call = 0;
            } else if (call > 1) {
              call = 1;
            }
          }
          updateTeam(team.abbr,plays,result.calls).then(() => {
            let res = {method:'changedPlayCalls',calls:result.calls,i:result.i};
            ws.send(JSON.stringify(res));
          });
        });
      });
    } else if (result.method == 'proposeDraftTrade') {
      let dd = new Date(draftOpen);
      let dn = new Date();
      if (dn.getTime() < dd.getTime()) {
        let res = {method:'error',type:result.method,mess:'You cannot propose a trade until 4:00P on draft day'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let arr = [team.abbr,result.partner];
        arr.sort();
        if (tradesDone[arr[0] + arr[1]]) {
          if (tradesDone[arr[0] + arr[1]] >= 2) {
            let res = {method:'error',type:result.method,mess:'You have reached the maximum number of trades with this team'};
            ws.send(JSON.stringify(res));
            return;
          } else {
            tradesDone[arr[0] + arr[1]]++;
          }
        } else {
          tradesDone[arr[0] + arr[1]] = 0;
        }
        draft.getWholeDraft().then(picks => {
          //console.log(picks);
          let from = [];
          let to = [];
          //console.log(result.from,result.to);
          for (let pick of result.from) {
            if (pick != 'Select Pick') {
              from.push(Number(pick) - 1);
            }
          }
          for (let pick of result.to) {
            if (pick != 'Select Pick') {
              to.push(Number(pick) - 1);
            }
          }
          let fromIndex = clubs.getTeamIndex(team.abbr);
          let toIndex = clubs.getTeamIndex(result.partner);
          for (let pick of from) {
            if (picks[pick] != fromIndex) {
              let res = {method:'error',type:result.method,mess:'One of more picks does not belong to that team'};
              ws.send(JSON.stringify(res));
              return;
            }
          }
          for (let pick of to) {
            if (picks[pick] != toIndex) {
              let res = {method:'error',type:result.method,mess:'One of more picks does not belong to that team'};
              ws.send(JSON.stringify(res));
              return;
            }
          }
          let trade = {from:team.abbr,to:result.partner,fromPicks:from,toPicks:to,status:'Proposed',id:secStr()};
          draftTrades.push(trade);
          trade.method = 'proposedDraftTrade';
          if (draftCxns[team.abbr]) {
            for (let cxn of draftCxns[team.abbr]) {
              cxn.send(JSON.stringify(trade));
            }
          }
          if (draftCxns[result.partner]) {
            for (let cxn of draftCxns[result.partner]) {
              cxn.send(JSON.stringify(trade));
            }
          }
        });
      });
    } else if (result.method == 'negateDraftTrade') {
      let trade;
      for (let t of draftTrades) {
        if (t.id == result.id) {
          trade = t;
          break;
        }
      }
      if (!trade) {
        return;
      }
      trade.status = 'negated';
      let res = {method:'negatedDraftTrade',id:result.id};
      if (draftCxns[trade.to]) {
        for (let cxn of draftCxns[trade.to]) {
          cxn.send(JSON.stringify(res));
        }
      }
      if (draftCxns[trade.from]) {
        for (let cxn of draftCxns[trade.from]) {
          cxn.send(JSON.stringify(res));
        }
      }
    } else if (result.method == 'acceptDraftTrade') {
      let dd = new Date(draftOpen);
      let dn = new Date();
      if (dn.getTime() < dd.getTime()) {
        let res = {method:'error',type:result.method,mess:'You cannot propose a trade until 4:00P on draft day'};
        ws.send(JSON.stringify(res));
        return;
      }
      let trade;
      for (let t of draftTrades) {
        if (t.id == result.id) {
          trade = t;
          break;
        }
      }
      if (!trade) {
        let res = {method:'error',type:result.method,mess:'Trade not found'};
        ws.send(JSON.stringify(res));
        return;
      }
      teams.getAccountFromToken(result.token).then(team => {
        if (!team) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (team.abbr != trade.to) {
          let res = {method:'error',type:result.method,mess:'You cannot accept this trade'};
          ws.send(JSON.stringify(res));
          return;
        }
        draft.getWholeDraft().then(picks => {
          let fromIndex = clubs.getTeamIndex(trade.from);
          let toIndex = clubs.getTeamIndex(trade.to);
          if (!fromIndex || !toIndex) {
            let res = {method:'error',type:result.method,mess:'Team not found'};
            ws.send(JSON.stringify(res));
            return;
          }
          let sql = '';
          let tradePicks = [];
          let fromPicks = [];
          let toPicks = [];
          let adj = [];
          for (let pick of trade.fromPicks) {
            if (pick == 'Select Pick') {
              continue;
            }
            picks[Number(pick) - 1] = toIndex;
            tradePicks.push(Number(pick));
            fromPicks.push(Number(pick));
            let x = getRoundAndPick(Number(pick) + 1);
            console.log(x);
            sql += `UPDATE draft SET pick${x.p - 1}=${toIndex} WHERE round=${x.r - 1};`;
            adj.push({pick:Number(pick),abbr:trade.to});
          }
          for (let pick of trade.toPicks) {
            if (pick == 'Select Pick') {
              continue;
            }
            picks[Number(pick) - 1] = fromIndex;
            tradePicks.push(Number(pick));
            toPicks.push(Number(pick));
            let x = getRoundAndPick(Number(pick) + 1);
            sql += `UPDATE draft SET pick${x.p - 1}=${fromIndex} WHERE round=${x.r - 1};`;
            adj.push({pick:Number(pick),abbr:trade.from});
          }
          for (let pick of tradePicks) {
            if (pick <= currentPick) {
              let res = {method:'error',type:result.method,mess:'One or more picks have already happened or are on the clock'};
              ws.send(JSON.stringify(res));
              return;
            }
          }
          console.log(sql);
          request(sql).then(() => {
            trade.status = 'accepted';
            let res = {method:'acceptedDraftTrade',id:result.id};
            if (draftCxns[trade.to]) {
              for (let cxn of draftCxns[trade.to]) {
                cxn.send(JSON.stringify(res));
              }
            }
            if (draftCxns[trade.from]) {
              for (let cxn of draftCxns[trade.from]) {
                cxn.send(JSON.stringify(res));
              }
            }
            let fromMascot = clubs.getTeamFromAbbr(trade.from).mascot;
            let toMascot = clubs.getTeamFromAbbr(trade.to).mascot;
            let u = {method:'picksSwapped',text:`The ${fromMascot} have traded picks with the ${toMascot}`,adj:adj};
            for (let a in draftCxns) {
              if (draftCxns[a]) {
                for (let cxn of draftCxns[a]) {
                  cxn.send(JSON.stringify(u));
                }
              }
            }
            let str = `The ${fromMascot} have traded the ${ordinal(fromPicks[0])}`;
            for (let i = 1; i < fromPicks.length; i++) {
              str += `,${ordinal(fromPicks[i])}`;
            }
            str += ` overall to the ${toMascot} for the ${ordinal(toPicks[0])}`;
            for (let i = 1; i < toPicks.length; i++) {
              str += `,${ordinal(toPicks[i])}`;
            }
            str += ' overall';
            newStory(str);
          });
        });
      });
    } else if (result.method == 'createUser') {
      let cusses = ['ass','bitch','shit','cock','crap','cunt','fuck','nigga','nigger','piss','slut','dick','arse','tit','pussy'];
      for (let cuss of cusses) {
        if (result.username.toLowerCase().replace(/\s/g,'').indexOf(cuss) != -1) {
          let res = {method:'error',type:result.method,mess:'Invalid username'};
          ws.send(JSON.stringify(res));
          return;
        }
      }
      if (result.username.length >= 20) {
        let res = {method:'error',type:result.method,mess:'Username cannot exceed 20 characters'};
        ws.send(JSON.stringify(res));
        return;
      }
      users.getAllUsers().then(list => {
        if (list.length >= 500) {
          let res = {method:'error',type:result.method,mess:'Max number of players has been reached'};
          ws.send(JSON.stringify(res));
          return;
        }
        for (let user of list) {
          if (user.username.toLowerCase().replace(/\s/g,'') == result.username.toLowerCase().replace(/\s/g,'')) {
            let res = {method:'error',type:result.method,mess:'Username already taken'};
            ws.send(JSON.stringify(res));
            return;
          }
        }
        let salt = secStr();
        let hash = crypto.createHash('sha512').update(result.password + salt).digest('hex');
        let sql = 'INSERT INTO users (username,balance,hash,salt,tokenHash,tokenSalt) VALUES ';
        let token = secStr();
        let tokenSalt = secStr();
        let tokenHash = crypto.createHash('sha512').update(token + tokenSalt).digest('hex');
        sql += `(${con.escape(result.username)},1000000,${con.escape(hash)},${con.escape(salt)},'["${tokenHash}"]','["${tokenSalt}"]')`;
        request(sql).then(() => {
          ws.send(JSON.stringify({method:'signedIn',token:token}));
        });
      });
    } else if (result.method == 'userSignOut') {
      console.log('c');
      users.deleteToken(result.token).then(() => {
        let res = {method:'error',type:'505'}; //leave
        ws.send(JSON.stringify(res));
        return;
      });
    } else if (result.method == 'signUserIn') {
      users.getUserFromName(result.username).then(acc => {
        if (!acc) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        let hash = crypto.createHash('sha512').update(result.password + acc.salt).digest('hex');
        if (hash == acc.hash) {
          let salt = secStr();
          let allSalts = JSON.parse(acc.tokenSalt);
          let allHashes = JSON.parse(acc.tokenHash);
          allSalts.push(salt);
          let token = secStr();
          let newHash = crypto.createHash('sha512').update(token + salt).digest('hex');
          allHashes.push(newHash);
          let sql = `UPDATE users SET tokenSalt='${JSON.stringify(allSalts)}',tokenHash='${JSON.stringify(allHashes)}' WHERE username=${con.escape(acc.username)}`;
          //console.log(sql);
          request(sql).then(() => {
            let mess = {method:'signedIn',token:token};
            ws.send(JSON.stringify(mess));
          });
        } else {
          let res = {method:'error',type:result.method,mess:'Incorrect username or password'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
      });
    } else if (result.method == 'makeBet') {
      let arr;
      if (result.cat == 'win') {
        arr = weekWinBets;
      } else if (result.cat == 'cover') {
        arr = weekOverBets;
      }
      if (!arr) {
        return;
      }
      for (let bet of arr) {
        if (bet.away == result.away && bet.home == result.home) {
          if (bet.started == true || bet.resolved == true) {
            let res = {method:'error',type:result.method,mess:'This game has already started or has finished'};
            ws.send(JSON.stringify(res));
            return;
          }
          break;
        }
      }
      users.getAccountFromToken(result.token).then(user => {
        if (!user) {
          let res = {method:'error',type:'505'}; //leave
          ws.send(JSON.stringify(res));
          return;
        }
        if (user.balance < getBetCost()) {
          let res = {method:'error',type:result.method,mess:'You do not have enough money to bet on this game'};
          ws.send(JSON.stringify(res));
          return;
        }
        for (let bet of bets) {
          if (bet.name == user.username && bet.away == result.away && bet.home == result.home && bet.cat == result.cat) {
            let res = {method:'error',type:result.method,mess:'You have already bet on this game'};
            ws.send(JSON.stringify(res));
            return;
          }
        }
        //console.log({name:user.username,amount:getBetCost(),type:result.type,away:result.away,home:result.home,cat:result.cat});
        console.log('bet made');
        let valid = false;
        let res = {method:'madeBet',away:result.away,home:result.home,amount:getBetCost()};
        if (result.type == 'away' || result.type == 'home') {
          for (let bet of weekWinBets) {
            if (bet.away == result.away && bet.home == result.home) {
              bet[`${result.type}Coins`] += getBetCost();
              valid = true;
              console.log(bet);
            }
          }
          res.index = 0;
        } else {
          for (let bet of weekOverBets) {
            if (bet.away == result.away && bet.home == result.home) {
              bet[`${result.type}`] += getBetCost();
              valid = true;
              console.log(bet);
            }
          }
          res.index = 1;
        }
        if (!valid) {
          let res = {method:'error',type:result.method,mess:'That bet is not valid'};
          ws.send(JSON.stringify(res));
          return;
        }
        bets.push({name:user.username,amount:getBetCost(),type:result.type,away:result.away,home:result.home,cat:result.cat});
        if (result.type == 'away' || result.type == 'over') {
          res.opt = 0;
        } else {
          res.opt = 1;
        }
        ws.send(JSON.stringify(res));
        request(`UPDATE users SET balance=${user.balance - getBetCost()} WHERE username=${con.escape(user.username)}`);
      });
    }
  });
});

//request

function draftPlayer(team,roster,player,picks,comp) {
  if (typeof roster == 'string') {
    throw 'Roster is a string'
  }
  if (!player) {
    return;
  }
  roster[Number(player.id.substring(0,1))] = player.id;
  sqlDraft(team.abbr,roster,player.id).then(() => {
    draftedPlayers.push(player);
    //currentPick++;
    canPick = false;
    draftResolved = true;
    let nextIndex = picks[currentPick + 1];
    let next;
    if (currentPick + 1 < 400) {
      next = clubs.getTeamFromIndex(nextIndex);
    } else {
      next = {abbr:'LEA',mascot:'league'};
    }
    let nextRows = [];
    let nextPicks = [];
    for (let i = 0; i < picks.length; i++) {
      if (picks[i] == nextIndex) {
        nextPicks.push(i);
      }
    }
    nextPicks = nextPicks.reverse();
    for (let pick of nextPicks) {
      if (draftedPlayers[pick] && nextRows.length < 3) {
        let p = draftedPlayers[pick];
        nextRows.push(`Drafted ${p.fName} ${p.lName} (${p.pos}) <span class="num">#${p.id}</span>`);
      }
    }
    nextPicks = nextPicks.reverse();
    let lim = 0;
    while (nextRows.length < 3 && lim < 1000) {
      if (getRoundAndPick(nextPicks[lim] + 1).r >= getRoundAndPick(currentPick + 1).r) {
        let p = getRoundAndPick(nextPicks[lim] + 1);
        nextRows.push(`Has ${ordinal(p.p)} pick of ${ordinal(p.r)} round (${ordinal(nextPicks[lim] + 1)} overall)`);
      }
      lim++;
    }
    let ann = {method:'draftedPlayer',team:team.abbr,player:player,next:next.abbr,computer:comp};
    ann.pick = currentPick + 1;
    if (currentPick + 21 >= 400) {
      ann.inTwenty == 'LEA';
    } else {
      ann.inTwenty = clubs.getTeamFromIndex(picks[currentPick + 21]).abbr;
    }
    ann.timer = getDraftTimer(currentPick + 1);
    ann.nextRows = nextRows;
    for (let a in draftCxns) {
      for (let cxn of draftCxns[a]) {
        cxn.send(JSON.stringify(ann));
      }
    }
    setTimeout(() => {
      advPick();
    },6000);
  });
}

function requestData(req,ws,res) {
  let data = {method:'requested',type:req.type,qual:req.qual,crit:req.crit};
  if (req.type == 'games' && req.qual == 'week') {
    games.getWeek(req.crit).then(list => {
      for (let game of list) {
        game.awayTeam = clubs.getTeamFromAbbr(game.away);
        game.homeTeam = clubs.getTeamFromAbbr(game.home);
        game.time = getTime(game.schedule);
        if (game.status == 'ongoing') {
          if (fieldGame.q < 5) {
            game.period = `${getPeriod(fieldGame.q)} ${toMins(fieldGame.t).m}:${toMins(fieldGame.t).s}`;
          } else {
            game.period = getPeriod(fieldGame.q);
          }
        }
      }
      list.sort(sortGame);
      data.data = list;
      sendData(data,ws,res);
    });
  } else if (req.type == 'games' && req.qual == 'team') {
    games.getTeamSchedule(req.crit).then(list => {
      for (let game of list) {
        game.awayTeam = clubs.getTeamFromAbbr(game.away);
        game.homeTeam = clubs.getTeamFromAbbr(game.home);
        game.time = getTime(game.schedule);
        if (game.status == 'ongoing') {
          if (fieldGame.q < 5) {
            game.period = `${getPeriod(fieldGame.q)} ${toMins(fieldGame.t).m}:${toMins(fieldGame.t).s}`;
          } else {
            game.period = getPeriod(fieldGame.q);
          }
        }
      }
      list.sort(sortGame);
      data.data = list;
      sendData(data,ws,res);
    });
  } else if (req.type == 'playoffOrder') {
    teams.getAllTeamsByConf(req.qual.toUpperCase()).then(conf => {
      games.getAllGames().then(sch => {
        for (let team of conf) {
          if (team.w + team.l + team.t != 0) {
            team.record = (team.w + team.t / 2) / (team.w + team.l + team.t);
          } else {
            team.record = 0.01;
          }
          if (team.dw + team.dl + team.dt != 0) {
            team.divRecord = (team.dw + team.dt / 2) / (team.dw + team.dl + team.dt);
          } else {
            team.divRecord = 0.01;
          }
        }
        conf.sort(teamCompare(sch));
        let divisions = [];
        let leaders = [];
        let leaderAbbrs = [];
        let playoffs = [];
        //order playoff teams
        for (let team of conf) {
          if (!divisions.includes(team.division)) {
            divisions.push(team.division);
            leaders.push(team);
            leaderAbbrs.push(team.abbr);
            playoffs.push(team);
            team.eliminated = false;
          }
        }
        for (let team of conf) {
          if (!leaderAbbrs.includes(team.abbr)) {
            playoffs.push(team);
            team.clinchedDiv = false;
          }
        }
        for (let i = 5; i < 8; i++) { //check elim
          playoffs[i].eliminated = false;
        }
        //check clinches/elims
        for (let leader of leaders) { //check div clinch
          let restOfDiv = [];
          for (let team of conf) {
            if (team.division == leader.division && team.abbr != leader.abbr) {
              restOfDiv.push(team);
            }
          }
          leader.clinchedDiv = checkClinch(leader,restOfDiv,sch);
          leader.clinched = checkClinch(leader,restOfDiv,sch);
        }
        let inTheHunt = [];
        for (let i = 8; i < 20; i++) { //check elim
          let huntTeam = playoffs[i];
          inTheHunt.push(huntTeam);
          let blockers = [];
          for (let leader of leaders) {
            if (huntTeam.division == leader.division) {
              blockers.push(leader);
              break;
            }
          }
          for (let j = 5; j < 8; j++) {
            blockers.push(playoffs[j]);
          }
          let eliminated = true;
          let arr = [huntTeam];
          for (let team of blockers) {
            if (checkClinch(team,arr,sch) == false) {
              eliminated = false;
              break;
            }
          }
          playoffs[i].eliminated = eliminated;
          playoffs[i].clinched = false;
        }
        for (let i = 0; i < 8; i++) { //check playoff clinch
          if (!conf[i].clinchedDiv) {
            conf[i].clinched = checkClinch(conf[i],inTheHunt);
          }
        }
        //send data
        let safeConf = [];
        for (let i = 0; i < playoffs.length; i++) {
          let team = playoffs[i];
          let obj = {};
          obj.abbr = team.abbr;
          obj.mascot = team.mascot;
          obj.clinched = team.clinched;
          obj.clinchedDiv = team.clinchedDiv;
          obj.eliminated = team.eliminated;
          obj.division = team.division;
          obj.w = team.w;
          obj.l = team.l;
          obj.t = team.t;
          obj.seed = i + 1;
          safeConf.push(obj);
        }
        data.data = safeConf;
        sendData(data,ws,res);
      });
    });
  } else if (req.type == 'players') {
    if (req.qual.toLowerCase() == 'all') {
      players.getAllPlayers().then(list => {
        data.data = list;
        sendData(data,ws,res);
      });
    } else if (req.qual.toLowerCase() == 'off') {
      teams.getAllTeams().then(list => {
        let exp = [];
        for (let team of list) {
          let obj = {};
          obj.abbr = team.abbr;
          obj.mascot = team.mascot;
          obj.offStats = team.offStats;
          obj.fName = team.mascot;
          obj.lName = 'Offense';
          exp.push(obj);
        }
        data.data = exp;
        sendData(data,ws,res);
      });
    } else if (req.qual.toLowerCase() == 'def') {
      teams.getAllTeams().then(list => {
        let exp = [];
        for (let team of list) {
          let obj = {};
          obj.abbr = team.abbr;
          obj.mascot = team.mascot;
          obj.defStats = team.defStats;
          obj.fName = team.mascot;
          obj.lName = 'Defense';
          exp.push(obj);
        }
        data.data = exp;
        sendData(data,ws,res);
      });
    } else {
      players.getPlayersByPos(req.qual.toUpperCase()).then(list => {
        for (let player of list) {
          if (player.team >= 0) {
            let team = clubs.getTeamFromIndex(player.team);
            player.teamAbbr = team.abbr;
            player.teamMascot = team.mascot;
          } else {
            player.teamAbbr = 'UFA';
            player.teamMascot = 'league';
          }
        }
        data.data = list;
        sendData(data,ws,res);
      });
    }
  } else if (req.type == 'roster') {
    players.getAllPlayers().then(list => {
      teams.getTeamFromAbbr(req.crit.toUpperCase()).then(team => {
        data.data = getFullRoster(list,JSON.parse(team.roster));
        sendData(data,ws,res);
      });
    });
  } else if (req.type == 'draftOrder') {
    draft.getWholeDraft().then(picks => {
      let club = [];
      for (let pick of picks) {
        club.push(clubs.getTeamFromIndex(pick));
      }
      let format = [];
      for (let i = 0; i < 10; i++) {
        format[i] = [];
      }
      for (let i = 0; i < club.length; i++) {
        format[Math.floor(i / 40)][i % 40] = club[i];
      }
      data.data = format;
      sendData(data,ws,res);
    });
  }
}

function sendData(data,ws,res) {
  if (ws) {
    ws.send(JSON.stringify(data));
  } else if (res) {
    console.log('JSON req');
    res.json(data);
  }
}

//resources

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
}

function newStory(str) {
  let story = {text:str};
  let d = new Date();
  story.time = d.getTime();
  //story.stamp = `${dayFromNum(d.getDay())} ${d.getDate()} ${monthFromNum(d.getMonth())} ${getTime(d.getTime())}`;
  stories.push(story);
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

function getPeriod(num) {
  if (num == undefined) {
    return 'ERR';
  }
  if (num < 5) {
    return ordinal(num).toUpperCase();
  } else if (num == 5) {
    return 'OT';
  } else {
    return `${num - 4}OT`;
  }
}

function getRoundAndPick(num) {
  if (num % 40 == 0) {
    return {
      r: Math.floor(num / 40),
      p: 40
    }
  }
  return {
    r: Math.floor(num / 40) + 1,
    p: num % 40
  }
}

function getDraftTimer(x) {
  if (x < 40) {
    return 30;
  } else if (x < 120) {
    return 25;
  } else if (x < 320) {
    return 20;
  } else {
    return 15;
  }
}

function getHeadlines(gameList,teamList,tz) {
  var headlines = [];
  //var d = new Date();
  //var m = d.getMonth();
  //var t = d.getDate();
  var add = true;
  if (!draftFinished && !draftLive) {
    add = false;
    //let dx = new Date(draftStart);
    //let str = `${onlyFirst(dayFromNum(dx.getDay()))} ${dx.getDate()} ${onlyFirst(monthFromNum(dx.getMonth()))} ${getTime(draftStart)}`;
    let str = tiempo.getFormatTime(draftStart,tz);
    headlines.push({long:'League Draft',short:'League Draft',sub:str});
  } else if (!draftFinished) {
    add = false;
    //let dx = new Date(draftStart);
    let str = tiempo.getFormatTime(draftStart,tz);
    //let str = `${onlyFirst(dayFromNum(dx.getDay()))} ${dx.getDate()} ${onlyFirst(monthFromNum(dx.getMonth()))} ${getTime(draftStart)}`;
    headlines.push({long:'League Draft Live Now',short:'League Draft Live',sub:str});
  }
  if (getCurrentWeek() < 1) {
    headlines.push({long:'First Week of The League',short:'1st Week of Play',sub:'27 Feb-01 Mar'});
  }
  if (!add) {
    return headlines;
  }
  if (getCurrentWeek() == 11) {
    headlines.push({long:'Wild Card Wednesday',short:'Wild Card WED',sub:'5 May'});
  } else if (getCurrentWeek() == 12) {
    headlines.push({long:'Divisional Weekend',short:'Divisional Weekend',sub:'9 May'});
  } else if (getCurrentWeek() == 13) {
    headlines.push({long:'Conference Round',short:'Conf. Round',sub:'12 May'});
  } else if (getCurrentWeek() == 14) {
    headlines.push({long:'League Championship',short:'League Title Game',sub:'16 May'});
  }
  let weekGames = [];
  for (let game of gameList) {
    if (game.week == getCurrentWeek()) {
      weekGames.push(game);
    }
  }
  gameList.length = 0;
  gameList = weekGames;
  gameList.sort(sortGame);
  for (let game of gameList) {
    for (let team of teamList) {
      if (team.abbr == game.away) {
        team.awayRecord = getRecordFromTeam(team);
        break;
      }
    }
    for (let team of teamList) {
      if (team.abbr == game.home) {
        team.homeRecord = getRecordFromTeam(team);
        break;
      }
    }
  }
  for (let i = 0, game = gameList[0]; i < gameList.length; i++, game = gameList[i]) {
    //console.log(game.away,game.home,i,gameList[i].away);
    if (game.status.toLowerCase().indexOf('ot') != -1) {
      game.ot = true;
    }
    //console.log('status of headline game',game.status.toLowerCase());
    if (game.status.toLowerCase() == 'ongoing') {
      //console.log('game live',game.away,game.home);
      game.now = true;
      game.score = 100;
    } else if (game.status.toLowerCase().indexOf('final') != -1) {
      game.final = true;
      if (game.awayRecord >= 0.7 && game.homeRecord >= 0.7) {
        game.score = 50 - Math.abs(game.awayScore - game.homeScore);
        game.heavy = true;
      } else {
        if (Math.abs(game.awayRecord - game.homeRecord) >= 0.5 && getCurrentWeek() > 2) { //big mismatch
          if (game.awayRecord < game.homeRecord && game.awayScore > game.homeScore) { //big upset
            game.score = 40 - Math.abs(game.awayScore - game.homeScore);
            game.upset = true;
          } else if (game.awayRecord > game.homeRecord && game.awayScore < game.homeScore) { //big upset
            game.score = 40 - Math.abs(game.awayScore - game.homeScore);
            game.upset = true;
          } else if (Math.abs(game.awayScore - game.homeScore) < 9) { //held on
            game.score = 30;
            game.avoid = true;
          } else {
            game.score = 10;
            game.avoid = true;
          }
        } else { //evenly matched
          game.score = 30 - Math.abs(game.awayScore - game.homeScore);
          game.even = true;
        }
      }
    } else { //game is upcoming
      game.up = true;
      if (game.awayRecord >= 0.7 && game.homeRecord >= 0.7) {
        game.score = 30 - i;
      } else {
        game.score = 20 - i;
      }
    }
  }
  gameList.sort(function(a,b) {
    return b.score - a.score;
  })
  gameList = gameList.slice(0,6);
  for (let game of gameList) {
    game.awayMascot = clubs.getTeamFromAbbr(game.away).mascot;
    game.homeMascot = clubs.getTeamFromAbbr(game.home).mascot;
    if (game.now) {
      var long = `${game.awayMascot} vs. ${game.homeMascot}: Live Now`;
      var short = `${game.away} vs. ${game.home}: On Now`;
      var sub = `${game.away} ${game.awayScore}, ${game.home} ${game.homeScore}`;
    } else if (game.final) {
      if (game.awayScore == game.homeScore) {
        var long = `${game.awayMascot} and ${game.homeMascot} tie`;
        var short = `${game.away} and ${game.home} tie`;
      } else if (game.upset && game.ot) { //upset in ot
        if (game.awayRecord > game.homeRecord) {
          var long = `${game.homeMascot} upset ${game.awayMascot} in overtime`;
          var short = `${game.home} upset ${game.away} in OT`;
        } else {
          var long = `${game.awayMascot} upset ${game.homeMascot} in overtime`;
          var short = `${game.away} upset ${game.home} in OT`;
        }
      } else if (game.upset) { //upset in reg
        if (game.awayRecord > game.homeRecord) {
          var long = `${game.homeMascot} upset ${game.awayMascot}`;
          var short = `${game.home} upset ${game.away}`;
        } else {
          var long = `${game.awayMascot} upset ${game.homeMascot}`;
          var short = `${game.away} upset ${game.home}`;
        }
      } else if (game.avoid && game.ot) {
        if (game.awayRecord < game.homeRecord) {
          var long = `${game.homeMascot} escape ${game.awayMascot} in overtime`;
          var short = `${game.home} escape ${game.away} in OT`;
        } else {
          var long = `${game.awayMascot} escape ${game.homeMascot} in overtime`;
          var short = `${game.away} escape ${game.home} in OT`;
        }
      } else if (game.avoid) {
        if (game.awayRecord < game.homeRecord) {
          var long = `${game.homeMascot} escape ${game.awayMascot}`;
          var short = `${game.home} escape ${game.away}`;
        } else {
          var long = `${game.awayMascot} escape ${game.homeMascot}`;
          var short = `${game.away} escape ${game.home}`;
        }
      } else if (game.ot) {
        if (Math.random() < 0.5) {
          var verb = 'top';
        } else {
          var verb = 'beat';
        }
        if (game.awayScore > game.homeScore) {
          var long = `${game.awayMascot} ${verb} ${game.homeMascot} in overtime`;
          var short = `${game.away} ${verb} ${game.home} in OT`;
        } else {
          var long = `${game.homeMascot} ${verb} ${game.awayMascot} in overtime`;
          var short = `${game.home} ${verb} ${game.away} in OT`;
        }
      } else {
        if (Math.random() < 0.5) {
          var verb = 'top';
        } else {
          var verb = 'beat';
        }
        if (game.awayScore > game.homeScore) {
          var long = `${game.awayMascot} ${verb} ${game.homeMascot}`;
          var short = `${game.away} ${verb} ${game.home}`;
        } else {
          var long = `${game.homeMascot} ${verb} ${game.awayMascot}`;
          var short = `${game.home} ${verb} ${game.away}`;
        }
      }
      var sub = `${game.away} ${game.awayScore}, ${game.home} ${game.homeScore}`;
    } else { //game is upcoming
      //var dg = new Date(game.schedule);
      //var mg = dg.getMonth();
      //var tg = dg.getDate();
      //var wg = dg.getDay();
      var long = `${game.awayMascot} vs. ${game.homeMascot}`;
      var short = `${game.away} vs. ${game.home}`;
      var sub = tiempo.getFormatTime(game.schedule,tz);
      //var sub = `${capFirst(dayFromNum(wg).toLowerCase())} ${tg} ${capFirst(monthFromNum(mg).toLowerCase())} ${getTime(game.schedule)}`;
    }
    headlines.push({long:long,short:short,sub:sub});
  }
  return headlines;
}

function roundToHalf(num) {
  return Math.round(num - 0.5) + 0.5;
}

function roundToE3(num) {
  return Math.ceil(num) * 1e3;
}

function onlyFirst(str) {
  return capFirst(str.toLowerCase());
}

function getRecordFromTeam(t) {
  if (t.w + t.l + t.t == 0) {
    return 0.001;
  } else {
    return (t.w + t.t / 2) / (t.w + t.t + t.l);
  }
}

function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

function sortGame(a,b) {
  var ad = new Date(a.schedule);
  var bd = new Date(b.schedule);
  return ad.getTime() - bd.getTime();
}

function capFirst(str) {
  return str.substring(0,1).toUpperCase() + str.substring(1,str.length);
}

function clean(arr) {
  var filtered = arr.filter((el) => el != null);
  return filtered;
}

function getNextWeekStart() {
  var w = getCurrentWeek();
  switch (w) {
    case 0:
      return '2021-03-03 00:00:00 MDT';
    case 1:
      return '2021-03-10 00:00:00 MDT';
    case 2:
      return '2021-03-17 00:00:00 MST';
    case 3:
      return '2021-03-24 00:00:00 MST';
    case 4:
      return '2021-03-31 00:00:00 MST';
    case 5:
      return '2021-04-07 00:00:00 MST';
    case 6:
      return '2021-04-14 00:00:00 MST';
    case 7:
      return '2021-04-21 00:00:00 MST';
    case 8:
      return '2021-04-28 00:00:00 MST';
    case 9:
      return '2021-05-04 00:00:00 MST';
    case 10:
      return '2021-05-11 00:00:00 MST';
    case 11:
      return '2021-05-14 00:00:00 MST';
    case 12:
      return '2021-05-18 00:00:00 MST';
    case 13:
      return '2021-05-21 00:00:00 MST';
    case 14:
      return '2021-05-25 00:00:00 MST';
  }
}

function getCurrentWeek() {
  var d = DateTime.now().setZone('America/Denver');
  //var d = new Date();
  //var m = d.getMonth();
  //var t = d.getDate();
  var m = d.month - 1;
  var t = d.day;
  //console.log(m,t);
  if (m == 0 || m == 1) { //jan or feb
    return 0;
  } else if (m == 2) { //mar
    if (t <= 2) {
      return 0;
    } else if (t <= 9) {
      return 1;
    } else if (t <= 16) {
      return 2;
    } else if (t <= 23) {
      return 3;
    } else if (t <= 30) {
      return 4;
    } else {
      return 5;
    }
  } else if (m == 3) { //apr
    if (t <= 6) {
      return 5;
    } else if (t <= 13) {
      return 6;
    } else if (t <= 20) {
      return 7;
    } else if (t <= 27) {
      return 8;
    } else {
      return 9;
    }
  } else if (m == 4) { //may
    if (t <= 4) {
      return 9;
    } else if (t <= 11) {
      return 10;
    } else if (t <= 14) {
      return 11;
    } else if (t <= 18) {
      return 12;
    } else if (t <= 21) {
      return 13;
    }
  }
  return 14;
}

function getBetCost() {
  if (getCurrentWeek() < 11) {
    return 20000;
  } else if (getCurrentWeek() == 11) {
    return 50000;
  } else if (getCurrentWeek() == 12) {
    return 100000;
  } else if (getCurrentWeek() == 13) {
    return 200000;
  } else {
    return 500000;
  }
}

function other(str) {
  if (str == 'away') {
    return 'home';
  } else if (str == 'home') {
    return 'away';
  } else if (str == 'over') {
    return 'under';
  } else if (str == 'under') {
    return 'over';
  } else {
    return 'err';
  }
}

function normalRandom(m,s,l,h) {
  if (l == undefined) {
    l = m - 2 * s;
  }
  if (h == undefined) {
    h = m + 2 * s;
  }
  var u = 0, v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  var x = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) * s + m;
  if (x < l) {
    return l;
  } else if (x > h) {
    return h;
  } else {
    return x;
  }
}

function canMakeTrade() {
  var d = new Date('2021-04-07T05:59:00Z');
  var n = new Date();
  if (d.getTime() < n.getTime()) {
    return false;
  } else {
    return true;
  }
}

function canFreeAgent() {
  var d = new Date('2021-04-28T05:59:00Z');
  var n = new Date();
  if (d.getTime() < n.getTime()) {
    return false;
  } else {
    return true;
  }
}

function getTime(stamp) {
  var d = new Date(stamp);
  var h = d.getHours();
  var m = d.getMinutes();
  return getTimestamp(h,m);
}

function getTimestamp(h,m) {
  if (m < 10) {
    m = `0${m}`;
  }
  if (h == 0) {
    return `12:${m}A`;
  } else if (h < 12) {
    return `${h}:${m}A`;
  } else if (h == 12) {
    return `12:${m}P`;
  } else {
    return `${h - 12}:${m}P`;
  }
}

function untilNextNoon() {
  // var tomorrow = new Date();
  // tomorrow.setDate(new Date().getDate() + 1);
  // var noon = new Date(tomorrow.getFullYear(),tomorrow.getMonth(),tomorrow.getDate(),12,0,0);
  // var d = new Date();
  var now = DateTime.now().setZone('America/Denver').plus({days: 1});
  var d = new Date();
  var noon = DateTime.local(now.year,now.month,now.day,12,0,0);
  return noon.ts - d.getTime();
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function starEmail(str) {
  var a = str.indexOf('@');
  var addr = str.substring(0,a);
  var domain = str.substring(a,str.length);
  var three = addr.substring(0,3);
  var rest = addr.substring(3,addr.length).replace(/./g,'*');
  return three + rest + domain;
}

function encrypt(text,key) {
  key = crypto.createHash('sha256').update(key).digest('hex');
  let iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text,key) {
  key = crypto.createHash('sha256').update(key).digest('hex');
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function getSixDigit() {
  return Math.floor(Math.random() * 9 * 1e5) + 1e5;
}

function getFullRoster(list,roster) {
  let exp = {};
  let att = ['qb','rb','wr','te','de','lb','cb','s','k','p','flx1','flx2','flx3'];
  if (typeof roster == 'string') {
    throw 'Roster is a string';
  }
  for (let player of list) {
    if (roster.includes(player.id)) {
      exp[att[roster.indexOf(player.id)]] = player;
    }
  }
  if (!exp.flx1) {
    exp.flx1 = {pos:'FLX',fName:'Open',lName:'Flex Spot'};
  }
  if (!exp.flx2) {
    exp.flx2 = {pos:'FLX',fName:'Open',lName:'Flex Spot'};
  }
  if (!exp.flx3) {
    exp.flx3 = {pos:'FLX',fName:'Open',lName:'Flex Spot'};
  }
  for (let x in exp) {
    exp[x].num = exp[x].id;
  }
  let cleanExp = {};
  for (let p of att) {
    cleanExp[p] = exp[p];
  }
  return cleanExp;
}

function formatRecord(team,div) {
  if (div) {
    if (team.dt != 0) {
      return `(${team.dw}-${team.dl}-${team.dt})`;
    } else {
      return `(${team.dw}-${team.dl})`;
    }
  } else {
    if (team.t != 0) {
      return `(${team.w}-${team.l}-${team.t})`;
    } else {
      return `(${team.w}-${team.l})`;
    }
  }
}

function fullMonth(num) {
  switch (num) {
    case 0:
      return 'January';
    case 1:
      return 'February';
    case 2:
      return 'March';
    case 3:
      return 'April';
    case 4:
      return 'May';
  }
}

function monthFromNum(num) {
  switch (num) {
    case 0:
      return 'JAN';
    case 1:
      return 'FEB';
    case 2:
      return 'MAR';
    case 3:
      return 'APR';
    case 4:
      return 'MAY';
  }
}

function fullDay(short) {
  switch (short) {
    case 0:
      return 'Sunday';
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
  }
}

function dayFromNum(num) {
  switch (num) {
    case 0:
      return 'SUN';
    case 1:
      return 'MON';
    case 2:
      return 'TUE';
    case 3:
      return 'WED';
    case 4:
      return 'THU';
    case 5:
      return 'FRI';
    case 6:
      return 'SAT';
  }
}

function formatTime(date) {
  var d = new Date(date);
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var dd = "A";
  var h = hh;
  if (h >= 12) {
    h = hh - 12;
    dd = "P";
  }
  if (h == 0) {
    h = 12;
  }
  m = m < 10 ? '0' + m : m;
  s = s < 10 ? '0' + s : s;
  return `${h}:${m}${dd}`;
}

function teamCompare(list) {
  return function(a,b) {
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
    var win = games.wonMatchup(a.abbr,b.abbr,list);
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
    //4. total points scored
    var at = games.getTotalPointsScored(a.abbr,list);
    var bt = games.getTotalPointsScored(b.abbr,list);
    if (at != bt) {
      return bt - at;
    }
    //5. average point diff
    var ad = games.getTotalPointDiff(a.abbr,list);
    var bd = games.getTotalPointDiff(b.abbr,list);
    if (ad != bd) {
      return bd - ad;
    }
    //6. assume no change
    return 0;
  }
}

function compare(a,b) {
  if (a.record != b.record) {
    return b.record - a.record;
  }
  if (a.record == 1 && b.record == 1 && a.w != b.w) {
    return b.w - a.w;
  }
  if (a.record == 0 && b.record == 0 && a.l != b.l) {
    return a.l - b.l;
  }
  var win = games.wonMatchup(a.abbr,b.abbr);
  if (win == true) {
    return -1;
  } else if (win == false) {
    return 1;
  }
  if (a.divRecord != b.divRecord) {
    return b.divRecord - a.divRecord;
  }
  if (a.divRecord == 1 && b.divRecord == 1 && a.dw != b.dw) {
    return b.dw - a.dw;
  }
  if (a.divRecord == 0 && b.divRecord == 0 && a.dl != b.dl) {
    return a.dl - b.dl;
  }
  var at = games.getTotalPointsScored(a.abbr);
  var bt = games.getTotalPointsScored(b.abbr);
  if (at != bt) {
    return bt - at;
  }
  var ad = games.getAvgPointDiff(a.abbr);
  var bd = games.getAvgPointDiff(b.abbr);
  if (ad != bd) {
    return bd - ad;
  }
  return 0;
}

function checkClinch(team,checks,list) {
  var pseudoTeam = {};
  pseudoTeam.abbr = team.abbr;
  pseudoTeam.record = (team.w + team.t / 2) / 11;
  pseudoTeam.divRecord = (team.dw + team.dt / 2) / 3;
  for (let oppo of checks) {
    var pseudoOppo = {};
    pseudoOppo.abbr = oppo.abbr;
    var gamesLeft = 11 - oppo.w - oppo.l - oppo.t;
    pseudoOppo.record = (gamesLeft + oppo.w + oppo.t / 2) / 11;
    var divGamesLeft = 3 - oppo.dw - oppo.dl - oppo.dt;
    pseudoOppo.divRecord = (divGamesLeft + oppo.dw + oppo.dt / 2) / 3;
    //console.log(team.abbr,compare(pseudoTeam,pseudoOppo));
    if (compare(pseudoTeam,pseudoOppo,list) > 0) {
      return false;
    }
  }
  return true;
}

function toMins(time) {
  var s = time % 60;
  var m = (time - s) / 60;
  if (s < 10) {
    s = `0${s}`;
  }
  return {s:s,m:m};
}

function guid(obj) {
  let potentional = secStr();
  let guidTaken = false;
  for (let id in obj) {
    if (id === potentional) {
      guidTaken = true;
      break;
    }
  }
  while (guidTaken) {
    let stillTaken = true;
    let potentional = secStr();
    for (let id in obj) {
      if (id === potentional) {
        stillTaken = true;
        break;
      }
    }
    if (!stillTaken) {
      guidTaken = false;
    }
  }
  return potentional;
}

function genHexTriString(len) {
  let output = '';
  for (let i = 0; i < len; i++) {
    output += (Math.floor(Math.random() * 36)).toString(36);
  }
  return output;
}

function secStr() {
  return genHexTriString(36);
}
