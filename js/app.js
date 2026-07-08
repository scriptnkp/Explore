// ── Config ──
const PHOTO_CATS = ['transformer', 'meter', 'control', 'new_transformer'];
const PHOTO_COL = {
  transformer: 'photos_transformer', meter: 'photos_meter',
  control: 'photos_control', new_transformer: 'photos_new_transformer'
};
const PHOTO_LABEL = {
  transformer: 'หม้อแปลง', meter: 'มิเตอร์', control: 'ตู้คอนโทรล', new_transformer: 'หม้อแปลงใหม่'
};

// ── State ──
const state = {
  view: 'home',
  dept: null,
  peaList: [],
  selectedPea: null,
  photos: { transformer: [], meter: [], control: [], new_transformer: [] },
  editId: null
};

const $app = document.getElementById('app');
const $crumb = document.getElementById('crumb');

// ── API ──
async function apiGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${CONFIG.API_URL}?${qs}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
  return data.data;
}

async function apiPost(payload) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // เลี่ยง CORS preflight
    body: JSON.stringify({ ...payload, apiKey: CONFIG.API_KEY })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
  return data;
}

// ── Toast / Loading ──
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
function loading() { $app.innerHTML = '<div class="spinner"></div>'; }

// ── Image compression (canvas, ลดขนาดจนต่ำกว่า MAX_IMAGE_MB) ──
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(file) {
  const img = await fileToImage(file);
  const maxBytes = CONFIG.MAX_IMAGE_MB * 1024 * 1024;
  let w = img.width, h = img.height;
  const maxDim = 1600;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale); h = Math.round(h * scale);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let quality = 0.85, dataUrl;

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes = Math.ceil(dataUrl.length * 0.75);
    if (bytes <= maxBytes) break;
    if (quality > 0.4) quality -= 0.15;
    else { w = Math.round(w * 0.8); h = Math.round(h * 0.8); }
  }
  URL.revokeObjectURL(img.src);
  return dataUrl;
}

// ── Router ──
function setActiveTab(view) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));

function go(view, opts = {}) {
  state.view = view;
  setActiveTab(view === 'form' ? '' : view);
  if (view === 'home') renderHome();
  if (view === 'form') renderForm(opts);
  if (view === 'history') renderHistory();
  if (view === 'dashboard') renderDashboard();
}

// ── Home: รายการหน่วยงาน (ไดนามิกจากชีท) ──
async function renderHome() {
  $crumb.textContent = '';
  loading();
  try {
    const depts = await apiGet('departments');
    if (!depts.length) { $app.innerHTML = '<div class="empty">ยังไม่มีข้อมูลหน่วยงานในชีท</div>'; return; }
    $app.innerHTML = `
      <div class="card"><div class="section-title">เลือกหน่วยงาน</div>
        <p class="hint">เลือกหน่วยงานเพื่อเริ่มสำรวจข้อมูลหม้อแปลง</p></div>
      <div class="dept-grid">
        ${depts.map(d => `<button class="dept-card" data-dept="${escapeHtml(d)}">
            <span class="icon">🏢</span><span class="name">${escapeHtml(d)}</span>
          </button>`).join('')}
      </div>`;
    $app.querySelectorAll('.dept-card').forEach(b =>
      b.addEventListener('click', () => go('form', { dept: b.dataset.dept })));
  } catch (err) { renderError(err); }
}

function renderError(err) {
  $app.innerHTML = `<div class="card"><div class="section-title">เกิดข้อผิดพลาด</div>
    <p class="hint">${escapeHtml(err.message)}</p>
    <button class="btn btn-outline" onclick="go('home')">กลับหน้าแรก</button></div>`;
}

