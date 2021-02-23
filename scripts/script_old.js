ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested' && response.info.type == 'games') {
    for (let game of response.data) {
      var time = splitTime(game.time);
      game.dateStr = Number(getPseudoDay(game.day) + time.l + String(time.m));
    }
    response.data.sort(compare);
    if (records !== undefined) {
      hasBuiltSchedule = true;
      addWeeklyGames(response.data);
    } else {
      weeklyGames = response.data;
      console.log(weeklyGames);
    }
  } else if (response.method == 'requested') {
    records = response.data;
    if (!hasBuiltSchedule && weeklyGames != undefined) {
      hasBuiltSchedule = true;
      addWeeklyGames(weeklyGames);
    }
  }
}

var hasBuiltSchedule = false;
var records;
var weeklyGames;

window.onload = function() {
  var rec = {method:'request',type:'records',qual:'overall',crit:'ALL'};
  ws.send(JSON.stringify(rec));
  var req = {method:'request',type:'games',qual:'week',crit:getCurrentWeek()};
  ws.send(JSON.stringify(req));
};

function addWeeklyGames(games) {
  var parent = document.getElementById('weeklyGames');
  for (let game of games) {
    let newCont = document.createElement('DIV');
    newCont.classList.add('weeklyCont');
    parent.append(newCont);
    //top
    let newTop = document.createElement('DIV');
    newTop.classList.add('weeklyHalf');
    newCont.append(newTop);
    let awayTeam = getTeamFromAbbr(game.away);
    let awayLogo = document.createElement('IMG');
    awayLogo.src = getLogoFromTeam(awayTeam);
    newTop.append(awayLogo);
    buildElem('DIV','weeklyInfo',game.away,newTop);
    if (game.score.away == 'TBD') {
      let record = records[game.away];
      buildElem('DIV','weeklyInfo',getFormatRecord(record.w,record.l,record.t),newTop);
    } else {
      var awayScore = buildElem('DIV','weeklyInfo',game.score.away,newTop);
      awayScore.style.color = 'rgb(168,168,168);';
    }
    if (game.played !== 'now') {
      buildElem('DIV','weeklyInfo',game.day.toUpperCase(),newTop);
    } else {
      buildElem('DIV','weeklyInfo',ordinal(game.q).toUpperCase(),newTop);
    }
    //bot
    let newBot = document.createElement('DIV');
    newBot.classList.add('weeklyHalf');
    newCont.append(newBot);
    let homeTeam = getTeamFromAbbr(game.home);
    let homeLogo = document.createElement('IMG');
    homeLogo.src = getLogoFromTeam(homeTeam);
    newBot.append(homeLogo);
    buildElem('DIV','weeklyInfo',game.home,newBot);
    if (game.score.home == 'TBD') {
      let record = records[game.away];
      buildElem('DIV','weeklyInfo',getFormatRecord(record.w,record.l,record.t),newBot);
    } else {
      var homeScore = buildElem('DIV','weeklyInfo',game.score.home,newBot);
      homeScore.style.color = 'rgb(168,168,168);';
    }
    if (game.played === false) {
      buildElem('DIV','weeklyInfo',game.time,newBot);
    } else if (game.played === true && game.q < 5) {
      buildElem('DIV','weeklyInfo','FINAL',newBot);
    } else if (game.played === true && game.q == 5) {
      buildElem('DIV','weeklyInfo','FINAL/OT',newBot);
    } else {
      buildElem('DIV','weeklyInfo',`${game.m}:${game.s}`,newBot);
    }
    if (awayScore && homeScore && game.played == true) {
      if (Number(game.score.away) > Number(game.score.home)) {
        awayScore.style.fontWeight = 'bold';
      } else if (Number(game.score.away) < Number(game.score.home)) {
        homeScore.style.fontWeight = 'bold';
      }
    }
  }
}

function scrollWeeklyGames(dx) {
  if (Math.abs(dx) > window.innerWidth - 80) {
    dx = dx * 0.5;
  }
  var elem = document.getElementById('weeklyGames');
  var x = elem.scrollLeft;
  var lim = elem.scrollWidth - elem.offsetWidth;
  var chevs = document.getElementsByClassName('weeklyChevron');
  chevs[0].classList.remove('disabled');
  chevs[1].classList.remove('disabled');
  var newX = x + dx;
  if (newX <= 0) {
    newX = 0;
    chevs[0].classList.add('disabled');
  } else if (newX >= lim) {
    newX = lim;
    chevs[1].classList.add('disabled');
  }
  var d = newX - x;
  var iter = 0;
  var step = 20;
  var animation = setInterval(function() {
    iter++;
    elem.scrollLeft = x + d / step * iter;
    if (iter == step) {
      clearInterval(animation);
    }
  }, 10);
}

function compare(a,b) {
  return a.dateStr - b.dateStr;
}
