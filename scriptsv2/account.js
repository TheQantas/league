function signOut() {
  ws.mail({method:'signOut'});
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  location.reload();
  return false;
}

function univSignOut() {
  ws.mail({method:'univSignOut'});
}

function newPass(send) {
  let newPass = document.getElementById('newPass').value;
  let repeatPass = document.getElementById('repeatPass').value;
  if (newPass.length < 12) {
    return custom('Password must be at least 12 characters','changePass');
  }
  if (newPass != repeatPass && repeatPass != '') {
    return custom('Passwords must match','changePass');
  }
  custom('hide','changePass');
  if (send) {
    ws.mail({method:'changePass',password:newPass,oldPassword:document.getElementById('currentPass').value});
  }
}

function verifyEmail() {
  let email = document.getElementById('email').value;
  let pass = document.getElementById('emailPassword').value;
  ws.mail({method:'verifyEmail',email:email,password:pass});
  document.getElementById('emailCode').style.display = 'block';
}

function verifyCode(val) {
  if (val.length == 6) {
    ws.mail({method:'verifyCode',code:val});
  }
}

function factorCode(val) {
  if (val.length == 6) {
    ws.mail({method:'verify2fa',code:val});
  }
}

function getQRCode() {
  ws.mail({method:'enable2fa',password:document.getElementById('factorPassword').value});
}