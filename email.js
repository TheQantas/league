const nodemailer = require('nodemailer');
const { google } = require('googleapis');

exports.star = str => {
  var a = str.indexOf('@');
  var addr = str.substring(0,a);
  var domain = str.substring(a,str.length);
  var three = addr.substring(0,3);
  var rest = addr.substring(3,addr.length).replace(/./g,'*');
  return three + rest + domain;
}

exports.recover = (code,email) => {
  module.exports.send('The League Account Recovery','The League Verification Code',`<div style="width:100%;height:50px;padding:5px 0;background-color:rgb(72,72,72);"><img style="height:50px;display:block;margin:auto;" src="https://theleague.football/images/logo.png"></div>
  <div style="padding: 10px 20px;background-color:rgb(48,48,48)"><span style="color:white;font-family:sans-serif;font-size:24px;font-weight:bold;">Your Account Recovery Code: </span><div style="background-color:rgb(72,168,165);height:80px;line-height:80px;text-align:center;font-family:monospace;color:white;width:100%;font-size:72px;">${code}</div><span style="color:white;font-family:sans-serif;font-size:16px;font-weight:bold;font-style:italic;">Your code will expire in 2 minutes</span></div>`,email,true);
}

exports.verify = (code,email) => {
  module.exports.send('The League Account Verification','The League Verification Code',`<div style="width:100%;height:50px;padding:5px 0;background-color:rgb(72,72,72);"><img style="height:50px;display:block;margin:auto;" src="https://theleague.football/images/logo.png"></div>
  <div style="padding: 10px 20px;background-color:rgb(48,48,48)"><span style="color:white;font-family:sans-serif;font-size:24px;font-weight:bold;">Your Verification Code: </span><div style="background-color:rgb(72,168,165);height:80px;line-height:80px;text-align:center;font-family:monospace;color:white;width:100%;font-size:72px;">${code}</div><span style="color:white;font-family:sans-serif;font-size:16px;font-weight:bold;font-style:italic;">Your code will expire in 2 minutes</span></div>`,email,true);
}

exports.send = (sender,subject,body,email,html) => {
  if (typeof email == 'object') {
    email = email.toString();
  }
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2 (
    '387838291357-6mrb7amno61kcsnc4vhd7f8oam9hd9tb.apps.googleusercontent.com', // ClientID
    '92aCj1s05Q4QtCFH5JS0he6e', // Client Secret
    'https://developers.google.com/oauthplayground' // Redirect URL
  );
  oauth2Client.setCredentials({
    refresh_token: '1//04wXufTybZsq5CgYIARAAGAQSNwF-L9IrB9br_cHNtnwo_LY_TbvkyCdjYQ96whlmdoqxZWWCXs81z3ZqNlXHjlr7xbrRMKZcngc'
  });
  var accessToken = oauth2Client.getAccessToken()
  var smtpTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'theleagueupdates@gmail.com', 
      clientId: '387838291357-6mrb7amno61kcsnc4vhd7f8oam9hd9tb.apps.googleusercontent.com',
      clientSecret: '92aCj1s05Q4QtCFH5JS0he6e',
      refreshToken: '1//04wXufTybZsq5CgYIARAAGAQSNwF-L9IrB9br_cHNtnwo_LY_TbvkyCdjYQ96whlmdoqxZWWCXs81z3ZqNlXHjlr7xbrRMKZcngc',
      accessToken: accessToken
    }
  });
  var mailOptions = {
    from: `"${sender}" theleagueupdates@gmail.com`,
    to: email,
    subject: subject,
  };
  if (html) {
    mailOptions.generateTextFromHTML = true;
    mailOptions.html = body;
  } else {
    mailOptions.text = body;
  }
  smtpTransport.sendMail(mailOptions,(error,response) => {
    smtpTransport.close();
    if (error) {
      console.log(error);
    } else {
      console.log(true,response);
    }
  });
}