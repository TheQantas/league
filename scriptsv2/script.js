window.onload = () => {
  slide = setInterval(advance,5000);
  if (document.getElementById('currentGame')) {
    document.getElementById('games').scrollLeft = document.getElementById('currentGame').offsetLeft;
  }
}

ws.onopen = () => { ws.mail({method:'connectToGame'}); }

var slide;
var index = 0;

function slideTo(num) {
  clearInterval(slide);
  index = num;
  updateSlide(index);
  slide = setInterval(advance,5000);
}

function updateSlide(num) {
  let pages = document.getElementsByClassName('page');
  for (let p of pages) {
    p.style.display = 'none';
  }
  pages[num].style.display = 'block';
  let btns = document.getElementById('slideDock').children;
  for (let b of btns) {
    b.classList.remove('selected');
  }
  btns[num].classList.add('selected');
}

function advance() {
  index++;
  index = (index>=document.getElementsByClassName('page').length)?0:index;
  updateSlide(index);
}

function scrollGames(dx) {
  if (window.innerWidth <= 500) {
    dx = (dx / Math.abs(dx)) * (window.innerWidth - 80);
  } else if (window.innerWidth <= 640) {
    dx *= (2/3);
  }
  var elem = document.getElementById('games');
  var x = elem.scrollLeft;
  var lim = elem.scrollWidth - elem.offsetWidth;
  var chevs = document.getElementsByClassName('gamesChevron');
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

function toMonth(num) {
  let grids = document.getElementsByClassName('datesGrid');
  for (let g of grids) {
    g.style.display = 'none';
  }
  grids[num].style.display = 'grid';
  let btns = document.getElementById('datesLeft').children;
  for (let b of btns) {
    b.classList.remove('selected');
  }
  btns[num].classList.add('selected');
}