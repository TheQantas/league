var weekGames = [];
var teamGames = {};

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'requested') {
    renderGames(response.data);
    if (response.qual == 'week') {
      weekGames[response.crit] = response.data;
    } else {
      teamGames[response.crit] = response.data;
    }
  }
}

function changeSortMethod(elem) {
  var par = elem.parentElement;
  if (par.children[2].style.display == 'none') {
    par.children[1].style.display = 'none';
    par.children[1].selectedIndex = 0;
    par.children[2].style.display = 'block';
  } else {
    par.children[2].style.display = 'none';
    par.children[2].selectedIndex = 0;
    par.children[1].style.display = 'block';
  }
}

function requestGames(elem,isNum) {
  if (isNum) {
    if (weekGames[Number(elem.value)]) {
      renderGames(weekGames[Number(elem.value)]);
      return;
    }
    var crit = Number(elem.value);
    var qual = 'week';
  } else {
    if (teamGames[elem.value]) {
      renderGames(teamGames[elem.value]);
      return;
    }
    var crit = elem.value;
    var qual = 'team';
  }
  let req = {method:'request',type:'games',qual:qual,crit:crit};
  ws.send(JSON.stringify(req));
}

function renderGames(games) {
  document.getElementById('gamesCont').innerHTML = '';
  for (let game of games) {
    render(game);
  }
}

function render(game) {
  var newBox = buildElem('DIV','gameBox',undefined,document.getElementById('gamesCont'));
  var d = new Date(game.schedule);
  var t = `${numToDay(d.getDay())} ${d.getDate()} ${numToMon(d.getMonth())} ${game.time}`;
  if (game.status.toLowerCase() == 'upcoming') {
    buildElem('DIV','gameTime',t,newBox);
  } else if (game.status == 'ongoing') {
    buildElem('DIV','gameTime',`${t} - ${game.period}`,newBox);
  } else {
    buildElem('DIV','gameTime',`${t} - ${game.status.toUpperCase()}`,newBox);
  }
  var newTop = buildElem('DIV','gameTop',undefined,newBox);
  var awayHalf = buildElem('DIV','gameTopHalf',undefined,newTop);
  awayHalf.classList.add(game.awayTeam.mascot.toLowerCase().replace(/\s/g,''));
  var awayLogo = buildElem('IMG','gameLogo',undefined,awayHalf);
  awayLogo.src = `logos/${game.awayTeam.mascot.toLowerCase().replace(/\s/g,'')}.png`;
  buildElem('DIV','gameName',game.awayTeam.mascot,awayHalf);
  buildElem('DIV','gameAbbr',game.awayTeam.abbr,awayHalf);
  if (game.status == 'upcoming') {
    var as = buildElem('DIV','gameScore','-',awayHalf);
  } else {
    var as = buildElem('DIV','gameScore',game.awayScore,awayHalf);
  }
  //
  var homeHalf = buildElem('DIV','gameTopHalf',undefined,newTop);
  homeHalf.classList.add(game.homeTeam.mascot.toLowerCase().replace(/\s/g,''));
  if (game.status == 'upcoming') {
    var hs = buildElem('DIV','gameScore','-',homeHalf);
  } else {
    var hs = buildElem('DIV','gameScore',game.homeScore,homeHalf);
  }
  buildElem('DIV','gameName',game.homeTeam.mascot,homeHalf);
  buildElem('DIV','gameAbbr',game.homeTeam.abbr,homeHalf);
  var homeLogo = buildElem('IMG','gameLogo',undefined,homeHalf);
  homeLogo.src = `logos/${game.homeTeam.mascot.toLowerCase().replace(/\s/g,'')}.png`;
  if (game.status.toLowerCase().indexOf('final') != -1 || game.status.toLowerCase() == 'ongoing') {
    if (game.awayScore < game.homeScore && game.status.toLowerCase().indexOf('final') != -1) {
      hs.style.fontWeight = 'bold';
    } else if (game.awayScore > game.homeScore && game.status.toLowerCase().indexOf('final') != -1) {
      as.style.fontWeight = 'bold';
    }
    var newBot = buildElem('DIV','gameBot',undefined,newBox);
    var newTable = buildElem('TABLE','gameTable',undefined,newBot);
    var row0 = newTable.insertRow();
    var colNames = ['Team','1','2','3','4'];
    if (game.status.toLowerCase().indexOf('4ot') != -1 || (game.status == 'ongoing' && game.period == '4OT')) {
      colNames = colNames.concat(['OT','2OT','3OT','4OT','T']);
    } else if (game.status.toLowerCase().indexOf('3ot') != -1 || (game.status == 'ongoing' && game.period == '3OT')) {
      colNames = colNames.concat(['OT','2OT','3OT','T']);
    } else if (game.status.toLowerCase().indexOf('2ot') != -1 || (game.status == 'ongoing' && game.period == '2OT')) {
      colNames = colNames.concat(['OT','2OT','T']);
    } else if (game.status.toLowerCase().indexOf('ot') != -1 || (game.status == 'ongoing' && game.period == 'OT')) {
      colNames = colNames.concat(['OT','T']);
    } else {
      colNames.push('T');
    }
    for (let name of colNames) {
      let newCol = row0.insertCell();
      newCol.textContent = name;
    }
    var awayRow = [game.awayTeam.mascot];
    for (let x of JSON.parse(game.awaySbq)) {
      awayRow.push(x);
    }
    awayRow.push(game.awayScore);
    var homeRow = [game.homeTeam.mascot];
    for (let x of JSON.parse(game.homeSbq)) {
      homeRow.push(x);
    }
    homeRow.push(game.homeScore);
    var rows = [awayRow,homeRow];
    for (let row of rows) {
      let newRow = newTable.insertRow();
      for (let val of row) {
        let newCell = newRow.insertCell();
        newCell.textContent = val;
      }
    }
  }
}