// ── Form: แบบสำรวจ ──
async function renderForm({ dept, editRecord } = {}) {
  state.dept = dept || (editRecord ? editRecord['หน่วยงาน'] : state.dept);
  state.editId = editRecord ? editRecord.id : null;
  state.selectedPea = null;
  state.photos = { transformer: [], meter: [], control: [], new_transformer: [] };
  $crumb.textContent = state.dept || '';
  loading();
  try {
    state.peaList = await apiGet('peaList', { dept: state.dept });
  } catch (err) { renderError(err); return; }

  if (editRecord) {
    state.selectedPea = {
      pea: editRecord['PEA'], size: editRecord['ขนาด'], address: editRecord['ที่อยู่'],
      feederid: editRecord['feederid'], lat: editRecord['lat'], lon: editRecord['lon']
    };
    PHOTO_CATS.forEach(cat => {
      const urls = (editRecord[PHOTO_COL[cat]] || '').split(',').filter(Boolean);
      state.photos[cat] = urls.map(u => ({ url: u, existing: true }));
    });
  }

  $app.innerHTML = `
    <div class="card">
      <div class="section-title">${editRecord ? 'แก้ไขข้อมูลสำรวจ' : 'แบบสำรวจข้อมูล'}</div>
      <div class="field">
        <label>ค้นหา / เลือก PEA</label>
        <div class="search-box">
          <input type="search" id="peaSearch" placeholder="พิมพ์รหัส PEA หรือที่อยู่..."
            value="${state.selectedPea ? escapeHtml(state.selectedPea.pea) : ''}">
        </div>
        <div class="pea-result" id="peaResult"></div>
      </div>
      <div id="peaDetail"></div>
    </div>

    <div class="card">
      <div class="section-title">📷 ภาพหม้อแปลง</div>
      ${uploadBoxHtml('transformer')}
    </div>
    <div class="card">
      <div class="section-title">📷 ภาพมิเตอร์</div>
      ${uploadBoxHtml('meter')}
    </div>
    <div class="card">
      <div class="section-title">📷 ภาพตู้คอนโทรล</div>
      ${uploadBoxHtml('control')}
    </div>

    <div class="card">
      <div class="section-title">🆕 หม้อแปลงใหม่</div>
      <p class="hint">กรอกข้อมูลกรณีมีการเปลี่ยน/ติดตั้งหม้อแปลงใหม่</p>
      <div class="field-row">
        <div class="field"><label>รหัส/หมายเลขหม้อแปลงใหม่</label>
          <input type="text" id="newTrCode" value="${editRecord ? escapeHtml(editRecord.new_transformer_code || '') : ''}"></div>
        <div class="field"><label>ขนาด (kVA)</label>
          <input type="text" id="newTrSize" value="${editRecord ? escapeHtml(editRecord.new_transformer_size || '') : ''}"></div>
      </div>
      <div class="field"><label>หมายเหตุหม้อแปลงใหม่</label>
        <textarea id="newTrNote">${editRecord ? escapeHtml(editRecord.new_transformer_note || '') : ''}</textarea></div>
      <label class="section-title" style="font-size:.9rem;">📷 ภาพหม้อแปลงใหม่</label>
      ${uploadBoxHtml('new_transformer')}
    </div>

    <div class="card">
      <div class="field"><label>หมายเหตุ</label>
        <textarea id="noteInput">${editRecord ? escapeHtml(editRecord.note || '') : ''}</textarea></div>
      <button class="btn btn-primary" id="submitBtn">${editRecord ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลสำรวจ'}</button>
    </div>`;

  renderPeaDetail();
  PHOTO_CATS.forEach(renderThumbs);
  bindUploadHandlers();

  const searchEl = document.getElementById('peaSearch');
  searchEl.addEventListener('input', () => renderPeaResults(searchEl.value));
  if (!editRecord) renderPeaResults('');

  document.getElementById('submitBtn').addEventListener('click', submitForm);
}

function renderPeaResults(q) {
  const el = document.getElementById('peaResult');
  const list = state.peaList.filter(p =>
    !q || p.pea.toLowerCase().includes(q.toLowerCase()) || (p.address || '').toLowerCase().includes(q.toLowerCase()));
  if (!list.length) { el.innerHTML = '<div class="empty">ไม่พบรายการ</div>'; return; }
  el.innerHTML = list.slice(0, 60).map(p => `
    <div class="pea-item ${state.selectedPea && state.selectedPea.pea === p.pea ? 'selected' : ''}" data-pea="${escapeHtml(p.pea)}">
      <b>${escapeHtml(p.pea)}</b> · ${escapeHtml(String(p.size))} kVA
      <small>${escapeHtml(p.address || '-')} · feeder: ${escapeHtml(p.feederid || '-')}</small>
    </div>`).join('');
  el.querySelectorAll('.pea-item').forEach(item => item.addEventListener('click', () => {
    state.selectedPea = state.peaList.find(p => p.pea === item.dataset.pea);
    document.getElementById('peaSearch').value = state.selectedPea.pea;
    renderPeaResults(document.getElementById('peaSearch').value);
    renderPeaDetail();
  }));
}

