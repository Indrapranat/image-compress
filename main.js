/* FotoLite — Single preview, Bootstrap 5, dark */

const dropEl   = document.getElementById('drop');
const fileEl   = document.getElementById('file');
const btnPick  = document.getElementById('btnPick');
const slotEl   = document.getElementById('slot');
const btnClear = document.getElementById('btnClear');

const maxWEl = document.getElementById('maxW');
const maxHEl = document.getElementById('maxH');
const qEl    = document.getElementById('quality');
const qValEl = document.getElementById('qVal');
const fmtEl  = document.getElementById('format');
const bgEl   = document.getElementById('bg');
const keepNameEl = document.getElementById('keepName');

let current = null; // { file,name,src,width,height,outBlob,outName, col }

/* ===== Utils ===== */
const fmtBytes = n => {
  if(n<1024) return n+' B';
  const u=['KB','MB','GB']; let i=-1;
  do{ n/=1024; i++; }while(n>=1024&&i<u.length-1);
  return (n>100? n.toFixed(0):n.toFixed(1)) + ' ' + u[i];
};
const readFile = f => new Promise((res,rej)=>{
  const fr=new FileReader(); fr.onerror=rej; fr.onload=()=>res(fr.result); fr.readAsDataURL(f);
});
const imageBitmapFrom = src => fetch(src).then(r=>r.blob()).then(createImageBitmap);

function computeTargetSize(w,h,maxW,maxH){
  const r=Math.min(1, maxW/w, maxH/h); // no upscaling
  return {tw:Math.round(w*r), th:Math.round(h*r)};
}

/* ===== Process one ===== */
async function processOne(item){
  const {tw,th} = computeTargetSize(item.width, item.height, +maxWEl.value, +maxHEl.value);

  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');

  const type = fmtEl.value;
  const needBg = (type === 'image/jpeg' || type === 'image/webp');
  if(needBg){
    ctx.fillStyle = bgEl.value || '#000';
    ctx.fillRect(0,0,tw,th);
  }

  const bmp = await imageBitmapFrom(item.src);
  ctx.drawImage(bmp, 0, 0, tw, th);

  const q = +qEl.value;
  const blob = await new Promise(res => canvas.toBlob(res, type, q));
  const base = item.name.replace(/\.[^.]+$/,'');
  const ext  = type.includes('jpeg') ? 'jpg' : (type.includes('webp')?'webp':'png');
  const outBase = keepNameEl.checked ? base : `${base}-${tw}x${th}`;
  item.outName = `${outBase}.${ext}`;
  item.outBlob = blob;
}

/* ===== DOM builder ===== */
function el(tag, attrs={}, ...children){
  const n=document.createElement(tag);
  for(const k in attrs){
    if(k==='class') n.className=attrs[k];
    else if(k==='html') n.innerHTML=attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  children.forEach(c=> n.append(c));
  return n;
}

/* ===== Render single card ===== */
function renderSingle(item){
  slotEl.innerHTML = '';              // hapus kartu lama
  const col = el('div',{class:'col-12 col-sm-10 col-md-8 col-lg-6 mx-auto'});
  const card = el('div',{class:'card h-100 shadow-sm'});
  const thumb = el('div',{class:'thumb'});
  const imgt = new Image();
  imgt.src = item.src;
  imgt.loading = 'lazy';
  imgt.className = 'img-fluid';
  thumb.append(imgt);

  const body = el('div',{class:'card-body d-grid gap-2'});
  const name = el('div',{class:'fw-semibold text-truncate', html:item.name});
  const meta = el('div',{class:'file-meta'}, el('small',{}, document.createTextNode(`${item.width}×${item.height} • ${fmtBytes(item.file.size)}`)));

  const row = el('div',{class:'d-flex gap-2'});
  const bProcess  = el('button',{class:'btn btn-outline-secondary w-100'}, document.createTextNode('Proses'));
  const bDownload = el('button',{class:'btn btn-primary w-100'}, document.createTextNode('Unduh'));

  bProcess.onclick = async ()=>{
    bProcess.disabled = true;
    await processOne(item);
    if(item.outBlob){
      meta.innerHTML = `<small>${item.width}×${item.height} → ${fmtBytes(item.outBlob.size)} • ${item.outName}</small>`;
      name.textContent = item.outName;
    }
    bProcess.disabled = false;
  };

  bDownload.onclick = async ()=>{
    if(!item.outBlob){ await bProcess.onclick(); }
    const url = URL.createObjectURL(item.outBlob);
    const a = document.createElement('a');
    a.href = url; a.download = item.outName || item.name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  row.append(bProcess,bDownload);
  body.append(name, meta, row);
  card.append(thumb, body);
  col.append(card);
  slotEl.append(col);
  item.col = col;
}

/* ===== Add file(s): always keep ONE ===== */
async function addFiles(fileList){
  const f = [...fileList].find(x=>/^image\//.test(x.type));
  if(!f) return;

  // kosongkan state & UI lama
  current = null;
  slotEl.innerHTML = '';

  const src = await readFile(f);
  const img = new Image();
  await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=src; });

  current = { file:f, name:f.name, src, width:img.naturalWidth, height:img.naturalHeight, outBlob:null, outName:null, col:null };
  renderSingle(current);

  // reset input agar upload file yang sama berikutnya tetap terdeteksi
  fileEl.value = '';
}

/* ===== Clear ===== */
function clearAll(){
  current = null;
  slotEl.innerHTML = '';
  fileEl.value = '';
}

/* ===== Wire UI ===== */
function wireDrop(){
  ['dragenter','dragover'].forEach(ev=>{
    dropEl.addEventListener(ev, e=>{ e.preventDefault(); dropEl.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(ev=>{
    dropEl.addEventListener(ev, e=>{ e.preventDefault(); dropEl.classList.remove('drag'); });
  });
  dropEl.addEventListener('drop', e=> addFiles(e.dataTransfer.files));
  dropEl.addEventListener('click', ()=> fileEl.click());
  btnPick.addEventListener('click', ()=> fileEl.click());
  fileEl.addEventListener('change', ()=> addFiles(fileEl.files));
}
function wireControls(){
  qEl.addEventListener('input', ()=> qValEl.textContent = Math.round(qEl.value*100)+'%');
  btnClear.addEventListener('click', clearAll);
}

/* ===== Init ===== */
window.addEventListener('DOMContentLoaded', ()=>{
  qValEl.textContent = Math.round(qEl.value*100)+'%';
  wireDrop();
  wireControls();
});
