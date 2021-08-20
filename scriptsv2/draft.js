var pinnedPlayers = [];
var clock = 20;
var clockInt = false;
var songs = [4];
var mute = false;

ws.onmessage = message => {
  var response = JSON.parse(message.data);
  if (response.method == 'gottenAssets') {
    handleAssets(response);
  } else if (response.method == 'tradeOffered') {
    if (response.to == document.body.getAttribute('data-abbr')) {
      error('You have a new trade offer!');
    }
    newTrade = response.trade;
    renderTrade(response.trade)
  } else if (response.method == 'tradeUpdate') {
    updateTrade(response);
  } else if (response.method == 'gottenChannel') {
    loadChannel(response.chats);
  } else if (response.method == 'postedMessage') {
    newMessage(response);
  } else if (response.method == 'error') {
    error(response.text);
  } else if (response.method == 'getPinned') {
    ws.mail({method:'gottenPinned',pinned:getCookie('pinned')})
  } else if (response.method == 'draftedPlayer') {
    announcePick(response);
  } else if (response.method == 'draftStarted') {
    music.play();
    startClock();
    let clean = getAttrFromAbbr('clean',response.team);
    document.getElementById('homeCont').className = clean;
    document.getElementById('announceCont').className = clean;
    document.getElementById('silhCont').className = clean;
    document.getElementById('homeLogo').src = `logos/${clean}_t.png`;
    document.getElementsByClassName('pickCell')[2].textContent = 1;
    document.getElementsByClassName('pickCell')[3].textContent = 1;
    changeDraftStyle(response.team);
    for (let i = 0; i < 3; i++) {
      document.getElementsByClassName('rightRow')[i].textContent = response.three[i];
    }
  } else if (response.method == 'endOfDraft') {
    setTimeout(() => { window.location.href = '/office'; }, Math.random() * 20 * 1000);
  } else if (response.method == 'breaking') {
    breaking(response.text);
  } else if (response.method == 'updatePicks') {
    updatePicks(response.picks);
  }
}

ws.onopen = () => {
  ws.mail({method:'connectAsTeam',needed:false});
}

window.onload = () => {
  var kids = document.getElementsByClassName('playerPage')[11].children;
  for (let i = 2; i < kids.length; i++) {
    kids[i].setAttribute('draggable',true);
    kids[i].ondrag = drag;
    kids[i].ondragend = drop;
  }
  if (document.getElementById('chatMain')) {
    document.getElementById('chatMain').addEventListener('keydown',function(e) {
      var evtobj = window.event ? event : e;
      if (evtobj.keyCode == 13 && evtobj.ctrlKey) {
        post();
      }
    });
  }
  audio = document.getElementById('audio');
  music = document.getElementById('music');
  music.onended = newSong;
  clock = Number(document.getElementById('pickClock').getAttribute('data-time'));
  if (document.getElementById('pickClock').getAttribute('data-started') == 'true') {
    startClock();
    setTimeout(() => { music.play(); }, 1500);
  }
}

function updatePicks(picks) {
  for (let p of picks) {
    let row = document.getElementById(`pick${p.pick}`);
    let str = `${JSON.parse(p.trades)[0]} `;
    for (let k = 1; k < JSON.parse(p.trades).length; k++) {
      str += `&#9654;&nbsp;${JSON.parse(p.trades)[k]}`;
    }
    str = decodeEntities(str);
    row.children[2].textContent = str;
    row.children[0].src = `/logos/${getAttrFromAbbr('clean',p.team)}_g.png`;
    if (document.getElementById(`slide${p.pick}`)) {
      document.getElementById(`slide${p.pick}`).textContent = `${p.pick + 1}. ${p.team}`;
    }
  }
}

function changeDraftStyle(abbr) {
  var mascot = getAttrFromAbbr('clean',abbr);
  document.getElementById('pickLogo').src = `logos/${mascot}_c.png`;
  document.getElementById('pickLogoCont').style.backgroundImage = `url('../logos/${mascot}.png')`;
  document.getElementById('footTop').className = mascot;
  document.getElementById('pickText').textContent = `${getAttrFromAbbr('mascot',abbr)} are on the clock`;
  document.getElementById('homeCont').className = mascot;
  document.getElementById('announceCont').className = mascot;
  document.getElementById('homeLogo').src = `logos/${mascot}_t.png`;
}