function renderPeaDetail() {
  const el = document.getElementById('peaDetail');
  if (!state.selectedPea) { el.innerHTML = ''; return; }
  const p = state.selectedPea;
  
  // เพิ่ม Input สำหรับพิกัดและปุ่ม GPS ปัจจุบัน
  el.innerHTML = `
    <div class="field"><label>ขนาดหม้อแปลง (kVA)</label>
      <input type="text" id="sizeInput" value="${escapeHtml(String(p.size ?? ''))}"></div>
    <div class="field"><label>ที่อยู่</label>
      <input type="text" id="addressInput" value="${escapeHtml(p.address ?? '')}"></div>
    
    <div class="field-row">
      <div class="field">
        <label>ละติจูด (Latitude)</label>
        <input type="text" id="latInput" value="${p.lat || ''}">
      </div>
      <div class="field">
        <label>ลองจิจูด (Longitude)</label>
        <input type="text" id="lonInput" value="${p.lon || ''}">
      </div>
    </div>
    <button type="button" class="btn btn-outline" style="margin-bottom: 1rem; width: 100%;" onclick="getCurrentLocation()">
      📍 ใช้พิกัด GPS ปัจจุบัน
    </button>
    <p class="hint">feeder: ${escapeHtml(p.feederid || '-')}</p>`;
}

// ── ฟังก์ชันดึงพิกัด GPS (เพิ่มเติม) ──
window.getCurrentLocation = function() {
  if (navigator.geolocation) {
    const latInput = document.getElementById('latInput');
    const lonInput = document.getElementById('lonInput');
    
    latInput.value = "กำลังค้นหา...";
    lonInput.value = "กำลังค้นหา...";
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(7);
        const lon = position.coords.longitude.toFixed(7);
        latInput.value = lat;
        lonInput.value = lon;
        
        // อัปเดตใน state ด้วย
        if(state.selectedPea) {
          state.selectedPea.lat = lat;
          state.selectedPea.lon = lon;
        }
        toast('ดึงพิกัดสำเร็จ');
      },
      (error) => {
        alert("ไม่สามารถดึงพิกัด GPS ได้: " + error.message);
        latInput.value = state.selectedPea ? state.selectedPea.lat : "";
        lonInput.value = state.selectedPea ? state.selectedPea.lon : "";
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  } else {
    alert("เบราว์เซอร์ของคุณไม่รองรับระบบ GPS");
  }
};

function uploadBoxHtml(cat) {
  const id = `file_${cat}`;
  return `
    <label class="upload-box" for="${id}">
      เลือก / ถ่ายภาพ${PHOTO_LABEL[cat] ? ' ' + PHOTO_LABEL[cat] : ''} (อัปโหลดได้มากกว่า 1 รูป)<br>
      <input type="file" id="${id}" accept="image/*" capture="environment" multiple>
    </label>
    <div class="thumbs" id="thumbs_${cat}"></div>`;
}

function bindUploadHandlers() {
  PHOTO_CATS.forEach(cat => {
    document.getElementById(`file_${cat}`).addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      toast('กำลังบีบอัดรูปภาพ...');
      for (const f of files) {
        const dataUrl = await compressImage(f);
        state.photos[cat].push({ url: dataUrl, existing: false });
      }
      e.target.value = '';
      renderThumbs(cat);
    });
  });
}

function renderThumbs(cat) {
  const el = document.getElementById(`thumbs_${cat}`);
  el.innerHTML = state.photos[cat].map((p, i) => `
    <div class="thumb"><img src="${p.url}"><button class="rm" data-cat="${cat}" data-i="${i}">✕</button></div>`).join('');
  el.querySelectorAll('.rm').forEach(btn => btn.addEventListener('click', () => {
    state.photos[btn.dataset.cat].splice(+btn.dataset.i, 1);
    renderThumbs(btn.dataset.cat);
  }));
}

