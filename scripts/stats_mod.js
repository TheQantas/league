const phi = 0.9594461515627248;
const stats = {};
stats.n = {};
stats.q = {};
stats.std = {};
stats.arr = {};

class N {
  constructor(m,s) {
    this.m = m;
    this.s = s;
  }
  mult(dist) {
    return {m:this.m * dist.m,s:stats.stdMult(this.m,this.s,dist.m,dist.s)};
  }
}

class Q {
  constructor(m,t,l,p,d) {
    this.m = m;
    this.t = t;
    if (!l) {
      l = 2;
    }
    this.l = l;
    this.b = [];
    this.b[0] = m - l * t;
    this.b[1] = m + l * t;
    if (!p) {
      p = phi;
    }
    this.p = p;
    this.s = t * p;
    if (!d) {
      d = 1;
    }
    this.d = d;
  }
  mult(dist) {
    var exp = {};
    exp.m = this.m * dist.m;
    exp.t = stats.stdMult(this.m,this.t,dist.m,dist.t);
    var bounds = [this.b[0] * dist.b[0],this.b[0] * dist.b[1],this.b[1] * dist.b[0],this.b[1] * dist.b[1]];
    var max = (stats.arr.max(bounds) - exp.m) / exp.t;
    var min = (stats.arr.max(bounds) - exp.m) / exp.t;
    this.b = [min,max];
    if (max != min) {
      exp.l = undefined;
    } else {
      exp.l = max;
    }
    exp.d = this.d + dist.d;
    exp.p = this.p * dist.p;
    return new Q(exp.m,exp.t,exp.l,exp.p,exp.d);
  }
  add(dist) {
    var m = this.m + dist.m;
    var t = Math.sqrt(Math.pow(this.t,2) + Math.pow(dist.t,2));
    var mx = this.b[1] + dist.b[1];
    var l = (mx - m) / t;
    return new Q(m,t,l);
  }
  subtract(dist) {
    var m = this.m - dist.m;
    var t = Math.sqrt(Math.pow(this.t,2) + Math.pow(dist.t,2));
    var v = [this.b[0] - dist.b[0],this.b[1] - dist.b[0],this.b[0] - dist.b[1],this.b[1] - dist.b[1]];
    var mx = stats.arr.max(v);
    var l = (mx - m) / t;
    return new Q(m,t,l);
  }
  constMult(k) {
    return new Q(this.m * k,this.t * k,this.l * k,this.p,this.d);
  }
}

stats.q.cdf = (x,dist) => {
  console.log(x,dist.m + dist.l * dist.t)
  if (x < dist.m - dist.l * dist.t || x > dist.m + dist.l * dist.t) {
    return 0;
  }
  return stats.n.cdf(x,{m:dist.m,s:dist.t});
}

stats.n.cdf = (x,dist) => {
  return (1 + stats.erf((x - dist.m) / Math.sqrt(2 * dist.s * dist.s))) / 2;
}

stats.erf = (x) => {
  var cof = [-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
             -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
             4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
             1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8,
             6.529054439e-9, 5.059343495e-9, -9.91364156e-10,
             -2.27365122e-10, 9.6467911e-11, 2.394038e-12,
             -6.886027e-12, 8.94487e-13, 3.13092e-13,
             -1.12708e-13, 3.81e-16, 7.106e-15,
             -1.523e-15, -9.4e-17, 1.21e-16,
             -2.8e-17];
  var j = cof.length - 1;
  var isneg = false;
  var d = 0;
  var dd = 0;
  var t, ty, tmp, res;
  if (x < 0) {
    x = -x;
    isneg = true;
  }
  t = 2 / (2 + x);
  ty = 4 * t - 2;
  for(; j > 0; j--) {
    tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  res = t * Math.exp(-x * x + 0.5 * (cof[0] + ty * d) - dd);
  return isneg ? res - 1 : 1 - res;
}

stats.arr.mean = (array) => array.reduce((a, b) => a + b) / array.length;
stats.arr.min = (array) => Math.min.apply(Math,array);
stats.arr.max = (array) => Math.max.apply(Math,array);
stats.stdMult = (m1,s1,m2,s2) => {
  var m12 = Math.pow(m1,2);
  var s12 = Math.pow(s1,2);
  var m22 = Math.pow(m2,2);
  var s22 = Math.pow(s2,2);
  return Math.sqrt(m22 * s12 + m12 * s22 + s12 * s22);
}

// var a = new Q(0,1);
// var b = new Q(1,2);
// var c = a.mult(b);
// var d = a.subtract(b);