'use strict';

// ── State ──────────────────────────────────────────────
let videoFile = null;
let presFile = null;

const LOADING_MESSAGES = [
  'Extracting video frames...',
  'Analyzing technology stack...',
  'Correlating with cutting-edge landscape...',
  'Evaluating innovation metrics...',
  'Assessing business viability...',
  'Calculating dimension scores...',
  'Generating comprehensive analysis...',
  'Finalizing innovation report...'
];

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone('videoDropZone', 'videoInput', handleVideoFile, 'video/*');
  setupDropZone('presDropZone', 'presInput', handlePresFile, '.pdf,.pptx,.ppt');
});

// ── Drop Zones ─────────────────────────────────────────
function setupDropZone(zoneId, inputId, handler, accept) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handler(input.files[0]);
    input.value = '';
  });
}

// ── Video File Handler ─────────────────────────────────
function handleVideoFile(file) {
  if (!file.type.startsWith('video/') && !isVideoExtension(file.name)) {
    showError('Please upload a valid video file (MP4, MOV, AVI, MKV, etc.)');
    return;
  }

  const url = URL.createObjectURL(file);
  const videoEl = document.getElementById('videoEl');
  videoEl.src = url;

  videoEl.onloadedmetadata = () => {
    const dur = videoEl.duration;
    if (dur > 480) {
      showError(`Video duration is ${formatDuration(dur)}. Maximum allowed is 8 minutes (480 seconds).`);
      videoEl.src = '';
      URL.revokeObjectURL(url);
      return;
    }
    videoFile = file;
    document.getElementById('videoMeta').textContent =
      `${file.name} · ${formatDuration(dur)} · ${formatBytes(file.size)}`;
    showPreview('video');
    updateAnalyzeBtn();
  };

  videoEl.onerror = () => {
    showError('Could not read video metadata. The file may be corrupted or in an unsupported format.');
    URL.revokeObjectURL(url);
  };
}

// ── Presentation File Handler ──────────────────────────
function handlePresFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'pptx', 'ppt'].includes(ext)) {
    showError('Please upload a PDF, PPTX, or PPT file.');
    return;
  }
  presFile = file;
  document.getElementById('presName').textContent = file.name;
  document.getElementById('presSize').textContent = formatBytes(file.size);
  showPreview('pres');
}

// ── UI Helpers ─────────────────────────────────────────
function showPreview(type) {
  if (type === 'video') {
    document.getElementById('videoDropZone').hidden = true;
    document.getElementById('videoPreview').hidden = false;
  } else {
    document.getElementById('presDropZone').hidden = true;
    document.getElementById('presPreview').hidden = false;
  }
}

function removeFile(type) {
  if (type === 'video') {
    const videoEl = document.getElementById('videoEl');
    if (videoEl.src) URL.revokeObjectURL(videoEl.src);
    videoEl.src = '';
    videoFile = null;
    document.getElementById('videoDropZone').hidden = false;
    document.getElementById('videoPreview').hidden = true;
    document.getElementById('videoInput').value = '';
  } else {
    presFile = null;
    document.getElementById('presDropZone').hidden = false;
    document.getElementById('presPreview').hidden = true;
    document.getElementById('presInput').value = '';
  }
  updateAnalyzeBtn();
}

function updateAnalyzeBtn() {
  const btn = document.getElementById('analyzeBtn');
  const hint = document.getElementById('analyzeHint');
  if (videoFile) {
    btn.disabled = false;
    hint.textContent = presFile
      ? `Ready: ${videoFile.name} + ${presFile.name}`
      : `Ready: ${videoFile.name} (no presentation)`;
  } else {
    btn.disabled = true;
    hint.textContent = 'Load a video to begin analysis';
  }
}

