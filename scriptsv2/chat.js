function showChat(abbr) {
  document.getElementById('chatBox').value = '';
  channel = abbr;
  document.getElementById('chatMain').style.display = 'block';
  document.getElementById('chatMainTop').innerHTML = '';
  for (let e of document.getElementsByClassName('chatButton')) {
    e.classList.remove('selected');
  }
  document.getElementById(`chatWith${abbr}`).classList.add('selected');
  if (abbr == 'ALE') {
    document.getElementById('chatBox').disabled = true;
    document.getElementById('chatBox').placeholder = 'You Cannot Send Alerts';
    document.getElementById('chatSend').classList.add('disabled');
  } else {
    document.getElementById('chatBox').disabled = false;
    document.getElementById('chatBox').placeholder = 'Enter Message Here';
    document.getElementById('chatSend').classList.remove('disabled');
  }
  ws.mail({method:'getChannel',channel:abbr});
}

function loadChannel(chats) {
  for (let c of chats) {
    newMessage(c);
  }
}

function post() {
  ws.mail({method:'postMessage',message:document.getElementById('chatBox').value,to:channel});
  document.getElementById('chatBox').value = '';
}

function newMessage(res) {
  let cont = buildElem('DIV','messageRow',undefined,document.getElementById('chatMainTop'));
  let bub = buildElem('DIV','messageBubble',res.message,cont);
  if (res.sentFrom == document.body.getAttribute('data-abbr')) {
    cont.classList.add('right');
  } else {
    cont.classList.add('left');
  }
  buildElem('BR',undefined,undefined,bub);
  buildElem('SPAN',undefined,getFormatTime(res.sent),bub);
  var div = document.getElementById('chatMainTop');
  div.scrollTop = div.scrollHeight - div.clientHeight;
}