function breaking(str) {
  document.getElementById('breaking').style.display = 'block';
  document.getElementById('bn').style.letterSpacing = '5px';
  var iter = 0;
  var ani = setInterval(() => {
    iter += 0.5;
    document.getElementById('bn').style.letterSpacing = `${5 + iter}px`;
    if (iter == 5) {
      clearInterval(ani);
      breaking_call(str);
    }
  },50);
}

function breaking_call(str) {
  document.getElementById('tx').style.display = 'block';
  var bn = document.getElementById('bn');
  var tx = document.getElementById('tx');
  bn.style.left = `${bn.offsetLeft}px`;
  bn.style.position = 'absolute';
  tx.style.position = 'absolute';
  tx.style.left = `${bn.offsetLeft + bn.offsetWidth}px`;
  tx.style.display = 'block';
  tx.textContent = '- ' + str;
  var iter = 0;
  var a = bn.offsetLeft;
  var b = bn.offsetLeft + bn.offsetWidth;
  var ani = setInterval(() => {
    iter += 3;
    bn.style.left = `${a - iter}px`;
    tx.style.left = `${b - iter}px`;
    if (tx.offsetLeft + tx.offsetWidth <= 0) {
      clearInterval(ani);
      setTimeout(() => {
        bn.style.position = 'relative';
        tx.style.position = 'relative';
        tx.style.left = '';
        bn.style.left = '';
        document.getElementById('breaking').style.display = 'none';
        document.getElementById('tx').style.display = 'none';
      },500);
    }
  },25);
}

function pin(elem) {
  var cont = elem.parentElement.parentElement;
  var kids = document.getElementsByClassName('playerPage')[11].children;
  for (let i = 2; i < kids.length; i++) {
    if (kids[i].getAttribute('data-id') == cont.getAttribute('data-id')) {
      return;
    }
  }
  var node = cont.cloneNode(true);
  node.setAttribute('draggable',true);
  node.ondrag = drag;
  node.ondragend = drop;
  node.querySelector('.pin').onclick = '';
  node.querySelector('.pin').addEventListener('click',function(){ unpin(this); });
  node.querySelector('.pin').children[0].setAttribute('d','M2,5.27L3.28,4L20,20.72L18.73,22L12.8,16.07V22H11.2V16H6V14L8,12V11.27L2,5.27M16,12L18,14V16H17.82L8,6.18V4H7V2H17V4H16V12Z');
  node.querySelector('.pin').children[1].textContent = 'Unpin Player';
  document.getElementsByClassName('playerPage')[11].append(node);
  updateList();
}

function unpin(elem) {
  elem.parentElement.parentElement.remove();
  updateList();
}

function updateList() {
  pinnedPlayers.length = 0;
  var kids = document.getElementsByClassName('playerPage')[11].children;
  for (let i = 2; i < kids.length; i++) {
    pinnedPlayers.push(kids[i].getAttribute('data-id'));
  }
  document.cookie = `pinned=${JSON.stringify(pinnedPlayers)}`;
}

function drag(item) {
  const selectedItem = item.target, list = selectedItem.parentNode, x = event.clientX, y = event.clientY;
  let swapItem = document.elementFromPoint(x, y) === null ? selectedItem : document.elementFromPoint(x, y);
  if (list === swapItem.parentNode) {
    swapItem = swapItem !== selectedItem.nextSibling ? swapItem : swapItem.nextSibling;
    list.insertBefore(selectedItem, swapItem);
  }
}

function drop() {
  updateList();
}

function startClock() {
  if (clockInt !== false) {
    return;
  }
  c = (clock<10)?`0${clock}`:clock;
  document.getElementById('pickClock').textContent = `0:${c}`;
  clockInt = setInterval(() => {
    clock--;
    c = (clock<10)?`0${clock}`:clock;
    document.getElementById('pickClock').textContent = `0:${c}`;
    if (clock == 0) {
      stopClock();
    }
  },1000);
}

function stopClock() {
  clearInterval(clockInt);
  clockInt = false;
}

function draftPlayer(elem) {
  ws.mail({method:'draftPlayer',id:elem.parentElement.parentElement.getAttribute('data-id')});
}

