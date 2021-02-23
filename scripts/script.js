var index = 0;

window.onload = () => {
  var limit = document.getElementsByClassName('slidePage').length;
  document.getElementById('updateCont').style.height = `${window.innerHeight}px`;
  setInterval(() => {
    let init = index;
    index += 1;
    if (index >= limit) {
      index = 0;
    }
    let iter = 0;
    let res = 10;
    let animation = setInterval(() => {
      iter++;
      document.getElementsByClassName('slidePage')[init].style.opacity = (res - iter) / res;
      if (iter == res) {
        document.getElementsByClassName('slidePage')[init].style.display = 'none';
        document.getElementsByClassName('slidePage')[init].style.opacity = 1;
        document.getElementsByClassName('slidePage')[index].style.display = 'block';
        document.getElementsByClassName('slideNav')[index].classList.add('selected');
        document.getElementsByClassName('slideNav')[init].classList.remove('selected');
        clearInterval(animation);
      }
    },30);
  },5000);
  for (let box of document.getElementsByClassName('weeklyCont')) {
    if (box.getAttribute('data-now') == 'true') {
      var pos = box.offsetLeft;
      document.getElementById('weeklyGames').scrollLeft = pos;
      //box.scrollIntoView();
      break;
    }
  }
  if (getCookie('update') == 'true') {
    reqUpdates();
    document.cookie = "update=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
}

window.onresize = () => {
  document.getElementById('updateCont').style.height = `${window.innerHeight}px`;
}

function goToSlide(num) {
  document.getElementsByClassName('slidePage')[index].style.display = 'none';
  document.getElementsByClassName('slidePage')[num].style.display = 'block';
  document.getElementsByClassName('slidePage')[index].style.opacity = 1;
  document.getElementsByClassName('slideNav')[index].classList.remove('selected');
  document.getElementsByClassName('slideNav')[num].classList.add('selected');
  index = num;
}

function scrollWeeklyGames(dx) {
  if (window.innerWidth <= 640) {
    dx = (dx / Math.abs(dx)) * (window.innerWidth - 80);
  }
  var elem = document.getElementById('weeklyGames');
  var x = elem.scrollLeft;
  var lim = elem.scrollWidth - elem.offsetWidth;
  var chevs = document.getElementsByClassName('weeklyChevron');
  chevs[0].classList.remove('disabled');
  chevs[1].classList.remove('disabled');
  var newX = x + dx;
  if (newX <= 0) {
    newX = 0;
    chevs[0].classList.add('disabled');
  } else if (newX >= lim) {
    newX = lim;
    chevs[1].classList.add('disabled');
  }
  var d = newX - x;
  var iter = 0;
  var step = 20;
  var animation = setInterval(function() {
    iter++;
    elem.scrollLeft = x + d / step * iter;
    if (iter == step) {
      clearInterval(animation);
    }
  }, 10);
}