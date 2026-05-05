'use strict';

// ── State ─────────────────────────────────────────────
let videoFile = null;
let presFile  = null;
let currentStep = 1;

const LOADING_STEPS = [
  { id: 'ls1', label: '📹 Video frames extracted' },
  { id: 'ls2', label: '🔍 Analyzing technology stack' },
  { id: 'ls3', label: '🌐 Correlating with tech landscape' },
  { id: 'ls4', label: '📊 Scoring dimensions' },
  { id: 'ls5', label: '✍️ Generating report' }
];

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupDrop('videoDropZone', 'videoInput', handleVideoFile);
  setupDrop('presDropZone',  'presInput',  handlePresFile);
  setupPerspective();
  setupDepth();
  setupFocusChecks();
  updateSummaryBar();
});

// ── Drag & Drop ───────────────────────────────────────
function setupDrop(zoneId, inputId, handler) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handler(f);
  });
  input.addEventListener('change', () => { if (input.files[0]) handler(input.files[0]); input.value = ''; });
}

// ── Video Handler ─────────────────────────────────────
function handleVideoFile(file) {
  if (!file.type.startsWith('video/') && !isVideoExt(file.name)) {
    return showError('Please upload a valid video file (MP4, MOV, AVI, MKV, etc.)');
  }
  const url = URL.createObjectURL(file);
  const vid = document.getElementById('videoEl');
  vid.src = url;

  vid.onloadedmetadata = () => {
    if (vid.duration > 480) {
      showError(`Video is ${fmt(vid.duration)} — max allowed is 8 minutes (480 s).`);
      vid.src = ''; URL.revokeObjectURL(url); return;
    }
    videoFile = file;
    document.getElementById('videoChipName').textContent = file.name;
    document.getElementById('videoChipMeta').textContent =
      `${fmt(vid.duration)} · ${bytes(file.size)}`;
    document.getElementById('videoDropZone').hidden = true;
    document.getElementById('videoChip').hidden = false;
    document.getElementById('videoPreviewContainer').hidden = false;
    updateStep1Btn();
  };
  vid.onerror = () => { showError('Could not read video. File may be corrupted.'); URL.revokeObjectURL(url); };
}

// ── Presentation Handler ──────────────────────────────
function handlePresFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','pptx','ppt'].includes(ext))
    return showError('Please upload a PDF, PPTX, or PPT file.');
  presFile = file;
  document.getElementById('presChipName').textContent = file.name;
  document.getElementById('presChipMeta').textContent = bytes(file.size);
  document.getElementById('presDropZone').hidden = true;
  document.getElementById('presChip').hidden = false;
}

// ── Remove File ───────────────────────────────────────
function removeFile(type) {
  if (type === 'video') {
    const vid = document.getElementById('videoEl');
    if (vid.src) URL.revokeObjectURL(vid.src);
    vid.src = '';
    videoFile = null;
    document.getElementById('videoDropZone').hidden = false;
    document.getElementById('videoChip').hidden = true;
    document.getElementById('videoPreviewContainer').hidden = true;
    document.getElementById('videoInput').value = '';
    updateStep1Btn();
  } else {
    presFile = null;
    document.getElementById('presDropZone').hidden = false;
    document.getElementById('presChip').hidden = true;
    document.getElementById('presInput').value = '';
  }
}

function updateStep1Btn() {
  const btn  = document.getElementById('toStep2Btn');
  const hint = document.getElementById('step1Hint');
  btn.disabled = !videoFile;
  hint.textContent = videoFile
    ? (presFile ? `✓ Video + Presentation ready` : `✓ Video ready${presFile ? '' : ' — presentation is optional'}`)
    : 'Upload a video file to continue';
}

// ── Step Navigation ───────────────────────────────────
function goToStep(n) {
  document.getElementById(`step${currentStep}`).hidden = true;
  document.getElementById(`step${n}`).hidden = false;

  // Update dots
  for (let i = 1; i <= 3; i++) {
    const dot  = document.getElementById(`stepDot${i}`);
    const line = document.querySelectorAll('.step-line')[i - 1];
    dot.classList.remove('active','done');
    if (i < n)  dot.classList.add('done');
    if (i === n) dot.classList.add('active');
    if (line) line.classList.toggle('done', i < n);
  }

  currentStep = n;
  if (n === 2) updateSummaryBar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Parameter Controls ────────────────────────────────
function setupPerspective() {
  document.querySelectorAll('.persp-opt').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.persp-opt').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      el.querySelector('input').checked = true;
      updateSummaryBar();
    });
  });
}

