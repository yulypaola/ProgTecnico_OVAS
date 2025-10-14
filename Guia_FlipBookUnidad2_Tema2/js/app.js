const PAGES = ["page-001.png", "page-002.png", "page-003.png", "page-004.png", "page-005.png", "page-006.png", "page-007.png", "page-008.png", "page-009.png", "page-010.png", "page-011.png", "page-012.png", "page-013.png", "page-014.png", "page-015.png"];
const book = document.getElementById('book');
let stage = book.querySelector('.stage');
if (!stage) { stage = document.createElement('div'); stage.className='stage'; book.appendChild(stage); }
const pageInput = document.getElementById('pageInput');
const btnFirst = document.getElementById('first');
const btnPrev  = document.getElementById('prev');
const btnNext  = document.getElementById('next');
const btnLast  = document.getElementById('last');
let pages = PAGES.slice();
let currentPage = 1; let isAnimating = false; let drag = null;
function init(){ if(pageInput) pageInput.setAttribute('max', pages.length||1); renderSpread(1); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function makeLeaf(imgSrc){
  const page = document.createElement('div'); page.className='page';
  const curl = document.createElement('div'); curl.className='curl'; page.appendChild(curl);
  const leaf = document.createElement('div'); leaf.className='leaf'; page.appendChild(leaf);
  const front = document.createElement('div'); front.className='face front'; leaf.appendChild(front);
  const back  = document.createElement('div'); back .className='face back';  leaf.appendChild(back);
  const img   = document.createElement('img'); img.src = imgSrc; img.alt = ''; front.appendChild(img);
  page.addEventListener('pointerenter', ()=> page.classList.add('show-curl'));
  page.addEventListener('pointerleave', ()=> page.classList.remove('show-curl'));
  page.addEventListener('pointerdown', (e)=> onPointerDown(e, page, leaf));
  page.addEventListener('pointermove', (e)=> onPointerMove(e, page, leaf));
  page.addEventListener('pointerup',   (e)=> onPointerUp(e, page, leaf));
  return { page, leaf };
}
function nodePage(num, side){
  const src = 'pages/' + pages[num-1];
  const { page, leaf } = makeLeaf(src);
  page.dataset.page = num; page.dataset.side = side||'';
  page.classList.add(side||'right');
  page.addEventListener('click', (e)=>{ if (drag && drag.moved) return; if (side==='right' || currentPage===1) animateNext(); else animatePrev(); });
  return page;
}
function renderSpread(target){
  currentPage = clamp(target,1,pages.length);
  stage.innerHTML='';
  if (!pages.length) return;
  if (currentPage===1){ const single = nodePage(1,'right'); if (single) stage.appendChild(single); }
  else { let left=(currentPage%2===0)?currentPage:currentPage-1; let right=left+1;
    if (window.innerWidth>=768){ const L=nodePage(left,'left'); if(L) stage.appendChild(L); const R=nodePage(right,'right'); if(R) stage.appendChild(R); }
    else { const R=nodePage(right,'right'); if(R) stage.appendChild(R); }
  }
  const visible=(currentPage===1)?1:((currentPage%2===0)?currentPage+1:currentPage);
  if (pageInput) pageInput.value = visible;
  updateButtons();
}
function updateButtons(){
  if(!btnFirst) return;
  btnFirst.disabled=(currentPage===1);
  btnPrev.disabled=(currentPage===1);
  const atEnd = (currentPage>=pages.length || (currentPage===pages.length-1 && pages.length%2===1));
  btnNext.disabled=atEnd; btnLast.disabled=atEnd;
}
function disableButtons(state){ [btnFirst,btnPrev,btnNext,btnLast,pageInput].forEach(el=> el && (el.disabled=!!state)); }
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function animateNext(){ if(isAnimating||currentPage>=pages.length) return; isAnimating=true; disableButtons(true);
  const right = stage.querySelector('.page.right') || stage.querySelector('.page');
  const leaf = right?.querySelector('.leaf');
  if (leaf) { leaf.classList.add('flip-next','turning'); await wait(700); leaf.classList.remove('flip-next','turning'); }
  next(); disableButtons(false); isAnimating=false; }
async function animatePrev(){ if(isAnimating||currentPage===1) return; isAnimating=true; disableButtons(true);
  const left = stage.querySelector('.page.left'); const leaf = left?.querySelector('.leaf');
  if (leaf) { leaf.classList.add('flip-prev','turning'); await wait(700); leaf.classList.remove('flip-prev','turning'); }
  prev(); disableButtons(false); isAnimating=false; }
function first(){ renderSpread(1); }
function prev(){ if(currentPage===1) return; renderSpread(currentPage-2); }
function next(){ if(currentPage===1){ renderSpread(2); return; } renderSpread(currentPage+2); }
function last(){ if(pages.length===1){ renderSpread(1); return; } if(pages.length%2===0) renderSpread(pages.length-1); else renderSpread(pages.length); }
btnFirst && btnFirst.addEventListener('click', first);
btnPrev  && btnPrev.addEventListener('click', ()=> isAnimating?null:animatePrev());
btnNext  && btnNext.addEventListener('click', ()=> isAnimating?null:animateNext());
btnLast  && btnLast.addEventListener('click', last);
pageInput && pageInput.addEventListener('change', ()=>{ let n=parseInt(pageInput.value,10); if(Number.isNaN(n)) n=1; n=clamp(n,1,pages.length); renderSpread(n); });
window.addEventListener('resize', ()=> renderSpread(currentPage));
function cornerFromPoint(e, el){
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const s = Math.max(40, rect.width*0.2);
  if (x>rect.width-s && y>rect.height-s) return 'br';
  if (x<       s     && y>rect.height-s) return 'bl';
  if (x>rect.width-s && y<       s    ) return 'tr';
  if (x<       s     && y<       s    ) return 'tl';
  return null;
}
function onPointerDown(e, page, leaf){
  if (isAnimating) return;
  const corner = cornerFromPoint(e, page); if (!corner) return;
  drag = { startX:e.clientX, startY:e.clientY, corner, moved:false, page, leaf };
  page.setPointerCapture(e.pointerId);
  document.body.style.userSelect='none';
  leaf.style.transition='none';
  leaf.classList.add('turning');
  page.classList.add('show-curl');
}
function onPointerMove(e, page, leaf){
  if (!drag) return;
  const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
  const rect = page.getBoundingClientRect();
  const dist = Math.hypot(dx, dy);
  drag.moved = drag.moved || dist > 3;
  const maxDist = Math.max(rect.width*0.65, 120);
  const p = Math.max(0, Math.min(1, dist / maxDist));
  const dirY = (drag.corner==='bl' || drag.corner==='tl') ? 1 : -1;
  const angle = dirY * p * 179.9;
  leaf.style.transform = 'rotateY('+angle+'deg)';
  leaf.style.boxShadow = '0 14px 28px rgba(0,0,0,'+(0.25+0.3*p)+')';
}
function onPointerUp(e, page, leaf){
  if (!drag) return;
  const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
  const rect = page.getBoundingClientRect();
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.max(rect.width*0.65, 120);
  const p = dist / maxDist;
  const go = p > 0.5;
  leaf.style.transition = 'transform 320ms ease, box-shadow 320ms ease';
  if (go){
    const dirY = (drag.corner==='bl' || drag.corner==='tl') ? 1 : -1;
    leaf.style.transform = 'rotateY('+(dirY*179.9)+'deg)';
    setTimeout(()=>{ leaf.style.transform=''; leaf.classList.remove('turning'); if (dirY>0) animatePrev(); else animateNext(); }, 300);
  } else {
    leaf.style.transform = '';
    setTimeout(()=> leaf.classList.remove('turning'), 320);
  }
  document.body.style.userSelect='';
  drag = null;
}
init();