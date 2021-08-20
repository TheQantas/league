function makeTrade() {
  document.getElementById('tradeMain').style.display = 'flex';
  document.getElementById('tradeCont').style.overflowY = 'hidden';
  document.getElementById('tradeMake').style.display = 'none';
}

function getAssets(to) {
  var req = {method:'getAssets',to:to,from:document.body.getAttribute('data-abbr')};
  ws.mail(req);
}

var counterId;

function handleAssets(res) {
  document.getElementsByClassName('tradeDesc')[0].textContent = `${getAttrFromAbbr('mascot',res.from)} get`;
  document.getElementsByClassName('tradeDesc')[1].textContent = `${getAttrFromAbbr('mascot',res.to)} get`;
  document.getElementById('tradeOptLeft').innerHTML = '';
  document.getElementById('tradeOptRight').innerHTML = '';
  loopPlayers(res.fromAssets.players,'Right');
  loopPlayers(res.toAssets.players,'Left');
  loopPicks(res.fromAssets.picks,'Right');
  loopPicks(res.toAssets.picks,'Left');
}

function loopPlayers(list,side) {
  for (let a of list) {
    let label = buildElem('label','container',`${a.fName} ${a.lName} (${a.pos} #${a.id})`,document.getElementById(`tradeOpt${side}`));
    let inp = document.createElement('INPUT');
    inp.setAttribute('type','checkbox');
    inp.setAttribute('name',side.toLowerCase());
    inp.setAttribute('data-type','player');
    inp.setAttribute('data-id',a.id);
    label.append(inp);
    buildElem('span','checkmark',undefined,label);
  }
}

function loopPicks(list,side) {
  for (let a of list) {
    let label = buildElem('label','container',`RD ${Math.floor(a.pick / 40) + 1} PK ${a.pick % 40 + 1} (${ordinal(a.pick+1)} overall)`,document.getElementById(`tradeOpt${side}`));
    let inp = document.createElement('INPUT');
    inp.setAttribute('type','checkbox');
    inp.setAttribute('name',side.toLowerCase());
    inp.setAttribute('data-type','pick');
    inp.setAttribute('data-pick',a.pick);
    label.append(inp);
    buildElem('span','checkmark',undefined,label);
  }
}

function offerTrade() {
  if (document.getElementById('tradeSel').value == '') {
    return error('Select trade partner');
  }
  var from = [];
  var to = [];
  for (let e of document.getElementsByName('left')) {
    if (e.checked) {
      to.push({type:e.getAttribute('data-type'),pick:Number(e.getAttribute('data-pick')),id:e.getAttribute('data-id')});
    }
  }
  for (let e of document.getElementsByName('right')) {
    if (e.checked) {
      from.push({type:e.getAttribute('data-type'),pick:Number(e.getAttribute('data-pick')),id:e.getAttribute('data-id')});
    }
  }
  if (from.length == 0 || to.length == 0) {
    return error('Both teams must get something');
  }
  ws.mail({method:'offerTrade',to:document.getElementById('tradeSel').value,fromOffer:from,toOffer:to,counterId:counterId});
  document.getElementById('tradeMain').style.display = 'none';
  document.getElementById('tradeCont').style.overflowY = '';
  counterTo = undefined;
  counterId = undefined;
}

