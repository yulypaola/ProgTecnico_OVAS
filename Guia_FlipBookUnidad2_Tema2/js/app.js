const book = document.getElementById('book');
const stage = book.querySelector('.stage');
const pageInput = document.getElementById('pageInput');
const btnFirst = document.getElementById('first');
const btnPrev = document.getElementById('prev');
const btnNext = document.getElementById('next');
const btnLast = document.getElementById('last');

let pages = [];
let currentPage = 1; // portada
let isAnimating = false;

async function loadPages(){
  const res = await fetch('pages.json');
  const data = await res.json();
  pages = data.pages || [];
  pageInput.setAttribute('max', pages.length);
  renderSpread(1);
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function nodePage(num, side){
  if (num < 1 || num > pages.length) return null;
  \1const curl = document.createElement('div'); curl.className = 'curl'; div.appendChild(curl);
div.addEventListener('click', () => {
    if (side === 'right' || currentPage === 1) animateNext();
    else animatePrev();
  });
  return div;
}

function renderSpread(target){
  currentPage = clamp(target, 1, pages.length);
  stage.innerHTML = '';
  if (currentPage === 1){
    const single = nodePage(1, 'right');
    if (single) stage.appendChild(single);
  } else {
    let left = (currentPage % 2 === 0) ? currentPage : currentPage - 1;
    let right = left + 1;
    if (window.innerWidth >= 768){
      const L = nodePage(left, 'left'); if (L) stage.appendChild(L);
      const R = nodePage(right, 'right'); if (R) stage.appendChild(R);
    } else {
      const R = nodePage(right, 'right'); if (R) stage.appendChild(R);
    }
  }
  const visible = (currentPage === 1) ? 1 : (currentPage % 2 === 0 ? currentPage + 1 : currentPage);
  pageInput.value = visible;
  updateButtons();
}


function disableButtons(state){
  if (!btnFirst) return;
  [btnFirst, btnPrev, btnNext, btnLast, pageInput].forEach(el=>{ if(el) el.disabled = !!state; });
}
function updateButtons(){
  btnFirst.disabled = (currentPage === 1);
  btnPrev.disabled  = (currentPage === 1);
  const atEnd = (currentPage >= pages.length || (currentPage === pages.length - 1 && pages.length % 2 === 1));
  btnNext.disabled = atEnd;
  btnLast.disabled = atEnd;
}

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function animateNext(){
  if (isAnimating) return;
  if (currentPage >= pages.length) return;
  isAnimating = true;
  const right = stage.querySelector('.page.right');
  const single = (currentPage === 1) ? stage.querySelector('.page') : null;
  const targetEl = right || single;
  if (!targetEl) { isAnimating = false; next(); return; }
  targetEl.classList.remove('turning-prev','turning-next','peel-prev','peel-next');
  void targetEl.offsetWidth;
  targetEl.classList.add('peel-next');
  disableButtons(true);
  await new Promise(res=>setTimeout(res, 700));
  targetEl.classList.remove('peel-next');
  next();
  disableButtons(false);
  isAnimating = false;
}
  targetEl.classList.remove('turning-prev');
  void targetEl.offsetWidth;
  targetEl.classList.add('turning-next');
  await wait(800);
  next();
}

async function animatePrev(){
  if (isAnimating) return;
  if (currentPage === 1) return;
  isAnimating = true;
  const left = stage.querySelector('.page.left');
  if (!left){ isAnimating = false; prev(); return; }
  left.classList.remove('turning-prev','turning-next','peel-prev','peel-next');
  void left.offsetWidth;
  left.classList.add('peel-prev');
  disableButtons(true);
  await new Promise(res=>setTimeout(res, 700));
  left.classList.remove('peel-prev');
  prev();
  disableButtons(false);
  isAnimating = false;
}
  left.classList.remove('turning-next');
  void left.offsetWidth;
  left.classList.add('turning-prev');
  await wait(800);
  prev();
}

function first(){ renderSpread(1); }
function prev(){ if (currentPage === 1) return; renderSpread(currentPage - 2); }
function next(){ if (currentPage === 1){ renderSpread(2); return; } renderSpread(currentPage + 2); }
function last(){ if (pages.length === 1){ renderSpread(1); return; } if (pages.length % 2 === 0){ renderSpread(pages.length - 1); } else { renderSpread(pages.length); } }

btnFirst.addEventListener('click', first);
btnPrev.addEventListener('click', animatePrev);
btnNext.addEventListener('click', animateNext);
btnLast.addEventListener('click', last);

pageInput.addEventListener('change', () => {
  let n = parseInt(pageInput.value, 10);
  if (Number.isNaN(n)) n = 1;
  n = clamp(n, 1, pages.length);
  if (n === 1){ renderSpread(1); return; }
  renderSpread(n);
});

window.addEventListener('resize', () => renderSpread(currentPage));

loadPages();
