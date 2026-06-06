'use strict';

const PURPLE = '#a966ff';
const BROWN = '#775d4f';

const fileEl = document.getElementById('file');
const cellEl = document.getElementById('cell');
const cellv = document.getElementById('cellv');
const ratioEl = document.getElementById('ratio');
const ratiov = document.getElementById('ratiov');
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
ratioEl.addEventListener('input', () => { ratiov.textContent = (+ratioEl.value).toFixed(2); rebuild(); });
alphaEl.addEventListener('input', () => { alphav.textContent = alphaEl.value; rebuild(); });
hoverCb.addEventListener('change', () => {
  app.classList.toggle('hover-effect', hoverCb.checked);
});

async function rebuild() {
  if (!svgText) return;
  const cellPx = parseInt(cellEl.value, 10);
  const ratio = parseFloat(ratioEl.value);
  const threshold = parseInt(alphaEl.value, 10);
  try {
    lastGrid = await analyze(svgText, cellPx, ratio, threshold);
    renderPreview(lastGrid);
    status.textContent = `${lastGrid.cols} × ${lastGrid.rows} grid · ${lastGrid.cells.length} cells filled · ratio ${ratio.toFixed(2)}`;
  } catch (err) {
    status.textContent = '오류: ' + err.message;
  }
}

async function analyze(svgText, cellPx, ratio, alphaThreshold) {
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

  // 셀 그리드 — cellPx는 결과 페이지에서의 px(가로). 세로 = cellPx / ratio.
  const cellW = cellPx;
  const cellH = cellPx / ratio;
  const cellCanvasW = cellW * scale;
  const cellCanvasH = cellH * scale;
  const cols = Math.max(1, Math.floor(canvas.width / cellCanvasW));
  const rows = Math.max(1, Math.floor(canvas.height / cellCanvasH));

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = Math.floor((c + 0.5) * cellCanvasW);
      const cy = Math.floor((r + 0.5) * cellCanvasH);
      const idx = (cy * canvas.width + cx) * 4;
      const alpha = data[idx + 3];
      if (alpha >= alphaThreshold) cells.push([r, c]);
    }
  }
  return { cols, rows, cells, cellPx, ratio };
}

function gridAspect(g) {
  // 가로/세로 = cols * cellW / (rows * cellH) = cols * ratio / rows
  return (g.cols * g.ratio) / g.rows;
}

function renderPreview(grid) {
  preview.innerHTML = '';
  preview.style.gridTemplateColumns = `repeat(${grid.cols}, 1fr)`;
  preview.style.gridTemplateRows = `repeat(${grid.rows}, 1fr)`;
  preview.style.aspectRatio = `${gridAspect(grid)}`;
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
  const lines = [];
  lines.push(`<div class="stripe-mosaic" style="display:grid;grid-template-columns:repeat(${grid.cols},1fr);grid-template-rows:repeat(${grid.rows},1fr);aspect-ratio:${gridAspect(grid).toFixed(4)};width:100%;">`);
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