// ── Analysis ───────────────────────────────────────────
async function startAnalysis() {
  if (!videoFile) return;

  showLoading(true);
  let msgIdx = 0;
  const msgEl = document.getElementById('loadingMsg');
  msgEl.textContent = LOADING_MESSAGES[0];
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
    msgEl.textContent = LOADING_MESSAGES[msgIdx];
  }, 3000);

  try {
    const form = new FormData();
    form.append('video', videoFile);
    if (presFile) form.append('presentation', presFile);

    const res = await fetch('/api/analyze', { method: 'POST', body: form });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Server error ${res.status}` }));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }

    const data = await res.json();
    renderResults(data, videoFile.name);
  } catch (err) {
    showError(err.message || 'An unexpected error occurred. Please try again.');
  } finally {
    clearInterval(msgInterval);
    showLoading(false);
  }
}

// ── Render Results ─────────────────────────────────────
function renderResults(data, filename) {
  document.getElementById('videoFilename').textContent = filename;

  // Overall score gauge
  const score = Math.max(0, Math.min(100, data.overall_score || 0));
  animateGauge(score);
  animateCounter('gaugeScore', 0, score, 1200);

  // Recommendation badge
  const badge = document.getElementById('recommendationBadge');
  badge.textContent = data.recommendation || '';
  badge.className = 'recommendation-badge ' + recClass(data.recommendation);

  // Executive summary
  document.getElementById('executiveSummary').textContent = data.executive_summary || '';

  // Dimension scores
  const s = data.scores || {};
  renderDimension('TechCurrency', s.technology_currency || 0);
  renderDimension('Innovation', s.innovation_novelty || 0);
  renderDimension('Business', s.business_viability || 0);
  renderDimension('TechDepth', s.technical_depth || 0);

  // Technology stack tags
  const tagsEl = document.getElementById('techTags');
  tagsEl.innerHTML = '';
  (data.technology_stack || []).forEach(tech => {
    const tag = document.createElement('span');
    tag.className = 'tech-tag';
    tag.textContent = tech;
    tagsEl.appendChild(tag);
  });

  // Lists
  renderList('keyInnovations', data.key_innovations || []);
  renderList('businessOpportunities', data.business_opportunities || []);
  renderList('improvementAreas', data.improvement_areas || []);

  // Text blocks
  document.getElementById('cuttingEdgeCorrelation').textContent = data.cutting_edge_correlation || '';
  document.getElementById('marketPositioning').textContent = data.market_positioning || '';
  document.getElementById('technologyAnalysis').textContent = data.technology_analysis || '';
  document.getElementById('businessCase').textContent = data.business_case || '';
  document.getElementById('detailedAnalysis').textContent = data.detailed_analysis || '';

  // Show results
  document.getElementById('uploadSection').hidden = true;
  document.getElementById('resultsSection').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDimension(key, value) {
  const score = Math.max(0, Math.min(25, value));
  const pct = (score / 25) * 100;
  const scoreEl = document.getElementById(`score${key}`);
  const barEl = document.getElementById(`bar${key}`);

  animateCounter(`score${key}`, 0, score, 1000);

  // Color coding
  const colorClass = score >= 20 ? 'score-green'
    : score >= 15 ? 'score-blue'
    : score >= 10 ? 'score-amber'
    : 'score-red';
  const barClass = score >= 20 ? 'bar-green'
    : score >= 15 ? ''
    : score >= 10 ? 'bar-amber'
    : 'bar-red';

  scoreEl.className = `dim-score ${colorClass}`;
  if (barClass) barEl.classList.add(barClass);

  setTimeout(() => { barEl.style.width = pct + '%'; }, 100);
}

function renderList(elId, items) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'None identified';
    el.appendChild(li);
  }
}

// ── Gauge Animation ────────────────────────────────────
function animateGauge(score) {
  const arc = document.getElementById('gaugeFill');
  const totalLength = 251.2; // semicircle circumference at r=80
  const offset = totalLength - (score / 100) * totalLength;

  // Color
  const colorClass = score >= 80 ? 'gauge-green'
    : score >= 60 ? 'gauge-blue'
    : score >= 40 ? 'gauge-amber'
    : 'gauge-red';
  arc.className = colorClass;

  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 100);
}

// ── Counter Animation ──────────────────────────────────
function animateCounter(elId, from, to, duration) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Loading ────────────────────────────────────────────
function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  el.hidden = !show;
  if (show) {
    // Reset progress bar animation
    const fill = document.getElementById('loadingFill');
    fill.style.animation = 'none';
    fill.getBoundingClientRect();
    fill.style.animation = '';
  }
}

// ── Reset ──────────────────────────────────────────────
function resetUI() {
  document.getElementById('resultsSection').hidden = true;
  document.getElementById('uploadSection').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Expand Toggle ──────────────────────────────────────
function toggleExpand(btn) {
  const card = btn.closest('.expandable-card');
  card.classList.toggle('open');
}

// ── Error Toast ────────────────────────────────────────
function showError(msg) {
  const existing = document.querySelector('.error-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

// ── Utils ──────────────────────────────────────────────
function isVideoExtension(name) {
  return /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv|mpeg|mpg)$/i.test(name);
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function recClass(rec) {
  if (!rec) return '';
  if (rec.includes('Highly')) return 'rec-high';
  if (rec.includes('Recommended for')) return 'rec-good';
  if (rec.includes('Conditionally')) return 'rec-cond';
  return 'rec-no';
}