async function submitForm() {
  if (!state.selectedPea) { toast('กรุณาเลือก PEA ก่อน'); return; }
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

  const payload = {
    action: state.editId ? 'update' : 'submit',
    'หน่วยงาน': state.dept,
    'PEA': state.selectedPea.pea,
    'ที่อยู่': document.getElementById('addressInput').value,
    'ขนาด': document.getElementById('sizeInput').value,
    feederid: state.selectedPea.feederid,
    lat: document.getElementById('latInput') ? document.getElementById('latInput').value : state.selectedPea.lat,
    lon: document.getElementById('lonInput') ? document.getElementById('lonInput').value : state.selectedPea.lon,
    new_transformer_code: document.getElementById('newTrCode').value,
    new_transformer_size: document.getElementById('newTrSize').value,
    new_transformer_note: document.getElementById('newTrNote').value,
    note: document.getElementById('noteInput').value
  };
  PHOTO_CATS.forEach(cat => {
    payload[PHOTO_COL[cat]] = state.photos[cat].filter(p => !p.existing).map(p => p.url);
  });
  if (state.editId) payload.id = state.editId;

  try {
    await apiPost(payload);
    toast(state.editId ? 'แก้ไขข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ');
    go('history');
  } catch (err) {
    toast(err.message);
    btn.disabled = false; btn.textContent = state.editId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลสำรวจ';
  }
}

// ── History ──
async function renderHistory() {
  $crumb.textContent = '';
  loading();
  try {
    const rows = await apiGet('history');
    if (!rows.length) { $app.innerHTML = '<div class="empty">ยังไม่มีประวัติการสำรวจ</div>'; return; }
    $app.innerHTML = `
      <div class="card"><div class="field"><input type="search" id="histSearch" placeholder="ค้นหา PEA / ที่อยู่ / หน่วยงาน"></div></div>
      <div id="histList"></div>`;
    const list = document.getElementById('histList');
    const draw = (items) => {
      list.innerHTML = items.map(r => `
        <div class="card history-item">
          <div>
            <span class="badge">${escapeHtml(r['หน่วยงาน'])}</span>
            <div><b>${escapeHtml(r['PEA'])}</b></div>
            <div class="meta">${escapeHtml(r['ที่อยู่'] || '-')} · ${new Date(r.timestamp).toLocaleString('th-TH')}</div>
          </div>
          <button class="btn btn-outline btn-sm" data-id="${r.id}">แก้ไข</button>
        </div>`).join('');
      list.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', async () => {
        loading();
        const record = await apiGet('getResponse', { id: b.dataset.id });
        go('form', { editRecord: record });
      }));
    };
    draw(rows);
    document.getElementById('histSearch').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      draw(rows.filter(r => JSON.stringify(r).toLowerCase().includes(q)));
    });
  } catch (err) { renderError(err); }
}

// ── Dashboard: แผนที่ ──
async function renderDashboard() {
  $crumb.textContent = '';
  loading();
  try {
    const rows = await apiGet('mapData');
    $app.innerHTML = `<div class="card" style="padding:0;overflow:hidden;"><div id="map" style="height: 450px; z-index: 1;"></div></div>
      <p class="hint" style="text-align:center;">แสดงตำแหน่งจากข้อมูลที่สำรวจแล้ว (${rows.length} รายการ)</p>`;
    
    // ตั้งค่าพิกัดศูนย์กลางหากมีหรือไม่มีข้อมูล (ค่าเริ่มต้นเป็นนครพนม/กทม)
    const defaultCenter = rows.length ? [parseFloat(rows[0].lat), parseFloat(rows[0].lon)] : [13.7563, 100.5018];
    const map = L.map('map').setView(defaultCenter, rows.length ? 12 : 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);

    const bounds = [];
    rows.forEach(r => {
      const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
      // เช็กให้ชัวร์ว่าค่าตัวเลขถูกต้อง
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;
      
      bounds.push([lat, lon]);
      const firstPhoto = (r.photos_transformer || '').split(',').filter(Boolean)[0];
      
      L.marker([lat, lon]).addTo(map).bindPopup(`
        <div style="font-family: sans-serif;">
          <h4 style="margin: 0 0 5px 0; color: #1e3a8a; font-weight: bold;">PEA ID: ${escapeHtml(r['PEA'])}</h4>
          <p style="margin: 3px 0; font-size: 12px;"><b>หน่วยงาน:</b> ${escapeHtml(r['หน่วยงาน'])}</p>
          <p style="margin: 3px 0; font-size: 12px;"><b>ที่อยู่:</b> ${escapeHtml(r['ที่อยู่'] || '-')}</p>
          ${firstPhoto ? `<img class="popup-thumb" src="${firstPhoto}" style="width: 100%; height: auto; max-height: 120px; object-fit: cover; border-radius: 4px; margin-top: 8px;">` : ''}
        </div>
      `);
    });
    
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  } catch (err) { 
    renderError(err); 
  }
}

// ── Utils ──
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ── Init ──
go('home');