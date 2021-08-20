window.onload = () => {
  let x = 0;
  setInterval(() => {
    document.getElementsByTagName('main')[0].style.backgroundPosition = `${x -= 0.5}px 0px`;
  },20);
}

window.addEventListener('dark',() => {
  let elem = document.getElementsByTagName('main')[0];
  let src = elem.style.backgroundImage;
  if (src.indexOf('_dark') != -1) {
    elem.style.backgroundImage = src.replace('_dark','');
  } else {
    elem.style.backgroundImage = src.replace('.png','_dark.png');
  }
});

var factorTemp;
var actTemp;

ws.onmessage = message => {
  var response = JSON.parse(message.data);
  if (response.method == 'signedIn') {
    document.cookie = `token=${response.token}`;
    location.reload();
  } else if (response.method == 'error') {
    if (response.type == '505') {
      location.reload();
      return false;
    }
    error(response.text);
  } else if (response.method == 'prompt2fa') {
    toPage('page',undefined,1);
    factorTemp = response.temp;
    document.getElementById('2faCode').focus();
  } else if (response.method == 'activated') {
    toPage('page',undefined,3);
    actTemp = response.temp;
    document.getElementById('setPass').focus();
  } else if (response.method == 'sentEmail') {
    toPage('page',undefined,6);
    document.getElementById('emailMess').textContent = `A code was sent to ${response.star}`;
    document.getElementById('emailCode').focus();
    setTimeout(() => {
      document.getElementById('resend').style.display = 'block';
    },120*1000);
  }
}

function signIn() {
  var uname = document.getElementById('mainUser').value;
  var pword = document.getElementById('mainPass').value;
  ws.mail({method:'signIn',username:uname,password:pword});
}

function checkCode(str) {
  if (str.length == 6) {
    let mess = {method:'signIn2fa',code:str,temp:factorTemp,username:document.getElementById('mainUser').value};
    ws.mail(mess);
  }
}

function activate() {
  let res = {method:'activate'};
  res.mascot = document.getElementById('actUser').value;
  res.code = document.getElementById('actCode').value;
  ws.mail(res);
}

function checkValid() {
  var set = document.getElementById('setPass').value;
  var con = document.getElementById('conPass').value;
  var err = document.getElementById('setError');
  var issue = false;
  if (set.length < 12) {
    err.textContent = 'Your password must be at least 12 characters';
    issue = true;
  } else if (set != con && con != '') {
    err.textContent = 'The passwords must match';
    issue = true;
  }
  if (issue) {
    err.style.display = 'block';
    return false;
  } else {
    err.style.display = 'none';
    return true;
  }
}

function setPassword() {
  if (!checkValid()) {
    return error('Password is not valid');
  }
  let res = {method:'setPassword'};
  res.username = document.getElementById('actUser').value;
  res.password = document.getElementById('conPass').value;
  res.temp = actTemp;
  ws.mail(res);
}

function recover() {
  let uname = document.getElementById('mainUser').value;
  if (uname != '') {
    document.getElementById('recUser').value = uname;
    toPage('page',undefined,5);
  } else {
    toPage('page',undefined,4);
  }
}

function checkUname() {
  if (document.getElementById('recUser').value.length > 3) {
    toPage('page',undefined,5);
  }
}

function email() {
  ws.mail({method:'sendEmail',username:document.getElementById('recUser').value});
}

function checkEmailCode(str) {
  if (str.length == 6) {
    let mess = {method:'checkEmailCode',code:str,username:document.getElementById('recUser').value};
    ws.mail(mess);
  }
}

function recoverCode() {
  let mess = {method:'checkRecoCode',code:document.getElementById('recoCode').value,username:document.getElementById('recUser').value};
  ws.mail(mess);
}