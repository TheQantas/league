ws.onmessage = message => {
  var response = JSON.parse(message.data);
  while (document.getElementsByClassName('cell').length > 0) {
    document.getElementsByClassName('cell')[0].remove();
  }
  while (document.getElementsByClassName('pickRow').length > 0) {
    document.getElementsByClassName('pickRow')[0].remove();
  }
  let x = response.team;
  document.getElementById('top').className = x.clean;
  document.getElementById('top').children[0].src = `logos/${x.clean}.png`;
  document.getElementById('topMascot').textContent = x.mascot;
  document.getElementById('topRecord').textContent = `(${x.w}-${x.l}) | (${x.dw}-${x.dl}) in ${x.division}`;
  if (response.stories.length == 0) {
    document.getElementById('moreStories').style.display = 'none';
    document.getElementById('onlyStory').style.display = 'block';
  } else {
    document.getElementById('moreStories').style.display = 'block';
    document.getElementById('onlyStory').style.display = 'none';
  }
  response.stories.reverse();
  for (let i = 0, s = response.stories[i]; i < response.stories.length; i++, s = response.stories[i]) {
    let cont = document.createElement('DIV');
    cont.className = 'cell storyCell';
    document.getElementsByClassName('page')[0].prepend(cont);
    if (i < response.stories.length - 5) {
      cont.style.display = 'none';
    }
    buildElem('DIV','cellTop',getFormatTime(s.time,true),cont);
    buildElem('DIV','cellBot',s.story,cont);
  }
  for (let p of response.picks) {
    let cont = buildElem('DIV','pickRow',undefined,document.getElementsByClassName('page')[1]);
    buildElem('IMG','pickLogo',`logos/${p.clean}_g.png`,cont);
    buildElem('DIV','pickInfo',`RD ${p.round} PK ${p.pick} (${p.ordinal.toUpperCase()})`,cont);
    let t = '';
    if (JSON.parse(p.trades).length > 1) {
      t += JSON.parse(p.trades)[0];
      for (let k = 1; k < JSON.parse(p.trades).length; k++) {
        t += `&#9654;&nbsp;${JSON.parse(p.trades)[k]}`;
      }
    }
    buildElem('DIV','pickTransfer',decodeEntities(t),cont);
    let n = buildElem('DIV','pickName',undefined,cont);
    if (p.player) {
      n.innerHTML = `${s.player.fName} ${s.player.lName} <span class="num">(${s.player.pos} #${s.player.id})</span>`;
    }
  }
  for (let p of response.players) {
    let cont = buildElem('DIV','cell',undefined,document.getElementsByClassName('page')[2]);
    let top = buildElem('DIV','playerTop',undefined,cont);
    top.innerHTML = decodeEntities(`${p.fName} ${p.lName}&nbsp;<span class="num">(${p.pos} #${p.id})</span>`);
    let icon = buildElem('SVG',undefined,'0 0 24 24',top);
    let d = 'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z';
    buildElem('PATH',undefined,d,icon);
    buildElem('TITLE',undefined,'More Details',icon);
    icon.setAttribute('role','button');
    icon.addEventListener('click',function() { this.parentElement.nextElementSibling.classList.toggle('show') });
    let bot = buildElem('DIV','playerBot',undefined,cont);
    buildElem('DIV','playerCell','Stat',bot);
    buildElem('DIV','playerCell','Mean',bot);
    let t = buildElem('DIV','playerCell',undefined,bot);
    t.innerHTML = '<abbr title="Standard Deviation">Std. Dev.</abbr>';
    buildElem('DIV','playerCell','Rank',bot);
    let a = [p.stat1,p.stat2,p.stat3,p.stat4];
    for (let x of a) {
      let c = buildElem('DIV','playerCell',undefined,bot);
      c.innerHTML = x.h;
      buildElem('DIV','playerCell',x.m,bot);
      buildElem('DIV','playerCell',x.s,bot);
      let b = buildElem('DIV','playerCell',undefined,bot);
      let r = buildElem('DIV',['ranking',x.r.cls],x.r.abbr,b);
      r.title = x.r.name;
    }
  }
}

function viewMoreStories() {
  let count = 0;
  let i = 0;
  for (let e of document.getElementsByClassName('storyCell')) {
    if (e.style.display == 'none') {
      e.style.display = 'block';
      count++;
    }
    i++;
    if (count == 5) {
      break;
    }
  }
  if (i == document.getElementsByClassName('storyCell').length) {
    document.getElementById('moreStories').style.display = 'none';
  }
}