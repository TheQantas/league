function sortTable() {
  var table, rows, switching, i, x, y, shouldSwitch, pos;
  for (let e of document.getElementsByClassName('page')) {
    if (e.style.display == 'block') {
      table = e;
      pos = e.getAttribute('data-pos');
      break;
    }
  }
  switching = true;
  while (switching) {
    switching = false;
    rows = table.children;
    for (i = 1; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i];
      y = rows[i + 1];
      if (x.classList.contains('head') || y.classList.contains('head')) {
        continue;
      }
      if (order(x,y,pos)) {
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
  let w = Number(document.getElementById('nav').children[1]);
  if (!['OFF','DEF'].includes(pos)) {
    for (let r of rows) { //reset logos of players
      if (r.classList.contains('head')) {
        continue;
      }
      let arr = JSON.parse(r.getAttribute('data-teams'));
      if (arr[w] == undefined || arr[w] == null) {
        r.children[0].src = `logos/${getAttrFromAbbr('clean',r.getAttribute('data-team'))}_g.png`;
      } else {
        r.children[0].src = `logos/${getAttrFromAbbr('clean',arr[w])}_g.png`;
      }
    }
  }
  for (let r of rows) { //update rows text
    if (r.classList.contains('head')) {
      continue;
    }
    for (let i = 2; i < r.children.length; i++) {
      let obj = JSON.parse(r.getAttribute('data-stats'));
      let stats = {}
      for (let attr in obj) {
        if (w == -1) {
          stats[attr] = obj[attr].slice(1).reduce((x,y) => x + y,0);
        } else {
          stats[attr] = obj[attr][w];
        }
        if (stats[attr] == undefined) {
          stats[attr] = 0;
        } 
      }
      let e = r.children[i];
      if (pos == 'QB') {
        if (i == 2) {
          e.textContent = calcQBRating(stats.comp,stats.att,stats.yds,stats.td,stats.int);
        } else if (i == 3) {
          e.textContent = `${stats.td}/${stats.int}`;
        } else if (i == 4) {
          e.textContent = stats.yds;
        } else {
          e.textContent = `${stats.comp}/${stats.att}`;
        }
      } else if (pos == 'RB' || pos == 'WR' || pos == 'TE') {
        if (i == 2) {
          e.textContent = stats.yds;
        } else if (i == 3) {
          e.textContent = stats.td;
        } else if (i == 4) {
          if (stats.att == 0) {
            e.textContent = '0.0';
          } else {
            e.textContent = (stats.yds / stats.att).toFixed(1);
          }
        } else {
          e.textContent = stats.att;
        }
      } else if (pos == 'OL' || pos == 'DL' || pos == 'LB') {
        if (i == 2) {
          e.textContent = stats.pressures;
        } else {
          e.textContent = stats.sacks;
        }
      } else if (pos == 'CB') {
        if (i == 2) {
          e.textContent = stats.int;
        } else if (i == 3) {
          e.textContent = stats.tackles;
        } else if (i == 4) {
          e.textContent = stats.att;
        } else {
          e.textContent = stats.targets;
        }
      } else if (pos == 'S') {
        if (i == 2) {
          e.textContent = stats.tackles;
        } else {
          e.textContent = stats.att;
        }
      } else if (pos == 'K') {
        if (i == 2) {
          e.textContent = stats.pts;
        } else if (i == 3) {
          e.textContent = `${stats.under40}/${stats.under40Att}`;
        } else if (i == 4) {
          e.textContent = `${stats.over40}/${stats.over40Att}`;
        } else {
          e.textContent = `${stats.pat}/${stats.patAtt}`;
        }
      } else if (pos == 'P') {
        if (i == 2) {
          e.textContent = stats.yds;
        } else if (i == 3) {
          e.textContent = stats.netYds;
        } else if (i == 4) {
          e.textContent = stats.in20;
        } else {
          e.textContent = stats.att;
        }
      } else if (pos == 'OFF') {
        if (i == 2) {
          e.textContent = calcOffRating(stats.plays,stats.td,stats.pts,stats.yds);
        } else if (i == 3) {
          e.textContent = stats.yds;
        } else if (i == 4) {
          e.textContent = stats.plays;
        } else {
          e.textContent = stats.firstDowns;
        }
      } else if (pos == 'DEF') {
        if (i == 2) {
          e.textContent = calcDefRating(stats.defPlays,stats.sacks,stats.int,stats.allowTd,stats.defYds,stats.allowPts);
        } else if (i == 3) {
          e.textContent = stats.defYds;
        } else if (i == 4) {
          e.textContent = stats.sacks;
        } else {
          e.textContent = stats.int;
        }
      }
    }
  }
}

function order(a,b,p) {
  let ao = {}, bo = {};
  let w = Number(document.getElementById('nav').children[1]);
  let ap = JSON.parse(a.getAttribute('data-stats'));
  let bp = JSON.parse(b.getAttribute('data-stats'));
  for (let attr in ap) {
    if (w == -1) {
      ao[attr] = ap[attr].slice(1).reduce((x,y) => x + y,0);
    } else {
      ao[attr] = ap[attr][w];
    }
    if (ao[attr] == undefined) {
      ao[attr] = 0;
    } 
  }
  for (let attr in bp) {
    if (w == -1) {
      bo[attr] = bp[attr].slice(1).reduce((x,y) => x + y,0);
    } else {
      bo[attr] = bp[attr][w];
    }
    if (bo[attr] == undefined) {
      bo[attr] = 0;
    } 
  }
  if (p == 'QB') {
    if (Number(calcQBRating(bo.comp,bo.att,bo.yds,bo.td,bo.int)) > Number(calcQBRating(ao.comp,ao.att,ao.yds,ao.td,ao.int))) {
      return true;
    }
    if (bo.yds > ao.yds) {
      return true;
    }
  } else if (p == 'RB' || p == 'WR' || p == 'TE') {
    if (bo.yds > ao.yds) {
      return true;
    }
    if (bo.td > ao.td) {
      return true;
    }
  } else if (p == 'OL') {
    if (bo.sacks < ao.sacks) {
      return true;
    }
    if (bo.pressures < ao.pressures) {
      return true;
    }
  } else if (p == 'DL' || p == 'LB') {
    if (bo.sacks > ao.sacks) {
      return true;
    }
    if (bo.pressures > ao.pressures) {
      return true;
    }
  } else if (p == 'CB') {
    if (bo.int > ao.int) {
      return true;
    }
    if (bo.tackles > ao.tackles) {
      return true;
    }
  } else if (p == 'S') {
    if (bo.tackles > ao.tackles) {
      return true;
    }
    if (bo.att < ao.att) {
      return true;
    }
  } else if (p == 'K') {
    if (bo.pts > ao.pts) {
      return true;
    }
    let aAtt = ao.under40Att + ao.over40Att + ao.patAtt;
    let aTot = ao.under40 + ao.over40 + ao.pat;
    let bAtt = bo.under40Att + bo.over40Att + bo.patAtt;
    let bTot = bo.under40 + bo.over40 + bo.pat;
    let aAcc = aTot / aAtt;
    let bAcc = bTot / bAtt;
    if (aAtt == 0) {
      aAcc = 0;
    }
    if (bAtt == 0) {
      bAcc = 0;
    }
    if (bAcc > aAcc) {
      return true;
    }
  } else if (p == 'P') {
    if (bo.yds > ao.yds) {
      return true;
    }
    if (bo.netYds < ao.netYds) {
      return true;
    }
  } else if (p == 'OFF') {
    let ar = calcOffRating(ao.plays,ao.td,ao.pts,ao.yds);
    let br = calcOffRating(bo.plays,bo.td,bo.pts,bo.yds);
    if (Number(br) > Number(ar)) {
      return true;
    }
    if (bo.yds > ao.yds) {
      return true;
    }
  } else if (p == 'DEF') {
    let ar = calcDefRating(ao.defPlays,ao.sacks,ao.int,ao.allowTd,ao.defYds,ao.allowPts);
    let br = calcDefRating(bo.defPlays,bo.sacks,bo.int,bo.allowTd,bo.defYds,bo.allowPts);
    if (br > ar) {
      return true;
    }
    if (Number(br) < Number(ar)) {
      return true;
    }
    if (bo.defYds < ao.defYds) {
      return true;
    }
  }
  return false;
}