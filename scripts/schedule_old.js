ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested') {
    if (response.info.qual == 'week') {
      response.data.sort(compare);
    }
    buildSch(response.data);
  }
}

window.onload = function() {
  var req = {method:'request',type:'games',qual:'week',crit:getCurrentWeek()};
  ws.send(JSON.stringify(req));
  document.getElementsByClassName('selOption')[getCurrentWeek()].classList.add('selected');
};

function changeOptions(num) {
  var conts = document.getElementsByClassName('selCont');
  for (let cont of conts) {
    cont.style.display = 'none';
  }
  conts[num].style.display = 'block';
  var btns = document.getElementsByClassName('selMethod');
  for (let btn of btns) {
    btn.classList.remove('selected');
  }
  btns[num].classList.add('selected');
}

function chooseSch(crit,elem) {
  var btns = document.getElementsByClassName('selOption');
  for (let btn of btns) {
    btn.classList.remove('selected');
  }
  elem.classList.add('selected');
  if (typeof crit == 'number') {
    var req = {method:'request',type:'games',qual:'week',crit:crit};
  } else {
    var req = {method:'request',type:'games',qual:'team',crit:crit};
  }
  ws.send(JSON.stringify(req));
}

function buildSch(list) {
  var parent = document.getElementById('schCont');
  parent.innerHTML = '';
  for (let game of list) {
    var newRow = buildElem('DIV','rowWeek',undefined,parent);
    var timeStr = `${game.day.toUpperCase()} ${game.date} ${game.month.toUpperCase()} ${decodeEntities('&#x2022;')} ${game.time}`;
    var newTop = buildElem('DIV','rowTop',timeStr,newRow);
    var newBot = buildElem('DIV','rowBot',undefined,newRow);
    //away
    var awayTeam = getTeamFromAbbr(game.away);
    var awayClass = getClassFromTeam(awayTeam);
    var awayLogo = buildElem('IMG',awayClass,undefined,newBot);
    awayLogo.src = getLogoFromTeam(awayTeam);
    var awayName = buildElem('DIV','teamName',awayTeam.mascot,newBot);
    awayName.classList.add(awayClass);
    var awayAbbr = buildElem('DIV','teamAbbr',awayTeam.abbr,newBot);
    awayAbbr.classList.add(awayClass);
    if (game.score.away != 'TBD') {
      var awayScore = buildElem('DIV','teamScore',game.score.away,newBot);
    } else {
      var awayScore = buildElem('DIV','teamScore','-',newBot);
    }
    awayScore.classList.add(awayClass);
    //home
    var homeTeam = getTeamFromAbbr(game.home);
    var homeClass = getClassFromTeam(homeTeam);
    if (game.score.home != 'TBD') {
      var homeScore = buildElem('DIV','teamScore',game.score.home,newBot);
    } else {
      var homeScore = buildElem('DIV','teamScore','-',newBot);
    }
    homeScore.classList.add(homeClass);
    var homeAbbr = buildElem('DIV','teamAbbr',homeTeam.abbr,newBot);
    homeAbbr.classList.add(homeClass);
    var homeName = buildElem('DIV','teamName',homeTeam.mascot,newBot);
    homeName.classList.add(homeClass);
    var homeLogo = buildElem('IMG',homeClass,undefined,newBot);
    homeLogo.src = getLogoFromTeam(homeTeam);
    //bolding
    if (game.score && game.played == true) {
      if (Number(game.score.away) > Number(game.score.home)) {
        awayScore.style.fontWeight = 'bold';
      } else if (Number(game.score.away) < Number(game.score.home)) {
        homeScore.style.fontWeight = 'bold';
      }
    }
  }
}

function compare(a,b) {
  var ax = Number(getPseudoDay(a.day) + splitTime(a.time).l + String(splitTime(a.time).m));
  var bx = Number(getPseudoDay(b.day) + splitTime(b.time).l + String(splitTime(b.time).m));
  return ax - bx;
}
