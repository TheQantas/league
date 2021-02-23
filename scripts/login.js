var temp;
var username;
var factTemp;

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log(response);
  if (response.method == 'activated') {
    temp = response.temp;
    username = response.username;
    goTo(2);
  } else if (response.method == 'signedIn') {
    document.cookie = `token=${response.token}`;
    //window.location.href = `/${response.redirect}`;
    location.reload();
  } else if (response.method == 'error') {
    if (response.type == '505') {
      location.reload();
      return false;
    }
    document.getElementById('errorMess').textContent = response.mess;
  } else if (response.method == 'promptCode') {
    console.log('code prompted');
    document.getElementById('promptCode').textContent = response.mess;
    goTo(4);
    factTemp = response.temp;
    if (response.able == false) {
      document.getElementById('recoEnter').style.display = 'none';
    }
  } else if (response.method == 'promptUname') {
    goTo(3);
  } else if (response.method == 'promptFact') {
    goTo(5);
    factTemp = response.temp;
  }
}

function signIn() {
  var uname = document.getElementById('unInp').value;
  var pword = document.getElementById('psInp').value;
  var mess = {method:'signIn',username:uname,password:pword,id:document.getElementById('cont').getAttribute('data-id')};
  ws.send(JSON.stringify(mess));
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

function showDesc(num) {
  let conts = document.getElementsByClassName('recoverCont');
  for (let cont of conts) {
    cont.style.display = 'none';
  }
  conts[num].style.display = 'block';
}

function activate() {
  var username = document.getElementById('actiName').value;
  var code = document.getElementById('actiCode').value;
  var mess = {method:'activate',username:username,code:code};
  ws.send(JSON.stringify(mess));
}

function setPass() {
  var one = document.getElementById('setPass1').value;
  var two = document.getElementById('setPass2').value;
  if (one.length < 12 || one != two) {
    return;
  }
  var mess = {method:'setPass',temp:temp,username:username,password:one,id:document.getElementById('cont').getAttribute('data-id')};
  ws.send(JSON.stringify(mess));
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

function checkFact(str) {
  if (str.length == 6) {
    let mess = {method:'signIn2fa',code:str,temp:factTemp,username:document.getElementById('unInp').value};
    mess.id = document.getElementById('cont').getAttribute('data-id');
    ws.send(JSON.stringify(mess));
  }
}

function forgotPass() {
  var uname = document.getElementById('unInp').value;
  var unam2 = document.getElementById('recoUname').value;
  if (uname.length > 3) {
    username = uname;
    let mess = {method:'forgotPass',username:uname};
    ws.send(JSON.stringify(mess));
  } else if (unam2.length > 3) {
    username = unam2;
    let mess = {method:'forgotPass',username:unam2};
    ws.send(JSON.stringify(mess));
  } else {
    goTo(3);
  }
}

function checkReco(str) {
  if (str.length == 6) {
    let mess = {method:'checkRecoCode',username:username,code:str,temp:factTemp};
    ws.send(JSON.stringify(mess));
  }
}