function setupDepth() {
  document.querySelectorAll('.depth-opt').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.depth-opt').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      el.querySelector('input').checked = true;
      updateSummaryBar();
    });
  });
}

function setupFocusChecks() {
  document.querySelectorAll('.focus-check input').forEach(cb => {
    cb.addEventListener('change', updateSummaryBar);
  });
  document.getElementById('paramIndustry').addEventListener('change', updateSummaryBar);
  document.getElementById('paramQuestion').addEventListener('input', updateSummaryBar);
}

function updateSummaryBar() {
  const bar = document.getElementById('paramSummary');
  if (!bar) return;
  const industry    = document.getElementById('paramIndustry')?.value || 'General Technology';
  const perspective = document.querySelector('[name=perspective]:checked')?.value || 'All';
  const depth       = document.querySelector('[name=depth]:checked')?.value || 'Standard';
  const focuses     = [...document.querySelectorAll('.focus-check input:checked')].map(c => c.value);
  const q           = document.getElementById('paramQuestion')?.value?.trim();

  const tags = [
    `<span class="sum-tag">🏭 ${industry}</span>`,
    `<span class="sum-tag">🎯 ${perspective}</span>`,
    `<span class="sum-tag">📊 ${depth}</span>`,
    ...focuses.map(f => `<span class="sum-tag">🔍 ${f}</span>`),
    q ? `<span class="sum-tag">💬 Custom Q</span>` : ''
  ].filter(Boolean).join('');

  bar.innerHTML = tags || '<span style="color:var(--muted)">Default parameters — all dimensions equally weighted</span>';
}

function getParams() {
  return {
    industry:        document.getElementById('paramIndustry').value,
    perspective:     document.querySelector('[name=perspective]:checked')?.value || 'All',
    depth:           document.querySelector('[name=depth]:checked')?.value || 'Standard',
    focus_areas:     [...document.querySelectorAll('.focus-check input:checked')].map(c => c.value).join(', '),
    custom_question: document.getElementById('paramQuestion').value.trim()
  };
}

