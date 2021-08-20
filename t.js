exports.getTeams = () => {
  for (let x of t) {
    x.clean = x.mascot.toLowerCase().replace(/\s/g,'');
  }
  return t;
}

exports.getStats = () => {
  return s;
}

exports.getStatsByPos = () => {
  return s;
}

exports.getTeamFromAbbr = abbr => {
  if (abbr == 'CFC') {
    return {abbr:'CFC',clean:'cfc',mascot:'CFC',division:'CFC'};
  } else if (abbr == 'NFC') {
    return {abbr:'NFC',clean:'nfc',mascot:'NFC',division:'NFC'};
  } else if (abbr == 'ALE') {
    return {abbr:'ALE',clean:'alerts',mascot:'Alerts',division:'League'};
  }
  for (let x of t) {
    if (x.abbr == abbr) {
      x.clean = x.mascot.toLowerCase().replace(/\s/g,'');
      return x;
    }
  }
}

exports.allExcept = abbr => {
  let exp = [];
  for (let x of t) {
    if (x.abbr != abbr) {
      exp.push(x.abbr);
    }
  }
  return exp;
}

exports.getMascots = () => {
  let exp;
  for (let x of t) {
    exp.push(x.mascot);
  }
  return exp;
}

exports.getAbbrs = () => {
  return abbrs;
}

var abbrs = ['FLA','FOX','NAT','PEN','GRE','PAN','PIR','SNA','DRA','ENG','PIO','REB','COU','FAL','GRI','WAR','AAR','COO','ROT','SEN','BAD','HUM','LON','WOL','AVI','CHA','EAG','GAL','CHE','PEG','STR','ZEB','COL','HUS','LYN','STA','GOL','REB','SHA','SQU'];

