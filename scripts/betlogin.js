var temp;
var username;
var factTemp;

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'error') {
    error(response.mess);
  } else if (response.method == 'signedIn') {
    document.cookie = `userToken=${response.token}`;
    location.reload();
    return false;
  }
}

function goTo(num) {
  let pages = document.getElementsByClassName('page');
  for (let page of pages) {
    page.style.display = 'none';
  }
  pages[num].style.display = 'block';
  let btns = document.getElementsByClassName('methodBtn');
  for (let btn of btns) {
    btn.style.textDecoration = 'none';
  }
  if (btns[num]) {
    btns[num].style.textDecoration = 'underline';
  }
  document.getElementById('errorMess').textContent = '';
}

function check1(str) {
  if (str.length < 12) {
    document.getElementById('problem1').textContent = 'Password must be at least 12 characters';
  } else {
    document.getElementById('problem1').textContent = '';
    if (document.getElementById('setPass2').value != '') {
      check2(document.getElementById('setPass2').value);
    }
  }
}

function check2(str) {
  if (document.getElementById('setPass1').value != str) {
    document.getElementById('problem2').textContent = 'Passwords must match';
  } else {
    document.getElementById('problem2').textContent = '';
  }
}

function signIn() {
  var u = document.getElementById('unInp').value;
  var p = document.getElementById('psInp').value;
  var mess = {username:u,password:p,method:'signUserIn'};
  ws.send(JSON.stringify(mess));
}

function createAccount() {
  var ascii = /^[ -~]+$/;
  var uName = document.getElementById('createName').value;
  if (!ascii.test(uName)) {
    error('Username cannot have non-ASCII characters');
    return;
  }
  var str1 = document.getElementById('setPass1').value;
  var str2 = document.getElementById('setPass2').value;
  if (str1 != str2 || str1.length < 12) {
    error('Password is not valid');
    return;
  }
  let mess = {method:'createUser',username:uName,password:document.getElementById('setPass2').value};
  ws.send(JSON.stringify(mess));
}

function error(str) {
  document.getElementById('errorMess').textContent = str;
}