// ── Analysis ──────────────────────────────────────────
async function startAnalysis() {
  if (!videoFile) return;
  const params = getParams();

  showLoading(true);
  animateLoadingSteps();

  try {
    const form = new FormData();
    form.append('video', videoFile);
    if (presFile) form.append('presentation', presFile);
    form.append('industry',        params.industry);
    form.append('perspective',     params.perspective);
    form.append('analysis_depth',  params.depth);
    form.append('focus_areas',     params.focus_areas);
    form.append('custom_question', params.custom_question);

    const res = await fetch('/api/analyze', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Server error ${res.status}` }));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }

    const data = await res.json();
    showLoading(false);
    renderResults(data, params);
    goToStep(3);
  } catch (err) {
    showLoading(false);
    showError(err.message || 'Unexpected error. Please try again.');
  }
}

// ── Loading ───────────────────────────────────────────
function showLoading(show) {
  document.getElementById('loadingOverlay').hidden = !show;
}

function animateLoadingSteps() {
  LOADING_STEPS.forEach((s, i) => {
    const el = document.getElementById(s.id);
    el.className = 'lstep';
    el.textContent = s.label;
  });
  let idx = 0;
  const tick = setInterval(() => {
    if (idx > 0) {
      document.getElementById(LOADING_STEPS[idx-1].id).className = 'lstep done';
    }
    if (idx < LOADING_STEPS.length) {
      document.getElementById(LOADING_STEPS[idx].id).className = 'lstep active';
      idx++;
    } else {
      clearInterval(tick);
    }
  }, 4000);
}

// ── Render Results ────────────────────────────────────
function renderResults(data, params) {
  // Meta
  const meta = [
    videoFile?.name,
    presFile ? `+ ${presFile.name}` : null,
    `· ${params.industry}`,
    `· ${params.perspective} perspective`,
    `· ${params.depth}`
  ].filter(Boolean).join(' ');
  document.getElementById('resultsMeta').textContent = meta;

  // Gauge
  const score = Math.max(0, Math.min(100, data.overall_score || 0));
  animateGauge(score);
  counter('gaugeScore', 0, score, 1400);

  // Recommendation
  const badge = document.getElementById('recBadge');
  badge.textContent = data.recommendation || '';
  badge.className = 'rec-badge ' + recClass(data.recommendation);

  // Summary
  document.getElementById('execSummary').textContent = data.executive_summary || '';

  // Dimensions
  const s = data.scores || {};
  setDim(1, s.technology_currency || 0, 'dv1', 'db1');
  setDim(2, s.innovation_novelty  || 0, 'dv2', 'db2');
  setDim(3, s.business_viability  || 0, 'dv3', 'db3');
  setDim(4, s.technical_depth     || 0, 'dv4', 'db4');

  // Tech stack
  const tags = document.getElementById('techTags');
  tags.innerHTML = '';
  (data.technology_stack || []).forEach(t => {
    const el = document.createElement('span');
    el.className = 'tech-tag'; el.textContent = t;
    tags.appendChild(el);
  });

  // Lists
  fillList('listInnovations',  data.key_innovations       || []);
  fillList('listOpportunities',data.business_opportunities || []);
  fillList('listImprovements', data.improvement_areas      || []);

  // Text blocks
  document.getElementById('rtCorrelation').textContent  = data.cutting_edge_correlation || '';
  document.getElementById('rtMarket').textContent       = data.market_positioning        || '';
  document.getElementById('rtTechAnalysis').textContent = data.technology_analysis       || '';
  document.getElementById('rtBusinessCase').textContent = data.business_case             || '';
  document.getElementById('rtDetailed').textContent     = data.detailed_analysis         || '';

  // Reset expandable
  document.getElementById('expandCard').classList.remove('open');
}

function setDim(n, val, valId, barId) {
  const v = Math.max(0, Math.min(25, val));
  const pct = (v / 25) * 100;
  const valEl = document.getElementById(valId);
  const barEl = document.getElementById(barId);
  counter(valId, 0, v, 1100, true);
  const cc = v >= 20 ? 'c-green' : v >= 15 ? 'c-blue' : v >= 10 ? 'c-amber' : 'c-red';
  const bc = v >= 20 ? 'b-green' : v >= 10 ? '' : v >= 5 ? 'b-amber' : 'b-red';
  valEl.className = `dim-val ${cc}`;
  valEl.innerHTML = `${v}<small>/25</small>`;
  barEl.className = `dim-bar ${bc}`;
  setTimeout(() => { barEl.style.width = pct + '%'; }, 120);
}

function fillList(elId, items) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  const arr = items.length ? items : ['None identified'];
  arr.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

// ── Gauge ─────────────────────────────────────────────
function animateGauge(score) {
  const arc = document.getElementById('gaugeFill');
  const total = 267;
  const offset = total - (score / 100) * total;
  const cc = score >= 80 ? 'g-green' : score >= 60 ? 'g-blue' : score >= 40 ? 'g-amber' : 'g-red';
  arc.className = cc;
  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 120);
}

// ── Counter Animation ─────────────────────────────────
function counter(elId, from, to, dur, keepHtml = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = performance.now();
  (function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const v = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    if (keepHtml) el.innerHTML = `${v}<small>/25</small>`;
    else el.textContent = v;
    if (t < 1) requestAnimationFrame(step);
  })(performance.now());
}

// ── Expand ────────────────────────────────────────────
function toggleExpand() {
  document.getElementById('expandCard').classList.toggle('open');
}

// ── Error Toast ───────────────────────────────────────
function showError(msg) {
  document.querySelector('.error-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'error-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 7000);
}

// ── Helpers ───────────────────────────────────────────
function isVideoExt(name) { return /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv|mpeg|mpg)$/i.test(name); }
function fmt(s) { return `${Math.floor(s/60)}m ${String(Math.floor(s%60)).padStart(2,'0')}s`; }
function bytes(b) {
  if (b < 1024)        return b + ' B';
  if (b < 1048576)     return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}
function recClass(r) {
  if (!r) return '';
  if (r.includes('Highly'))    return 'rb-high';
  if (r.includes('Recommended for')) return 'rb-good';
  if (r.includes('Conditionally'))   return 'rb-cond';
  return 'rb-no';
}
