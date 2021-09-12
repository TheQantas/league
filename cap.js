const mysql = require('mysql');
const Cred = require('./cred.js');
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
const athletes = {};
athletes.getRosterFromPlayers = (list,abbr) => {
  var exp = [];
  for (let p of list) {
    if (p.team == abbr) {
      exp.push(p);
    }
  }
  return exp;
}
athletes.getAllPlayers = () => {
  return request('SELECT * FROM players');
}
function expandPlayers(list) {
  for (let p of list) {
    p.salary = p.guar + p.base * p.duration;
  }
  return list;
}
const clubs = {};
clubs.getTeamFromAbbr = abbr => {
  return request(`SELECT * FROM teams WHERE Abbr = ${con.escape(abbr)}`).then(list => {
    return list[0];
  });
}
const abbrs = ['FLA','FOX','NAT','PEN','GRE','PAN','PIR','SNA','DRA','ENG','PIO','RED','COU','FAL','GRI','WAR','AAR','COO','ROT','SEN','BAD','HUM','LON','WOL','AVI','CHA','EAG','GAL','CHE','PEG','STR','ZEB','COL','HUS','LYN','STA','GOL','REB','SHA','SQU'];
var abbrIndex = 0;
athletes.getAllPlayers().then(allPlayers => {
  function cap(abbr) {
    clubs.getTeamFromAbbr(abbr).then(awayTeam => {
      awayTeam.cap = awayTeam.dead;
      for (let d of JSON.parse(awayTeam.delegates)) {
        awayTeam.cap += d.investment;
      }
      awayTeam.fieldPlayers = expandPlayers(athletes.getRosterFromPlayers(allPlayers,abbr));
      for (let p of awayTeam.fieldPlayers) {
        awayTeam.cap += p.base * p.duration + p.guar;
      }
      if (awayTeam.cap > 200000) {
        console.log('over',abbr,awayTeam.cap);
      } else {
        console.log('under',abbr,awayTeam.cap);
      }
      abbrIndex++;
      if (abbrIndex < abbrs.length) {
        cap(abbrs[abbrIndex])
      }
    });
  }
  cap(abbrs[abbrIndex]);
});
