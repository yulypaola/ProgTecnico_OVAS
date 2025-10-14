// App para GitHub Pages con diagnóstico y ZIP interno (sin JSZip/FileSaver)
(function(){
  const $ = (id) => document.getElementById(id);
  const els = {
    libStatus: $('libStatus'),
    file: $('file'),
    fileName: $('fileName'),
    previewBtn: $('preview'),
    exportBtn: $('export'),
    previewWrap: $('previewWrap'),
    left: $('canvasLeft'),
    right: $('canvasRight'),
    prev: $('prev'),
    next: $('next'),
    pageInput: $('pageInput'),
    total: $('total'),
    scaleSel: $('scale')
  };

  // ---- Diagnóstico de librerías ----
  function updateLibStatus(){
    if(window.__pdfLoaded && window.__pdfWorkerLoaded && window.pdfjsLib){
      els.libStatus.textContent = 'Librerías listas ✅';
    }else if(window.__pdfLoaded && window.pdfjsLib){
      els.libStatus.textContent = 'PDF.js cargado (worker ok en HTTPS)';
    }else{
      els.libStatus.textContent = 'Cargando PDF.js… si no avanza, revisa bloqueadores o CDN.';
    }
  }
  updateLibStatus();
  setTimeout(updateLibStatus, 800);
  setTimeout(updateLibStatus, 2000);

  let pdfFile = null, pdfDoc = null, totalPages = 0, currentPage = 1;

  function setStatus(){
    const ok = !!pdfFile && !!window.pdfjsLib;
    els.previewBtn.disabled = !ok;
    els.exportBtn.disabled = !ok;
  }

  els.file.addEventListener('change', (e) => {
    pdfFile = e.target.files?.[0] || null;
    els.fileName.textContent = pdfFile ? pdfFile.name : 'Ningún archivo seleccionado';
    setStatus();
  });

  async function getPdfDoc(){
    if(!window.pdfjsLib) throw new Error('PDF.js no cargó');
    if (pdfDoc) return pdfDoc;
    if (!pdfFile) throw new Error('Selecciona un PDF');
    const buf = await pdfFile.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    totalPages = pdfDoc.numPages;
    els.total.textContent = totalPages;
    return pdfDoc;
  }

  function dpr(){ return Math.max(1, Math.min(2.5, window.devicePixelRatio || 1)); }

  async function renderPageToCanvas(pageNum, canvas, scale){
    const page = await pdfDoc.getPage(pageNum);
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
    try{
      await getPdfDoc();
      currentPage = 1;
      els.previewWrap.hidden = false;
      await renderSpread();
    }catch(e){
      alert('Error en vista previa: ' + e.message);
    }
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

  // ------------- ZIP builder (sin JSZip) -------------
  function enc(str){ return new TextEncoder().encode(str); }
  function u16(n){ const b=new Uint8Array(2); new DataView(b.buffer).setUint16(0,n,true); return b; }
  function u32(n){ const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0,n,true); return b; }
  function crc32(buf){ const t=(function(){let c,a=new Uint32Array(256);for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);a[n]=c>>>0;}return a;})(); let crc=0^(-1); for(let i=0;i<buf.length;i++){crc=(crc>>>8)^t[(crc^buf[i])&0xFF];} return (crc^(-1))>>>0; }
  function dosDT(d){ const t=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31); const da=(((d.getFullYear()-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31); return {t,da}; }
  function concat(list){ const len=list.reduce((s,a)=>s+a.length,0); const out=new Uint8Array(len); let off=0; for(const a of list){ out.set(a,off); off+=a.length; } return out; }

  async function canvasToPngBytes(canvas){
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }
  function safeName(s){ return (s||'libro').replace(/[^a-z0-9_\\-\\.]+/gi,'-'); }

  async function exportZip(){
    try{
      await getPdfDoc();
      els.exportBtn.disabled = true;
      els.exportBtn.textContent = 'Exportando…';

      const now = new Date(); const dt = dosDT(now);
      const chunks=[]; const cd=[];
      let offset=0;

      function addFile(path, dataU8){
        const nameBytes = enc(path);
        const data = dataU8;
        const crc = crc32(data);
        const size = data.length;
        // Local header
        chunks.push(enc('PK\\x03\\x04'), u16(20), u16(0), u16(0), u16(dt.t), u16(dt.da), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes, data);
        const localLen = 30 + nameBytes.length;
        const localOffset = offset;
        offset += localLen + size;
        // Central directory
        cd.push(enc('PK\\x01\\x02'), u16(0x0314), u16(20), u16(0), u16(0), u16(dt.t), u16(dt.da), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOffset), nameBytes);
      }

      // Generar páginas
      const scale = parseFloat(els.scaleSel.value || '1.5');
      const temp = document.createElement('canvas');
      for (let i=1; i<=totalPages; i++){
        const page = await pdfDoc.getPage(i);
        const v = page.getViewport({ scale: scale * dpr() });
        const ctx = temp.getContext('2d');
        temp.width = Math.floor(v.width);
        temp.height = Math.floor(v.height);
        await page.render({ canvasContext: ctx, viewport: v }).promise;
        const bytes = await canvasToPngBytes(temp);
        addFile(`flipbook/pages/page-${String(i).padStart(3,'0')}.png`, bytes);
      }

      // Visor final (sin dependencias)
      const viewerIndex = enc(`<!DOCTYPE html>
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
<script src="js/app.js"></script></body></html>`);

      const viewerCSS = enc(`:root{--bg:#0f1115;--fg:#eef2f7;--muted:#b5c0d0;--card:#151923;--border:#232a36;--shadow:0 10px 30px rgba(0,0,0,.35)}*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}.bar{padding:12px 16px;border-bottom:1px solid #202633;background:linear-gradient(180deg,#171b25,#121621);box-shadow:var(--shadow);position:sticky;top:0;z-index:10}.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.group{display:flex;gap:6px;align-items:center;background:var(--card);padding:8px;border-radius:14px;border:1px solid var(--border)}.btn{border:1px solid #2a3242;background:#0e1320;color:var(--fg);padding:8px 12px;border-radius:10px;cursor:pointer}.page-meta{color:var(--muted)}.jump{width:90px;padding:6px 8px;border-radius:10px;border:1px solid #2a3242;background:#0e1320;color:var(--fg)}main{max-width:1100px;margin:12px auto 24px;padding:0 12px}.book-wrap{width:min(1200px,96vw);aspect-ratio:3/2;background:radial-gradient(1200px 600px at 50% 30%,#1a2132,#0d1018 70%);border:1px solid #202633;border-radius:18px;box-shadow:var(--shadow);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:14px}.spread{display:flex;gap:0;width:100%;height:100%}.page{width:50%;height:100%;padding:10px;display:flex;align-items:center;justify-content:center}.page-inner{background:#fff;width:100%;height:100%;border-radius:10px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}img{width:100%;height:100%;object-fit:contain;background:#fff}@media (max-width:900px){.page{width:100%}.page.right{display:none}}`);

      const viewerJS = enc(`const total=${totalPages};let cur=1;const L=document.getElementById('imgLeft'),R=document.getElementById('imgRight');function src(n){return 'pages/page-'+String(n).padStart(3,'0')+'.png';}function draw(){L.src=src(cur);R.style.visibility='hidden';if(cur+1<=total){R.src=src(cur+1);R.style.visibility='visible';}document.getElementById('pageInput').value=cur;}function clamp(n){return Math.max(1,Math.min(total,n));}document.getElementById('first').onclick=()=>{cur=1;draw()};document.getElementById('prev').onclick=()=>{cur=clamp(cur-2);draw()};document.getElementById('next').onclick=()=>{cur=clamp(cur+2);draw()};document.getElementById('last').onclick=()=>{cur=(total%2?total:total-1);draw()};document.getElementById('pageInput').onchange=e=>{cur=clamp(parseInt(e.target.value||'1',10));draw()};draw();`);

      addFile('flipbook/index.html', viewerIndex);
      addFile('flipbook/css/style.css', viewerCSS);
      addFile('flipbook/js/app.js', viewerJS);

      // Central directory + EOCD
      const cdBytes = concat(cd);
      const all = concat([...chunks, cdBytes, enc('PK\x05\x06'), u16(0), u16(0), u16(cd.length/ (46) ), u16(cd.length/ (46) ), u32(cdBytes.length), u32(offset), u16(0)]);
      const blob = new Blob([all], {type:'application/zip'});

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `flipbook-${safeName(pdfFile?.name)}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
    }catch(e){
      alert('Error al exportar: ' + e.message);
    }finally{
      els.exportBtn.disabled = false;
      els.exportBtn.textContent = 'Exportar flipbook (.zip)';
    }
  }

  els.exportBtn.addEventListener('click', exportZip);
})();