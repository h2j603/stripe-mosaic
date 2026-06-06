'use strict';

const PURPLE = '#a966ff';
const BROWN = '#775d4f';

const fileEl = document.getElementById('file');
const cellEl = document.getElementById('cell');
const cellv = document.getElementById('cellv');
const alphaEl = document.getElementById('alpha');
const alphav = document.getElementById('alphav');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const copyBtn = document.getElementById('copy');
const dlBtn = document.getElementById('dl');
const hoverCb = document.getElementById('hover');
const app = document.querySelector('.app');

let svgText = '';
let svgFileName = 'mosaic';
let lastGrid = null;

fileEl.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  svgFileName = file.name.replace(/\.svg$/i, '');
  svgText = await file.text();
  await rebuild();
});
cellEl.addEventListener('input', () => { cellv.textContent = cellEl.value; rebuild(); });
alphaEl.addEventListener('input', () => { alphav.textContent = alphaEl.value; rebuild(); });
hoverCb.addEventListener('change', () => {
  app.classList.toggle('hover-effect', hoverCb.checked);
});

async function rebuild() {
  if (!svgText) return;
  const cellPx = parseInt(cellEl.value, 10);
  const threshold = parseInt(alphaEl.value, 10);
  try {
    lastGrid = await analyze(svgText, cellPx, threshold);
    renderPreview(lastGrid);
    status.textContent = `${lastGrid.cols} × ${lastGrid.rows} grid · ${lastGrid.cells.length} cells filled`;
  } catch (err) {
    status.textContent = '오류: ' + err.message;
  }
}

async function analyze(svgText, cellPx, alphaThreshold) {
  // SVG 원본 dimension 추출
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svgEl = parsed.documentElement;
  let w, h;
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    w = parts[2]; h = parts[3];
  } else {
    w = parseFloat(svgEl.getAttribute('width')) || 200;
    h = parseFloat(svgEl.getAttribute('height')) || 200;
  }

  // canvas 해상도 — 셀당 충분히 sampling
  // 그리드 폭 = cellPx × cols. cols는 SVG 비율 기준 결정.
  // 일관성 위해 canvas width를 적당히 크게.
  const baseW = 800;
  const scale = baseW / w;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = (e) => rej(new Error('SVG 로드 실패'));
    i.src = url;
  });

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  // 셀 그리드 — cellPx는 결과 페이지에서의 px. 여기선 비율로.
  // 원본 SVG의 cellPx 비율: cellPx / w (한 셀이 SVG width의 몇 분의 1)
  // canvas 기준 cellPx 픽셀 = (cellPx / w) * canvas.width = cellPx * scale
  const cellCanvasPx = cellPx * scale;
  const cols = Math.max(1, Math.floor(canvas.width / cellCanvasPx));
  const rows = Math.max(1, Math.floor(canvas.height / cellCanvasPx));

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 셀 중심 좌표
      const cx = Math.floor((c + 0.5) * cellCanvasPx);
      const cy = Math.floor((r + 0.5) * cellCanvasPx);
      const idx = (cy * canvas.width + cx) * 4;
      const alpha = data[idx + 3];
      if (alpha >= alphaThreshold) cells.push([r, c]);
    }
  }
  return { cols, rows, cells, cellPx };
}

function renderPreview(grid) {
  preview.innerHTML = '';
  preview.style.gridTemplateColumns = `repeat(${grid.cols}, 1fr)`;
  preview.style.gridTemplateRows = `repeat(${grid.rows}, 1fr)`;
  preview.style.aspectRatio = `${grid.cols} / ${grid.rows}`;
  preview.style.width = '100%';
  preview.style.maxWidth = `${Math.min(900, grid.cols * 30)}px`;
  for (const [r, c] of grid.cells) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.style.gridArea = `${r + 1} / ${c + 1}`;
    d.style.background = (r + c) % 2 === 0 ? PURPLE : BROWN;
    preview.appendChild(d);
  }
}

function buildHTML(grid) {
  // 단일 div + style 인라인. 외부 CSS 의존 없이 어디든 박을 수 있음.
  const lines = [];
  lines.push(`<div class="stripe-mosaic" style="display:grid;grid-template-columns:repeat(${grid.cols},1fr);grid-template-rows:repeat(${grid.rows},1fr);aspect-ratio:${grid.cols}/${grid.rows};width:100%;">`);
  for (const [r, c] of grid.cells) {
    const bg = (r + c) % 2 === 0 ? PURPLE : BROWN;
    lines.push(`<div style="grid-area:${r + 1}/${c + 1};background:${bg};transition:transform .2s;"></div>`);
  }
  lines.push('</div>');
  return lines.join('');
}

copyBtn.addEventListener('click', async () => {
  if (!lastGrid) return alert('SVG를 먼저 업로드하세요.');
  const html = buildHTML(lastGrid);
  try {
    await navigator.clipboard.writeText(html);
    status.textContent = '✓ HTML 복사됨 (' + html.length + 'b)';
  } catch {
    prompt('복사하세요:', html);
  }
});

dlBtn.addEventListener('click', () => {
  if (!lastGrid) return alert('SVG를 먼저 업로드하세요.');
  const html = `<!doctype html><meta charset="utf-8"><title>${svgFileName} mosaic</title><div style="max-width:900px;margin:40px auto;">` + buildHTML(lastGrid) + '</div>';
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${svgFileName}-mosaic.html`;
  a.click();
});
