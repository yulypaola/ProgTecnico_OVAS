// Flipbook Exporter para GitHub Pages
// - PDF.js renderiza el PDF en canvas (previa y exportación a PNG)
// - JSZip empaqueta un visor (HTML+CSS+JS) + pages/*.png
// - FileSaver descarga el .zip
(() => {
  const els = {
    file: document.getElementById('file'),
    fileName: document.getElementById('fileName'),
    previewBtn: document.getElementById('preview'),
    exportBtn: document.getElementById('export'),
    previewWrap: document.getElementById('previewWrap'),
    left: document.getElementById('canvasLeft'),
    right: document.getElementById('canvasRight'),
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    pageInput: document.getElementById('pageInput'),
    total: document.getElementById('total'),
    scaleSel: document.getElementById('scale')
  };

  let pdfFile = null, pdfDoc = null, totalPages = 0, currentPage = 1;

  function setStatus(){
    const ok = !!pdfFile;
    els.previewBtn.disabled = !ok;
    els.exportBtn.disabled = !ok;
  }
  els.file.addEventListener('change', (e) => {
    pdfFile = e.target.files?.[0] || null;
    els.fileName.textContent = pdfFile ? pdfFile.name : 'Ningún archivo seleccionado';
    setStatus();
  });

  async function getPdfDoc(){
    if (pdfDoc) return pdfDoc;
    if (!pdfFile) throw new Error('No hay PDF');
    const buf = await pdfFile.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    totalPages = pdfDoc.numPages;
    els.total.textContent = totalPages;
    return pdfDoc;
  }

  function dpr(){ return Math.max(1, Math.min(2.5, window.devicePixelRatio || 1)); }

  async function renderPageToCanvas(pageNum, canvas, scale){
    const page = await pdfDoc.getPage(pageNum);
    const v1 = page.getViewport({ scale: scale });
    const v = page.getViewport({ scale: scale * dpr() });
    const ctx = canvas.getContext('2d');
    canvas.width = Math.floor(v.width);
    canvas.height = Math.floor(v.height);
    canvas.style.width = Math.floor(v.width / dpr()) + 'px';
    canvas.style.height = Math.floor(v.height / dpr()) + 'px';
    await page.render({ canvasContext: ctx, viewport: v }).promise;
  }

  async function renderSpread(){
    if (!pdfDoc) return;
    const scale = parseFloat(els.scaleSel.value || '1.5');
    await renderPageToCanvas(currentPage, els.left, scale);
    if (currentPage + 1 <= totalPages){
      await renderPageToCanvas(currentPage + 1, els.right, scale);
      els.right.parentElement.parentElement.style.display = '';
    } else {
      els.right.parentElement.parentElement.style.display = 'none';
    }
    els.pageInput.value = currentPage;
  }

  els.previewBtn.addEventListener('click', async () => {
    await getPdfDoc();
    currentPage = 1;
    els.previewWrap.hidden = false;
    await renderSpread();
  });

  els.prev.addEventListener('click', async () => {
    currentPage = Math.max(1, currentPage - 2);
    await renderSpread();
  });
  els.next.addEventListener('click', async () => {
    currentPage = Math.min(totalPages - (totalPages % 2 === 0 ? 1 : 0), currentPage + 2);
    await renderSpread();
  });
  els.pageInput.addEventListener('change', async () => {
    const n = Math.max(1, Math.min(totalPages, parseInt(els.pageInput.value || '1', 10)));
    currentPage = n;
    await renderSpread();
  });
  els.scaleSel.addEventListener('change', renderSpread);
  window.addEventListener('keydown', async (ev) => {
    if (!pdfDoc) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); els.next.click(); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); els.prev.click(); }
  });

  // ---------- Export ZIP
  async function canvasToPngBytes(canvas){
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }
  function safeName(s){ return (s||'libro').replace(/[^a-z0-9_\-\.]+/gi,'-'); }

  async function exportZip(){
    await getPdfDoc();
    const zip = new JSZip();
    const root = zip.folder('flipbook');
    const pages = root.folder('pages');

    // Generar PNGs
    const scale = parseFloat(els.scaleSel.value || '1.5');
    const temp = document.createElement('canvas');
    for (let i=1; i<=totalPages; i++){
      await renderPageToCanvas(i, temp, scale);
      const bytes = await canvasToPngBytes(temp);
      pages.file(`page-${String(i).padStart(3,'0')}.png`, bytes);
    }

    // Visor final (sin dependencias)
    const viewerIndex = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook — ${safeName(pdfFile?.name)}</title>
<link rel="stylesheet" href="css/style.css"/></head>
<body>
<header class="bar"><div class="controls">
  <div class="group">
    <button class="btn" id="first">⏮</button>
    <button class="btn" id="prev">◀</button>
    <span class="page-meta">Página</span>
    <input class="jump" id="pageInput" type="number" min="1" value="1"/>
    <span class="page-meta">de <span id="total">${totalPages}</span></span>
    <button class="btn" id="next">▶</button>
    <button class="btn" id="last">⏭</button>
  </div>
</div></header>
<main><div class="book-wrap" id="book"><div class="spread">
  <div class="page left"><div class="page-inner"><img id="imgLeft"/></div></div>
  <div class="page right"><div class="page-inner"><img id="imgRight"/></div></div>
</div></div></main>
<script src="js/app.js"></script></body></html>`;

    const viewerCSS = `:root{--bg:#0f1115;--fg:#eef2f7;--muted:#b5c0d0;--card:#151923;--border:#232a36;--shadow:0 10px 30px rgba(0,0,0,.35)}*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}.bar{padding:12px 16px;border-bottom:1px solid #202633;background:linear-gradient(180deg,#171b25,#121621);box-shadow:var(--shadow);position:sticky;top:0;z-index:10}.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.group{display:flex;gap:6px;align-items:center;background:var(--card);padding:8px;border-radius:14px;border:1px solid var(--border)}.btn{border:1px solid #2a3242;background:#0e1320;color:var(--fg);padding:8px 12px;border-radius:10px;cursor:pointer}.page-meta{color:var(--muted)}.jump{width:90px;padding:6px 8px;border-radius:10px;border:1px solid #2a3242;background:#0e1320;color:var(--fg)}main{max-width:1100px;margin:12px auto 24px;padding:0 12px}.book-wrap{width:min(1200px,96vw);aspect-ratio:3/2;background:radial-gradient(1200px 600px at 50% 30%,#1a2132,#0d1018 70%);border:1px solid #202633;border-radius:18px;box-shadow:var(--shadow);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:14px}.spread{display:flex;gap:0;width:100%;height:100%}.page{width:50%;height:100%;padding:10px;display:flex;align-items:center;justify-content:center}.page-inner{background:#fff;width:100%;height:100%;border-radius:10px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}img{width:100%;height:100%;object-fit:contain;background:#fff}@media (max-width:900px){.page{width:100%}.page.right{display:none}}`;

    const viewerJS = `const total=${totalPages};let cur=1;const L=document.getElementById('imgLeft'),R=document.getElementById('imgRight');function src(n){return 'pages/page-'+String(n).padStart(3,'0')+'.png';}function draw(){L.src=src(cur);R.style.visibility='hidden';if(cur+1<=total){R.src=src(cur+1);R.style.visibility='visible';}document.getElementById('pageInput').value=cur;}function clamp(n){return Math.max(1,Math.min(total,n));}document.getElementById('first').onclick=()=>{cur=1;draw()};document.getElementById('prev').onclick=()=>{cur=clamp(cur-2);draw()};document.getElementById('next').onclick=()=>{cur=clamp(cur+2);draw()};document.getElementById('last').onclick=()=>{cur=(total%2?total:total-1);draw()};document.getElementById('pageInput').onchange=e=>{cur=clamp(parseInt(e.target.value||'1',10));draw()};draw();`;

    root.file('index.html', viewerIndex);
    root.folder('css').file('style.css', viewerCSS);
    root.folder('js').file('app.js', viewerJS);

    const blob = await zip.generateAsync({type:'blob'});
    saveAs(blob, `flipbook-${safeName(pdfFile?.name)}.zip`);
  }

  els.exportBtn.addEventListener('click', exportZip);
})();