var s = {};
s['QB'] = [{js:'acc',ln:'Accuracy',sn:'Acc.',m:0.87,d:0.12},{js:'longAcc',ln:'Long Accuracy',sn:'Long Acc.',m:0.77,d:0.12},{js:'pressPen',ln:'Pressure Penalty',sn:'Press. Pen.',m:0.09,d:0.06,flip:true},{js:'passDelay',ln:'Throw Delay',sn:'Delay',m:4,d:3,flip:true}];
s['RB'] = [{js:'elus',ln:'Elusiveness',sn:'Elus.',m:0.75,d:0.12},{js:'block',ln:'Run Blocking',sn:'Run Block',m:0,d:3},{js:'puntReturn',ln:'Punt Return Distance',sn:'Punt Ret.',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
s['WR'] = [{js:'recep',ln:'Reception Rate',sn:'Recep.',m:0.9,d:0.6},{js:'longRecep',ln:'Long Reception Rate',sn:'Long Recep.',m:0.8,d:0.6},{js:'elus',ln:'Elusiveness',sn:'Elus.',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
s['TE'] = [{js:'recep',ln:'Reception Rate',sn:'Recep.',m:0.9,d:0.6},{js:'longRecep',ln:'Long Reception Rate',sn:'Long Recep.',m:0.8,d:0.6},{js:'elus',ln:'Elusiveness',sn:'Elus.',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:5,d:1.5}];
s['OL'] = [{js:'stuff',ln:'Stuff Rate',sn:'Stuff',m:0.3,d:0.12},{js:'holding',ln:'Holding Rate',sn:'Holding',m:0,d:3,flip:true},{js:'sackAv',ln:'Sack Avoidance',sn:'Sack Avoid.',m:0,d:3},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
s['DL'] = [{js:'escape',ln:'Escape Rate',sn:'Escape',m:0.3,d:0.12},{js:'pressPerc',ln:'Pressure Percentage',sn:'Pressure Perc.',m:0,d:3},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.5,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
s['LB'] = [{js:'escape',ln:'Escape Rate',sn:'Escape',m:0.3,d:0.12},{js:'pressPerc',ln:'Pressure Percentage',sn:'Pressure Perc.',m:0,d:3},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.5,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:2,d:1.5}];
s['CB'] = [{js:'cover',ln:'Cover Rate',sn:'Cover',m:0.9,d:0.6},{js:'int',ln:'Interception Rate',sn:'Int.',m:0.05,d:0.03},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.7,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:4,d:1.5}];
s['S'] = [{js:'cover',ln:'Cover Rate',sn:'Cover',m:0.9,d:0.6},{js:'int',ln:'Interception Rate',sn:'Int.',m:0.05,d:0.03},{js:'tackle',ln:'Tackle Rate',sn:'Tackle',m:0.7,d:0.12},{js:'speed',ln:'Speed',sn:'Speed',m:4,d:1.5}];
s['K'] = [{js:'pat',ln:'Point After Touchdown',sn:'PAT',m:0.95,d:0.06},{js:'fg',ln:'Field Goal',sn:'FG',m:0.9,d:0.06},{js:'longFg',ln:'Long Field Goal',sn:'Long FG',m:0.8,d:0.06},{js:'touchback',ln:'Touchback Rate',sn:'Touchback',m:0.8,d:0.12}];
s['P'] = [{js:'dist',ln:'Distance',sn:'Dist.',m:40,d:6},{js:'aware',ln:'Awareness',sn:'Aware.',m:0.3,d:0.06},{js:'blocked',ln:'Blocked Rate',sn:'Block',m:0.01,d:0.003,flip:true},{js:'oob',ln:'Out of Bounds',sn:'OOB',m:0.2,d:0.06,flip:true}];

var t = [];
t[0] = {abbr:'FLA',mascot:'Flamingos',division:'CFC North'};
t[1] = {abbr:'FOX',mascot:'Foxes',division:'CFC North'};
t[2] = {abbr:'NAT',mascot:'Nationals',division:'CFC North'};
t[3] = {abbr:'PEN',mascot:'Penguins',division:'CFC North'};
t[4] = {abbr:'GRE',mascot:'Greats',division:'CFC South'};
t[5] = {abbr:'PAN',mascot:'Pandas',division:'CFC South'};
t[6] = {abbr:'PIR',mascot:'Pirates',division:'CFC South'};
t[7] = {abbr:'SNA',mascot:'Snakes',division:'CFC Central'};
t[8] = {abbr:'DRA',mascot:'Dragons',division:'CFC Central'};
t[9] = {abbr:'PIO',mascot:'Pioneers',division:'CFC Central'};
t[10] = {abbr:'RED',mascot:'Red Pandas',division:'CFC Central'};
t[11] = {abbr:'ENG',mascot:'Engineers',division:'CFC North'};
t[12] = {abbr:'COU',mascot:'Cougars',division:'CFC East'};
t[13] = {abbr:'FAL',mascot:'Falcons',division:'CFC East'};
t[14] = {abbr:'GRI',mascot:'Grizzlies',division:'CFC East'};
t[15] = {abbr:'WAR',mascot:'Warriors',division:'CFC East'};
t[16] = {abbr:'AAR',mascot:'Aardvarks',division:'CFC West'};
t[17] = {abbr:'COO',mascot:'Coonhounds',division:'CFC West'};
t[18] = {abbr:'ROT',mascot:'Rottweilers',division:'CFC West'};
t[19] = {abbr:'SEN',mascot:'Senators',division:'CFC West'};
t[20] = {abbr:'BAD',mascot:'Badgers',division:'NFC North'};
t[21] = {abbr:'HUM',mascot:'Hummingbirds',division:'NFC North'};
t[22] = {abbr:'LON',mascot:'Longhorns',division:'NFC North'};
t[23] = {abbr:'WOL',mascot:'Wolves',division:'NFC North'};
t[24] = {abbr:'AVI',mascot:'Aviators',division:'NFC South'};
t[25] = {abbr:'CHA',mascot:'Chameleons',division:'NFC South'};
t[26] = {abbr:'EAG',mascot:'Eagles',division:'NFC South'};
t[27] = {abbr:'GAL',mascot:'Galaxy',division:'NFC South'};
t[28] = {abbr:'CHE',mascot:'Cheetahs',division:'NFC Central'};
t[29] = {abbr:'PEG',mascot:'Pegasi',division:'NFC Central'};
t[30] = {abbr:'STR',mascot:'Stars',division:'NFC Central'};
t[31] = {abbr:'ZEB',mascot:'Zebras',division:'NFC Central'};
t[32] = {abbr:'COL',mascot:'Collies',division:'NFC East'};
t[33] = {abbr:'HUS',mascot:'Huskies',division:'NFC East'};
t[34] = {abbr:'LYN',mascot:'Lynx',division:'NFC East'};
t[35] = {abbr:'STA',mascot:'Stallions',division:'NFC East'};
t[36] = {abbr:'GOL',mascot:'Goldens',division:'NFC West'};
t[37] = {abbr:'REB',mascot:'Rebels',division:'NFC West'};
t[38] = {abbr:'SHA',mascot:'Sharks',division:'NFC West'};
t[39] = {abbr:'SQU',mascot:'Squirrels',division:'NFC West'};

// r[0] = {base:800,guar:20000,pos:'QB',fName:'FName',lName:'LName',id:'000',weekSigned:0};
// r[1] = {base:500,guar:10000,pos:'RB',fName:'FName',lName:'LName',id:'001',weekSigned:0};
// r[2] = {base:500,guar:10000,pos:'RB',fName:'FName',lName:'LName',id:'002',weekSigned:0};
// r[3] = {base:300,guar:8000,pos:'CB',fName:'FName',lName:'LName',id:'003',weekSigned:0};
// r[4] = {base:300,guar:8000,pos:'CB',fName:'FName',lName:'LName',id:'004',weekSigned:0};
// r[5] = {base:100,guar:5000,pos:'CB',fName:'FName',lName:'LName',id:'005',weekSigned:0};
// r[6] = {base:100,guar:5000,pos:'CB',fName:'FName',lName:'LName',id:'006',weekSigned:0};
// r[7] = {base:50,guar:3000,pos:'LB',fName:'FName',lName:'LName',id:'007',weekSigned:0};
// r[8] = {base:50,guar:3000,pos:'LB',fName:'FName',lName:'LName',id:'008',weekSigned:0};
// r[9] = {base:50,guar:3000,pos:'LB',fName:'FName',lName:'LName',id:'009',weekSigned:0};
// r[10] = {base:25,guar:2000,pos:'K',fName:'FName',lName:'LName',id:'010',weekSigned:0};
// r[11] = {base:25,guar:2000,pos:'K',fName:'FName',lName:'LName',id:'011',weekSigned:0};
// r[12] = {base:25,guar:1000,pos:'P',fName:'FName',lName:'LName',id:'012',weekSigned:0};
// r[13] = {base:25,guar:1000,pos:'P',fName:'FName',lName:'LName',id:'013',weekSigned:0};
// r[14] = {base:40,guar:0,pos:'P',fName:'FName',lName:'LName',id:'014',weekSigned:0};
// r[15] = {base:25,guar:0,pos:'P',fName:'FName',lName:'LName',id:'015',weekSigned:0};