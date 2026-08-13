let SECTIONS = [];
let state = { meta: { eventName: '', eventDate: '', eventCity: '' }, data: {} };

const mosaicEl = document.getElementById('mosaic');
const ticksEl = document.getElementById('ticks');
const totalPctEl = document.getElementById('totalPct');
const statusEl = document.getElementById('statusText');
const statusDot = document.querySelector('.status .dot');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');

function fieldValue(sec, f){ return (state.data[sec.key] && state.data[sec.key][f.id]) || ''; }

function sectionCompletion(sec){
  const total = sec.fields.length;
  const filled = sec.fields.filter(f => (state.data[sec.key][f.id] || '').trim() !== '').length;
  return total ? Math.round((filled/total)*100) : 0;
}

function overallCompletion(){
  if(!SECTIONS.length) return 0;
  const pcts = SECTIONS.map(sectionCompletion);
  return Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
}

function renderTicks(){
  ticksEl.innerHTML = '';
  SECTIONS.forEach(sec=>{
    const t = document.createElement('div');
    t.className='tick';
    const i = document.createElement('i');
    i.style.width = sectionCompletion(sec) + '%';
    t.appendChild(i);
    ticksEl.appendChild(t);
  });
  totalPctEl.textContent = overallCompletion() + '%';
}

function ringSvg(pct){
  const r = 16, c = 2*Math.PI*r;
  const offset = c - (pct/100)*c;
  return `
    <svg viewBox="0 0 40 40">
      <circle class="track" cx="20" cy="20" r="${r}"></circle>
      <circle class="fill" cx="20" cy="20" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <div class="ring-pct">${pct}%</div>
  `;
}

function renderMosaic(){
  mosaicEl.innerHTML = '';
  SECTIONS.forEach((sec, idx)=>{
    const pct = sectionCompletion(sec);
    const filled = sec.fields.filter(f => (state.data[sec.key][f.id]||'').trim() !== '').length;
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.key = sec.key;
    tile.tabIndex = 0;
    tile.setAttribute('role','button');
    tile.setAttribute('aria-label', 'Open ' + sec.name + ' section, ' + pct + '% complete');
    tile.innerHTML = `
      <div class="tile-top">
        <div class="tile-index">${String(idx+1).padStart(2,'0')}</div>
        <div class="ring">${ringSvg(pct)}</div>
      </div>
      <div class="tile-body">
        <div class="tile-name">${sec.name}</div>
        <div class="tile-sub">${sec.sub}</div>
      </div>
      <div class="tile-foot"><span>${filled}/${sec.fields.length} filled</span><span class="arrow">&#8594;</span></div>
    `;
    tile.addEventListener('click', ()=> openModal(sec));
    tile.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openModal(sec); } });
    mosaicEl.appendChild(tile);
  });
}

function inputEl(sec, f){
  let el;
  if(f.type === 'select'){
    el = document.createElement('select');
    const blank = document.createElement('option');
    blank.value=''; blank.textContent='Select…';
    el.appendChild(blank);
    f.options.forEach(o=>{
      const opt = document.createElement('option');
      opt.value=o; opt.textContent=o;
      el.appendChild(opt);
    });
  } else if(f.type === 'textarea'){
    el = document.createElement('textarea');
  } else {
    el = document.createElement('input');
    el.type = f.type;
  }
  el.id = sec.key + '_' + f.id;
  if(f.placeholder) el.placeholder = f.placeholder;
  el.value = fieldValue(sec, f);
  el.addEventListener('input', ()=>{
    state.data[sec.key][f.id] = el.value;
    updateModalHead(sec);
    renderTicks();
    renderMosaic();
    saveState();
  });
  return el;
}

function updateModalHead(sec){
  const pctEl = modal.querySelector('.modal-pct');
  if(pctEl) pctEl.textContent = sectionCompletion(sec) + '% complete';
}

function openModal(sec){
  const idx = SECTIONS.indexOf(sec);
  modal.innerHTML = `
    <div class="modal-head">
      <div class="tab-index">${String(idx+1).padStart(2,'0')}</div>
      <div class="modal-titles">
        <div class="st-name">${sec.name}</div>
        <div class="st-sub modal-pct">${sectionCompletion(sec)}% complete</div>
      </div>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body"><div class="field-grid" id="modalFields"></div></div>
  `;
  const grid = modal.querySelector('#modalFields');
  sec.fields.forEach(f=>{
    const fWrap = document.createElement('div');
    fWrap.className = 'field' + (f.full ? ' full' : '');
    const label = document.createElement('label');
    label.textContent = f.label;
    fWrap.appendChild(label);
    fWrap.appendChild(inputEl(sec, f));
    grid.appendChild(fWrap);
  });
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.classList.add('open');
  const firstInput = modal.querySelector('input, select, textarea');
  if(firstInput) setTimeout(()=> firstInput.focus(), 50);
}

function closeModal(){ overlay.classList.remove('open'); }
overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

function bindMeta(){
  const nameEl = document.getElementById('eventName');
  const dateEl = document.getElementById('eventDate');
  const cityEl = document.getElementById('eventCity');
  nameEl.value = state.meta.eventName;
  dateEl.value = state.meta.eventDate;
  cityEl.value = state.meta.eventCity;
  const titleDisplay = document.getElementById('titleDisplay');
  const updateTitle = ()=>{ titleDisplay.textContent = state.meta.eventName ? state.meta.eventName : 'Event Builder'; };
  updateTitle();
  nameEl.addEventListener('input', ()=>{ state.meta.eventName = nameEl.value; updateTitle(); saveState(); });
  dateEl.addEventListener('input', ()=>{ state.meta.eventDate = dateEl.value; saveState(); });
  cityEl.addEventListener('input', ()=>{ state.meta.eventCity = cityEl.value; saveState(); });
}

let saveTimer = null;
function setStatus(text, isError){
  statusEl.textContent = text;
  statusDot.classList.toggle('err', !!isError);
}

function saveState(){
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    try{
      const res = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if(!res.ok) throw new Error('save failed');
      setStatus('All changes saved');
    }catch(e){
      setStatus('Could not save — check the server connection', true);
    }
  }, 350);
}

async function loadSections(){
  const res = await fetch('/sections.json');
  SECTIONS = await res.json();
}

async function loadState(){
  try{
    const res = await fetch('/api/event');
    if(res.ok){
      const loaded = await res.json();
      state = Object.assign(state, loaded);
    }
  }catch(e){ /* server unreachable, fall back to blank draft */ }
  SECTIONS.forEach(s => { if(!state.data[s.key]) state.data[s.key] = {}; });
  bindMeta();
  renderMosaic();
  renderTicks();
  setStatus('All changes save automatically');
}

document.getElementById('resetBtn').addEventListener('click', async ()=>{
  if(!confirm('Clear all fields? This cannot be undone.')) return;
  try{
    const res = await fetch('/api/event/reset', { method: 'POST' });
    state = await res.json();
  }catch(e){
    state = { meta:{ eventName:'', eventDate:'', eventCity:'' }, data:{} };
  }
  SECTIONS.forEach(s => { if(!state.data[s.key]) state.data[s.key] = {}; });
  bindMeta();
  renderMosaic();
  renderTicks();
  closeModal();
  setStatus('All changes save automatically');
});

document.getElementById('exportBtn').addEventListener('click', ()=>{
  window.location.href = '/api/event/export';
});

(async function init(){
  await loadSections();
  await loadState();
})();
