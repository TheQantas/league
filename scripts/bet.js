window.onload = () => {
  balance = Number(document.getElementById('balance').getAttribute('data-bal'));
  cost = Number(document.getElementById('balance').getAttribute('data-cost'));
}

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'error' && response.type == '505') {
    //document.cookie = `userToken=${response.token}`;
    location.reload();
    return false;
  } else if (response.method == 'error') {
    error(response.mess);
  } else if (response.method == 'madeBet') {
    styleBet(response);
  }
}

function signOut() {
  ws.send(JSON.stringify({method:'userSignOut',token:getCookie('userToken')}));
}

function changePage(num) {
  var pages = document.getElementsByClassName('page');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  var btns = document.getElementById('navCont').children;
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  btns[num].style.textDecoration = 'underline';
}

function error(mess) {
  let cont = document.getElementById('errorCont');
  cont.style.display = 'flex';
  cont.children[0].textContent = mess;
  setTimeout(function() { cont.style.display = 'none'; },3000);
}

function makeBet(elem,type) {
  if (elem.classList.contains('selected') || elem.classList.contains('notselected')) {
    error('You have already bet on this game');
    return;
  }
  console.log(elem,type);
  let mess = {method:'makeBet',token:getCookie('userToken'),type:type};
  if (type == 'away' || type == 'home') {
    mess.cat = 'win';
  } else {
    mess.cat = 'cover';
  }
  console.log(mess.cat);
  var grandParent = elem.parentElement.parentElement;
  mess.away = grandParent.getAttribute('data-away');
  mess.home = grandParent.getAttribute('data-home');
  ws.send(JSON.stringify(mess));
}

function styleBet(bet) {
  balance -= bet.amount;
  var str = `You Have ${numberWithCommas(balance)} Tokens - <wbr>All Bets Cost ${numberWithCommas(cost)} Tokens`;
  document.getElementById('balance').innerHTML = str;
  var boxes = document.getElementsByClassName('box');
  for (let box of boxes) {
    if (box.getAttribute('data-away') == bet.away && box.getAttribute('data-home') == bet.home) {
      if (bet.index > 0) {
        bet.index--;
        continue;
      }
      console.log(box);
      box.children[1].children[bet.opt].classList.add('selected');
      box.children[1].children[1 - bet.opt].classList.add('notselected');
      break;
    }
  }
}