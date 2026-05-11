const Stats = (() => {
  let allEntries = [];
  let period = 'day';

  function filterEntries(entries, p) {
    const now = new Date();
    return entries.filter(e => {
      const d = new Date(e.timestamp);
      if (p === 'day') return d.toDateString() === now.toDateString();
      if (p === 'week') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 6);
        cutoff.setHours(0, 0, 0, 0);
        return d >= cutoff;
      }
      return true;
    });
  }

  const COLORS = ['#1B3872', '#7B1741', '#C49A22', '#2E6EA6', '#4A9B6F', '#8B4513'];

  function drawPieChart(canvasId, labels, values, title) {
    const canvas = document.getElementById(canvasId);
    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#0F1F3D';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 22);

    if (labels.length === 0) {
      ctx.fillStyle = '#5A6A8A';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText('Ingen data', W / 2, H / 2);
      return;
    }

    const total  = values.reduce((s, v) => s + v, 0);
    const cx     = W / 2;
    const cy     = H / 2 + 10;
    const radius = Math.min(W, H) / 2 - 48;
    let angle    = -Math.PI / 2;

    values.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = angle + slice / 2;
      const lx  = cx + Math.cos(mid) * (radius * 0.65);
      const ly  = cy + Math.sin(mid) * (radius * 0.65);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round((val / total) * 100)}%`, lx, ly + 4);
      angle += slice;
    });

    // Legend
    const legendY = cy + radius + 16;
    const itemW   = W / labels.length;
    labels.forEach((label, i) => {
      const lx = i * itemW + itemW / 2;
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fillRect(lx - 16, legendY, 10, 10);
      ctx.fillStyle = '#5A6A8A';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx - 3, legendY + 9);
    });
  }

  function drawChart(canvasId, labels, values, title, fmt = v => `${(v / 3600).toFixed(1)}h`) {
    const canvas = document.getElementById(canvasId);
    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W   = rect.width;
    const H   = rect.height;
    const pad = { top: 36, right: 16, bottom: 48, left: 16 };

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#0F1F3D';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 22);

    if (labels.length === 0) {
      ctx.fillStyle = '#5A6A8A';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText('Ingen data', W / 2, H / 2);
      return;
    }

    const areaW  = W - pad.left - pad.right;
    const areaH  = H - pad.top  - pad.bottom;
    const maxVal = Math.max(...values);
    const slotW  = areaW / labels.length;
    const barW   = Math.min(slotW * 0.55, 60);

    labels.forEach((label, i) => {
      const x    = pad.left + i * slotW + (slotW - barW) / 2;
      const barH = maxVal > 0 ? (values[i] / maxVal) * areaH : 0;
      const y    = pad.top + areaH - barH;

      ctx.fillStyle = '#1B3872';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#0F1F3D';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(values[i]), x + barW / 2, y - 5);

      ctx.fillStyle = '#5A6A8A';
      ctx.fillText(label, x + barW / 2, pad.top + areaH + 16);
    });

    ctx.strokeStyle = '#D4D9E8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + areaH);
    ctx.lineTo(W - pad.right, pad.top + areaH);
    ctx.stroke();
  }

  function render() {
    const filtered      = filterEntries(allEntries, period);
    const byCount       = {};
    const byCategoryTime = {};
    const byTechnician  = {};

    filtered.forEach(e => {
      byCount[e.category]        = (byCount[e.category]       || 0) + 1;
      byCategoryTime[e.category] = (byCategoryTime[e.category]|| 0) + e.seconds;
      byTechnician[e.technician] = (byTechnician[e.technician]|| 0) + e.seconds;
    });

    drawPieChart('chart-count', Object.keys(byCount), Object.values(byCount), 'Antal ärenden per kategori');
    drawChart('chart-cat-time',   Object.keys(byCategoryTime), Object.values(byCategoryTime), 'Tid per kategori');
    drawChart('chart-technician', Object.keys(byTechnician),   Object.values(byTechnician),   'Tid per tekniker');

    const total = filtered.reduce((sum, e) => sum + e.seconds, 0);
    document.getElementById('stats-count').textContent = filtered.length;
    document.getElementById('stats-total').textContent = `${(total / 3600).toFixed(1)} h`;
  }

  function mountHeader() {
    const btn = document.createElement('button');
    btn.id = 'stats-toggle';
    btn.textContent = 'Statistik';
    document.querySelector('header').appendChild(btn);
    return btn;
  }

  function mountView() {
    const section = document.createElement('section');
    section.id = 'stats-view';
    section.hidden = true;
    section.innerHTML = `
      <div class="stats-toolbar">
        <div class="period-filter">
        <button class="period-btn active" data-period="day">Idag</button>
        <button class="period-btn" data-period="week">Vecka</button>
        <button class="period-btn" data-period="all">Allt</button>
        </div>
        <a class="export-btn" href="/api/entries/csv" download="t30sl.csv">Exportera CSV</a>
      </div>
      <div class="stats-summary">
        <span><strong id="stats-count">0</strong> ärenden</span>
        <span><strong id="stats-total">0 h</strong> total tid</span>
      </div>
      <div class="charts">
        <canvas id="chart-count"></canvas>
        <canvas id="chart-cat-time"></canvas>
        <canvas id="chart-technician"></canvas>
      </div>`;
    document.querySelector('main').appendChild(section);

    section.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        section.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        period = btn.dataset.period;
        render();
      });
    });

    return section;
  }

  async function init(root) {
    const toggleBtn = mountHeader();
    const statsView = mountView();
    let loaded = false;

    toggleBtn.addEventListener('click', () => {
      const opening = statsView.hidden;
      statsView.hidden = !opening;
      root.hidden = opening;
      toggleBtn.textContent = opening ? 'Stäng' : 'Statistik';

      if (opening && !loaded) {
        Storage.getEntries().then(entries => {
          allEntries = entries;
          loaded = true;
          render();
        });
      }
    });
  }

  return { init };
})();