function renderTrade(trade) {
  let row = document.createElement('DIV');
  row.className = 'tradeRow';
  document.getElementById('tradeCont').prepend(row);
  row.setAttribute('data-id',trade.id);
  let top = buildElem('DIV','tradeTop',undefined,row);
  buildElem('IMG','tradeLogo',`logos/${getAttrFromAbbr('clean',trade.from)}_g.png`,top);
  buildElem('DIV','tradeTopText',decodeEntities(`${trade.from} &#9654; ${trade.to}`),top);
  buildElem('IMG','tradeLogo',`logos/${getAttrFromAbbr('clean',trade.to)}_g.png`,top);
  buildElem('DIV','tradeTopText',decodeEntities(` | ${getFormatTime(trade.time,true)} &middot; ${trade.status.toUpperCase()}`),top);
  let more = buildElem('SVG',undefined,'0 0 24 24',top);
  more.setAttribute('role','button');
  more.addEventListener('click',function() { this.parentElement.nextElementSibling.classList.toggle('show'); });
  buildElem('TITLE',undefined,'Show Details',more);
  buildElem('PATH',undefined,'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z',more);
  let trash = buildElem('SVG','delete','0 0 24 24',top);
  trash.addEventListener('click',function() { hideTrade(this); });
  trash.setAttribute('role','button');
  buildElem('TITLE',undefined,'Hide Trade',trash);
  buildElem('PATH',undefined,'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z',trash);
  let bot = buildElem('DIV','tradeBot',undefined,row);
  let grid = buildElem('DIV','tradeTable',undefined,bot);
  for (let o of trade.fromOffer.concat(trade.toOffer)) {
    if (o.type == 'player') {
      o.text = `${o.ath.fName} ${o.ath.lName} <span class="num">(${o.ath.pos} #${o.ath.id})</span>`;
    } else {
      o.text = `RD ${Math.floor(o.pick / 40) + 1} PK ${o.pick % 40 + 1} <span class="num">(${ordinal(o.pick + 1)} Overall)</span>`;
    }
  }
  if (trade.toOffer.length != trade.fromOffer.length) {
    if (trade.toOffer.length > trade.fromOffer.length) {
      while (trade.toOffer.length != trade.fromOffer.length) {
        trade.fromOffer.push({text:''});
      }
    } else if (trade.toOffer.length < trade.fromOffer.length) {
      while (trade.toOffer.length != trade.fromOffer.length) {
        trade.toOffer.push({text:''});
      }
    }
  }
  trade.fromOffer.unshift({text:`${getAttrFromAbbr('mascot',trade.to)} Get`});
  trade.toOffer.unshift({text:`${getAttrFromAbbr('mascot',trade.from)} Get`});
  for (let i = 0; i < trade.toOffer.length; i++) {
    let cell = document.createElement('DIV');
    cell.className = 'tradeCell';
    cell.innerHTML = trade.toOffer[i].text;
    grid.append(cell);
    let cell2 = document.createElement('DIV');
    cell2.className = 'tradeCell';
    cell2.innerHTML = trade.fromOffer[i].text;
    grid.append(cell2);
  }
  let action = buildElem('DIV','tradeActionCont',undefined,bot);
  let discuss = buildElem('BUTTON',['tradeAction','discuss'],'Discuss',action);
  discuss.addEventListener('click',function() { discussTrade(this); });
  if (trade.from == document.body.getAttribute('data-abbr')) {
    let retract = buildElem('BUTTON',['tradeAction','retract'],'Retract',action);
    retract.addEventListener('click',function() { retractTrade(this); });
  } else {
    let accept = buildElem('BUTTON',['tradeAction','accept'],'Accept',action);
    accept.addEventListener('click',function() { this.parentElement.style.display='none';this.parentElement.nextElementSibling.style.display='flex'; });
    let counter = buildElem('BUTTON',['tradeAction','counter'],'Counter',action);
    counter.addEventListener('click',function() { counterTrade(this); });
    let decline = buildElem('BUTTON',['tradeAction','decline'],'Decline',action);
    decline.addEventListener('click',function() { declineTrade(this); });
    let action2 = buildElem('DIV','tradeActionCont',undefined,bot);
    action2.style.display = 'none';
    let cancel = buildElem('BUTTON',['tradeAction','cancel'],'Cancel',action2);
    cancel.addEventListener('click',function() { this.parentElement.style.display='none';this.parentElement.previousElementSibling.style.display='flex'; });
    let confirm = buildElem('BUTTON',['tradeAction','confirm'],'Confirm',action2);
    confirm.addEventListener('click',function() { confirmTrade(this,trade.fromTeam); });
  }
  buildElem('SPAN','tradeId',`ID: ${trade.id}`,bot);
}

function discussTrade(elem) {
  let str = elem.parentElement.parentElement.previousElementSibling.children[1].textContent;
  let id = elem.parentElement.parentElement.parentElement.getAttribute('data-id');
  let a = str.substring(0,3);
  let b = str.substring(str.length - 3,str.length);
  let other = (document.body.getAttribute('data-abbr')==a)?b:a;
  document.getElementById('tradeCont').style.display = 'none';
  document.getElementById('chatCont').style.display = 'block';
  document.getElementById('tradeBtn').style.textDecoration = 'none';
  document.getElementById('chatBtn').style.textDecoration = 'underline';
  showChat(other);
  document.getElementById('chatBox').value = `I wanted to talk to you about a trade (ID ${id}).`;
}

function retractTrade(elem) {
  ws.mail({method:'retractTrade',id:elem.parentElement.parentElement.parentElement.getAttribute('data-id')});
}

function counterTrade(elem,abbr) {
  counterTo = abbr;
  counterId = elem.parentElement.parentElement.parentElement.getAttribute('data-id');
  offerToTeam(abbr);
}

function declineTrade(elem) {
  ws.mail({method:'declineTrade',id:elem.parentElement.parentElement.parentElement.getAttribute('data-id')});
}

function confirmTrade(elem) {
  ws.mail({method:'acceptTrade',id:elem.parentElement.parentElement.parentElement.getAttribute('data-id')});
}

function offerToTeam(abbr) {
  document.getElementById('tradeCont').style.overflowY = 'hidden';
  document.getElementById('tradeMain').style.display = 'flex';
  document.getElementById('tradeSel').value = abbr;
  ws.mail({method:'getAssets',to:abbr,from:document.body.getAttribute('data-abbr')});
}

function updateTrade(res) {
  for (let e of document.getElementsByClassName('tradeRow')) {
    if (e.getAttribute('data-id') == res.id) {
      e.children[0].children[3].textContent = decodeEntities(` | ${getFormatTime(res.time,true)} &middot; ${res.status}`);
      while (e.children[1].children[1].classList.contains('tradeActionCont')) {
        e.children[1].children[1].remove();
      }
      break;
    }
  }
}

function hideTrade(elem) {
  var e = elem.parentElement.parentElement;
  ws.mail({method:'hideTrade',id:e.getAttribute('data-id')});
  e.remove();
}

function closeTradeWindow(elem) {
  counterTo = undefined;
  counterId = undefined;
  elem.parentElement.parentElement.parentElement.style.display = 'none';
  document.getElementById('tradeCont').style.overflowY = '';
  document.getElementById('tradeMake').style.display = 'flex';
}