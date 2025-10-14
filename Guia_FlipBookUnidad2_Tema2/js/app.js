const PAGES = ["page-001.png", "page-002.png", "page-003.png", "page-004.png", "page-005.png", "page-006.png", "page-007.png", "page-008.png", "page-009.png", "page-010.png", "page-011.png", "page-012.png", "page-013.png", "page-014.png", "page-015.png"];
const book = document.getElementById('book');
const stage = book.querySelector('.stage') || (function(){ const s=document.createElement('div'); s.className='stage'; book.appendChild(s); return s; })();
const pageInput = document.getElementById('pageInput');
const btnFirst = document.getElementById('first');
const btnPrev = document.getElementById('prev');
const btnNext = document.getElementById('next');
const btnLast = document.getElementById('last');
let pages = PAGES.slice();
let currentPage = 1; let isAnimating = false; let drag = null;
function init(){ if (pageInput) pageInput.setAttribute('max', pages.length||1); renderSpread(1);}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function nodePage(num, side){
  if (num<1 || num>pages.length) return null;
  const div = document.createElement('div'); div.className='page '+(side||''); div.dataset.page=num; div.dataset.side=side||'';
  const img = document.createElement('img'); img.alt='Página '+num; img.src='pages/'+pages[num-1]; div.appendChild(img);
  const curl = document.createElement('div'); curl.className = 'curl'; div.appendChild(curl);
  div.addEventListener('pointerdown', (e)=> onPointerDown(e, div));
  div.addEventListener('pointermove', (e)=> onPointerMove(e, div));
  div.addEventListener('pointerup',    (e)=> onPointerUp(e, div));
  div.addEventListener('click', (e)=>{ if (drag && drag.moved) return; if (side==='right' || currentPage===1) animateNext(); else animatePrev(); });
  div.addEventListener('pointerenter', ()=> div.classList.add('show-curl'));
  div.addEventListener('pointerleave', ()=> div.classList.remove('show-curl'));
  return div;
}
function renderSpread(target){
  currentPage = clamp(target,1,pages.length);
  stage.innerHTML='';
  if (!pages.length) return;
  if (currentPage===1){ const s=nodePage(1,'right'); if(s) stage.appendChild(s); }
  else { let left=(currentPage%2===0)?currentPage:currentPage-1; let right=left+1;
    if (window.innerWidth>=768){ const L=nodePage(left,'left'); if(L) stage.appendChild(L); const R=nodePage(right,'right'); if(R) stage.appendChild(R); }
    else { const R=nodePage(right,'right'); if(R) stage.appendChild(R); }
  }
  const visible=(currentPage===1)?1:((currentPage%2===0)?currentPage+1:currentPage);
  if (pageInput) pageInput.value=visible;
  updateButtons();
}
function updateButtons(){
  if(!btnFirst) return;
  btnFirst.disabled=(currentPage===1);
  btnPrev.disabled=(currentPage===1);
  const atEnd = (currentPage>=pages.length || (currentPage===pages.length-1 && pages.length%2===1));
  btnNext.disabled=atEnd; btnLast.disabled=atEnd;
}
function disableButtons(state){ [btnFirst,btnPrev,btnNext,btnLast,pageInput].forEach(el=>el && (el.disabled=!!state)); }
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function animateNext(){ if(isAnimating||currentPage>=pages.length) return; isAnimating=true; disableButtons(true);
  const t = stage.querySelector('.page.right') || stage.querySelector('.page');
  if (t) t.classList.add('turning-next'); await wait(650); if (t) t.classList.remove('turning-next'); next(); disableButtons(false); isAnimating=false; }
async function animatePrev(){ if(isAnimating||currentPage===1) return; isAnimating=true; disableButtons(true);
  const t = stage.querySelector('.page.left'); if (t) t.classList.add('turning-prev'); await wait(650); if (t) t.classList.remove('turning-prev'); prev(); disableButtons(false); isAnimating=false; }
function first(){ renderSpread(1); }
function prev(){ if(currentPage===1) return; renderSpread(currentPage-2); }
function next(){ if(currentPage===1){ renderSpread(2); return; } renderSpread(currentPage+2); }
function last(){ if(pages.length===1){ renderSpread(1); return; } if(pages.length%2===0) renderSpread(pages.length-1); else renderSpread(pages.length); }
btnFirst && btnFirst.addEventListener('click', first);
btnPrev && btnPrev.addEventListener('click', ()=> isAnimating?null:animatePrev());
btnNext && btnNext.addEventListener('click', ()=> isAnimating?null:animateNext());
btnLast && btnLast.addEventListener('click', last);
pageInput && pageInput.addEventListener('change', ()=>{ let n=parseInt(pageInput.value,10); if(Number.isNaN(n)) n=1; n=clamp(n,1,pages.length); renderSpread(n); });
window.addEventListener('resize', ()=> renderSpread(currentPage));
function inCorner(e, el){
  const rect=el.getBoundingClientRect(); const x=e.clientX-rect.left, y=e.clientY-rect.top;
  const cornerSize = Math.max(40, rect.width*0.2);
  if (x>rect.width-cornerSize && y>rect.height-cornerSize) return 'br';
  if (x<cornerSize && y>rect.height-cornerSize) return 'bl';
  return null;
}
function onPointerDown(e, el){
  if(isAnimating) return;
  const corner = inCorner(e, el); if(!corner) return;
  drag={ startX:e.clientX, startY:e.clientY, corner, moved:false };
  el.setPointerCapture(e.pointerId); el.style.transition='none'; document.body.style.userSelect='none';
}
function onPointerMove(e, el){
  if(!drag) return;
  const dx = e.clientX - drag.startX; drag.moved = drag.moved || Math.abs(dx)>3;
  const dir = (drag.corner==='br')? -1 : 1;
  const rect = el.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, Math.abs(dx)/Math.max(120, rect.width*0.6)));
  const ang = dir * progress * 179.9;
  el.style.transform = 'rotateY(' + ang + 'deg)';
  el.style.setProperty('--shade', String(progress));
}
function onPointerUp(e, el){
  if(!drag) return;
  const dx = e.clientX - drag.startX;
  const rect=el.getBoundingClientRect();
  const progress = Math.abs(dx)/Math.max(120, rect.width*0.6);
  el.style.transition='transform 260ms ease'; el.style.removeProperty('--shade');
  if (progress>0.5){
    if (drag.corner==='br'){ el.style.transform='rotateY(-179.9deg)'; setTimeout(()=>{ el.style.transform=''; animateNext(); }, 240); }
    else { el.style.transform='rotateY(179.9deg)'; setTimeout(()=>{ el.style.transform=''; animatePrev(); }, 240); }
  } else {
    el.style.transform='';
  }
  document.body.style.userSelect=''; drag=null;
}
init();