function announcePick(res) {
  document.getElementById('announceCont').children[0].style.letterSpacing = '5px';
  document.getElementById('announceCont').children[1].style.letterSpacing = '5px';
  if (!mute) {
    var i = 0;
    var volInt = setInterval(() => {
      i++;
      music.volume = 1 - 0.1 * i;
      if (i == 8) {
        clearInterval(volInt);
      }
    },20);
  }
  for (let i = 0; i < 3; i++) {
    document.getElementsByClassName('rightRow')[i].textContent = res.three[i];
  }
  audio.play();
  stopClock();
  document.getElementById('pickText').textContent = 'the pick is in';
  document.getElementById('homeCont').style.display = 'none';
  document.getElementById('announceCont').style.display = 'block';
  document.getElementById('announceCont').children[0].textContent = getAttrFromAbbr('mascot',res.team).toUpperCase();
  var spacing = 5;
  var ani = setInterval(() => {
    spacing += 0.5;
    document.getElementById('announceCont').children[0].style.letterSpacing = `${spacing}px`;
    document.getElementById('announceCont').children[1].style.letterSpacing = `${spacing}px`;
    if (spacing == 30) {
      clearInterval(ani);
      document.getElementById('announceCont').style.display = 'none';
      document.getElementById('silhFName').textContent = res.player.fName;
      document.getElementById('silhLName').textContent = res.player.lName;
      document.getElementById('silhPos').textContent = res.player.pos;
      if (res.auto) {
        document.getElementById('silhId').textContent = `#${res.player.id}*`;
      } else {
        document.getElementById('silhId').textContent = `#${res.player.id}`;
      }
      document.getElementById('silhCont').style.display = 'flex';
      document.getElementById(`pick${res.pick}`).children[3].innerHTML = `${res.player.fName} ${res.player.lName} <span class="num">(${res.player.pos} #${res.player.id})</span>`
      for (let e of document.getElementsByClassName('playerRow')) {
        if (e.getAttribute('data-id') == res.player.id) {
          e.remove();
        }
      }
      setTimeout(() => {
        clock = (res.pick>=159)?15:20;
        startClock();
        let clean = getAttrFromAbbr('clean',res.next);
        document.getElementById('homeCont').style.display = 'block';
        document.getElementById('homeCont').className = clean;
        document.getElementById('announceCont').className = clean;
        document.getElementById('silhCont').className = clean;
        document.getElementById('homeLogo').src = `logos/${clean}_t.png`;
        changeDraftStyle(res.next);
        document.getElementById('footBot').children[1].remove();
        if (res.soon != 'LEA') {
          let slide = buildElem('DIV','footBotCell',`${res.pick+21}. ${res.soon}`,document.getElementById('footBot'));
          slide.id = `slide${res.pick+20}`;
        } else {
          let slide = buildElem('DIV','footBotCell','-------',document.getElementById('footBot'));
          slide.style.color = 'var(--main)';
        }
        document.getElementById('silhCont').style.display = 'none';
        if (res.pick < 319) {
          document.getElementsByClassName('pickCell')[2].textContent = Math.floor((res.pick + 1) / 40) + 1;
          document.getElementsByClassName('pickCell')[3].textContent = (res.pick + 1) % 40 + 1;
        } else {
          document.getElementsByClassName('pickCell')[2].textContent = '-';
          document.getElementsByClassName('pickCell')[3].textContent = '-';
        }
        if (!mute) {
          var i = 0;
          var volInt = setInterval(() => {
            i++;
            music.volume = 0.2 + 0.1 * i;
            if (i == 8) {
              clearInterval(volInt);
            }
          },20);
        }
      },2500);
    }
  },40);
}

function newSong() {
  var rand = Math.floor(Math.random() * 11);
  while (songs.includes(rand)) {
    rand = Math.floor(Math.random() * 11);
  }
  if (songs.length >= 8) {
    songs.shift();
  }
  songs.push(rand);
  music.src = `audio/music/song${rand}.mp3`;
  music.play();
}

function toggleMusic() {
  var e = document.getElementById('songToggle');
  if (mute) {
    music.volume = 1;
    e.children[0].textContent = 'Mute Music';
    e.children[1].setAttribute('d','M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z');
  } else {
    music.volume = 0;
    e.children[0].textContent = 'Unmute Music';
    e.children[1].setAttribute('d','M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z');
  }
  mute = !mute;
}