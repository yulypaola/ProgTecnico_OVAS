const book = document.getElementById('book');
const pageInput = document.getElementById('pageInput');
const btnFirst = document.getElementById('first');
const btnPrev = document.getElementById('prev');
const btnNext = document.getElementById('next');
const btnLast = document.getElementById('last');

let pages = [];
let currentPage = 1; // 1 = portada (solo)

async function loadPages(){
  const res = await fetch('pages.json');
  const data = await res.json();
  pages = data.pages || [];
  // ajustar el input
  pageInput.setAttribute('max', pages.length);
  showPages(1);
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function showPages(target){
  // Normalizamos: portada = 1 sola. Para spreads, izquierda es par y derecha impar (2-3, 4-5, ...).
  currentPage = clamp(target, 1, pages.length);
  book.innerHTML = '';

  const create = (num, side) => {
    if (num < 1 || num > pages.length) return null;
    const wrap = document.createElement('div');
    wrap.className = 'page';
    wrap.dataset.page = num;
    wrap.dataset.side = side; // left/right
    const img = document.createElement('img');
    img.alt = 'Página ' + num;
    img.src = 'pages/' + pages[num-1];
    wrap.appendChild(img);
    // click handler: izquierda retrocede, derecha avanza
    wrap.addEventListener('click', () => {
      if (side === 'right' || currentPage === 1) {
        animateTurn(wrap, 'right');
        next();
      } else {
        animateTurn(wrap, 'left');
        prev();
      }
    });
    return wrap;
  };

  // Portada en móvil y escritorio: una sola página (1)
  if (currentPage === 1){
    const page = create(1, 'right');
    if (page) book.appendChild(page);
  } else {
    let left, right;
    if (currentPage % 2 === 0){
      left = currentPage;
      right = currentPage + 1;
    } else {
      left = currentPage - 1;
      right = currentPage;
    }
    // En móvil, solo mostramos la página "right" (experiencia de lectura vertical), en desktop ambas
    if (window.innerWidth >= 768){
      const L = create(left, 'left'); if (L) book.appendChild(L);
      const R = create(right, 'right'); if (R) book.appendChild(R);
    } else {
      const R = create(right, 'right'); if (R) book.appendChild(R);
    }
  }

  // Ajustar input al número visible "derecho" (o portada)
  const visible = currentPage === 1 ? 1 : (currentPage % 2 === 0 ? currentPage + 1 : currentPage);
  pageInput.value = visible;
  updateButtons();
}

function updateButtons(){
  btnFirst.disabled = (currentPage === 1);
  btnPrev.disabled  = (currentPage === 1);
  const atEnd = (currentPage >= pages.length || (currentPage === pages.length - 1 && pages.length % 2 === 1));
  btnNext.disabled = atEnd;
  btnLast.disabled = atEnd;
}

function animateTurn(el, dir){
  el.classList.remove('flip-left','flip-right');
  void el.offsetWidth; // reflow
  el.classList.add(dir === 'right' ? 'flip-right' : 'flip-left');
  setTimeout(() => el.classList.remove('flip-left','flip-right'), 650);
}

function first(){ showPages(1); }
function prev(){
  if (currentPage === 1) return;
  if (currentPage % 2 === 0) showPages(currentPage - 2);
  else showPages(currentPage - 2);
}
function next(){
  // si portada, pasa a primer spread (2-3) => currentPage = 2
  if (currentPage === 1) { showPages(2); return; }
  // avanzar spread
  if (currentPage % 2 === 0) showPages(currentPage + 2);
  else showPages(currentPage + 2);
}
function last(){
  if (pages.length === 1){ showPages(1); return; }
  if (pages.length % 2 === 0){
    // total par: última vista es (N-1, N) -> currentPage = N-1 (par)
    showPages(pages.length - 1);
  } else {
    // total impar (>1): última vista solo derecha en móvil o derecha/izquierda en desktop (N-1, N) donde N es impar -> currentPage = N
    showPages(pages.length);
  }
}

btnFirst.addEventListener('click', first);
btnPrev.addEventListener('click', prev);
btnNext.addEventListener('click', next);
btnLast.addEventListener('click', last);

pageInput.addEventListener('change', () => {
  let n = parseInt(pageInput.value, 10);
  if (Number.isNaN(n)) n = 1;
  n = clamp(n, 1, pages.length);
  if (n === 1){ showPages(1); return; }
  // si n>1: colocamos spread correspondiente de modo que n quede a la derecha (par=izq, impar=der)
  if (n % 2 === 0){ showPages(n); } // n par quedará como izquierda junto a n+1
  else { showPages(n); } // n impar: showPages lo normaliza a (n-1,n)
});

window.addEventListener('resize', () => showPages(currentPage));

loadPages();
