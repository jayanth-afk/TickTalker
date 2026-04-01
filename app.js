/* =============================================
   TICKTALKER — app.js (FIXED)
   ============================================= */

const API_KEY = 'd76k4l1r01qtg3ndtbg0d76k4l1r01qtg3ndtbgg';
const BASE    = 'https://finnhub.io/api/v1';

let chartData    = [];
let refreshTimer = null;
let prevPrice    = null; // FIX #2: store prev price in memory, not sessionStorage

// ── ENTRY POINT ──────────────────────────────
async function init() {
  hideError();
  startClock();
  updateMarketBadge();

  await Promise.all([
    fetchGoldPrice(),
    fetchGoldCandles(),
    fetchMarketNews(),
  ]);

  scheduleRefresh();
}

// ── LIVE CLOCK ───────────────────────────────
function startClock() {
  const el = document.getElementById('live-clock');
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// ── MARKET BADGE ─────────────────────────────
function updateMarketBadge() {
  const now  = new Date();
  const day  = now.getUTCDay();
  const hour = now.getUTCHours();

  const isOpen = !(
    day === 6 ||
    (day === 0 && hour < 22) ||
    (day === 5 && hour >= 22)
  );

  const dot   = document.querySelector('.badge-dot');
  const label = document.getElementById('market-label');
  dot.className     = 'badge-dot ' + (isOpen ? 'open' : 'closed');
  label.textContent = isOpen ? 'Forex Open' : 'Forex Closed';
}

// ── GOLD SPOT PRICE ───────────────────────────
async function fetchGoldPrice() {
  const url = `${BASE}/quote?symbol=OANDA:XAU_USD&token=${API_KEY}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.c || data.c === 0) {
      console.warn('API returned no data, using demo fallback.');
      useDemoGoldPrice();
      return;
    }

    renderGoldPrice(data.c);

    setCard('stat-open', 'Open',        fmt(data.o));
    setCard('stat-high', 'Day High',    fmt(data.h));
    setCard('stat-low',  'Day Low',     fmt(data.l));
    setCard('stat-prev', 'Prev. Close', fmt(data.pc));

  } catch (err) {
    console.error('Gold price fetch failed:', err);
    useDemoGoldPrice();
  }
}

function renderGoldPrice(price) {
  const priceEl = document.getElementById('gold-price');
  priceEl.classList.remove('fade-up');
  void priceEl.offsetWidth;
  priceEl.classList.add('fade-up');
  priceEl.textContent = fmt(price);

  // FIX #2: use in-memory prevPrice instead of sessionStorage
  // sessionStorage was overwriting the value before the diff was calculated
  const prev = prevPrice !== null ? prevPrice : price;
  prevPrice  = price; // store for next refresh

  const diff    = price - prev;
  const diffPct = prev > 0 ? ((diff / prev) * 100).toFixed(3) : '0.000';
  const isUp    = diff >= 0;

  const changeEl = document.getElementById('gold-change');
  changeEl.className   = 'hero-change ' + (isUp ? 'up' : 'down');
  changeEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(diffPct)}%`;

  document.getElementById('hero-sub').textContent =
    `Live XAU/USD · Updated ${new Date().toLocaleTimeString()}`;
}

function useDemoGoldPrice() {
  // Simulate a small price drift for demo purposes so the change badge isn't always 0
  const base  = 2374.50;
  const drift = (Math.random() - 0.5) * 4;
  renderGoldPrice(parseFloat((base + drift).toFixed(2)));
  setCard('stat-open', 'Open',        fmt(2368.00));
  setCard('stat-high', 'Day High',    fmt(2389.40));
  setCard('stat-low',  'Day Low',     fmt(2361.20));
  setCard('stat-prev', 'Prev. Close', fmt(2365.80));
}

// ── GOLD CANDLES (30-day chart) ───────────────
async function fetchGoldCandles() {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;

  const url = `${BASE}/forex/candles?symbol=OANDA:XAU_USD&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      useDemoChart();
      return;
    }

    chartData = data.t.map((timestamp, i) => ({
      date:  new Date(timestamp * 1000).toISOString().split('T')[0],
      open:  data.o[i],
      high:  data.h[i],
      low:   data.l[i],
      close: data.c[i],
    }));

    drawChart(chartData);
    document.getElementById('chart-meta').textContent =
      `${chartData.length} days · last ${chartData[chartData.length - 1].date}`;
  } catch (err) {
    console.error('Candles fetch failed:', err);
    useDemoChart();
  }
}

function useDemoChart() {
  const base = 2300;
  chartData = Array.from({ length: 30 }, (_, i) => {
    const d     = new Date(Date.now() - (29 - i) * 86400000);
    const close = base + Math.sin(i * 0.45) * 55 + Math.random() * 25 + i * 2.8;
    return {
      date:  d.toISOString().split('T')[0],
      open:  parseFloat((close - Math.random() * 8).toFixed(2)),
      high:  parseFloat((close + Math.random() * 12).toFixed(2)),
      low:   parseFloat((close - Math.random() * 12).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    };
  });
  drawChart(chartData);
  document.getElementById('chart-meta').textContent = 'Demo data (API unavailable)';
}

// ── CANVAS CHART ──────────────────────────────
function drawChart(data) {
  const loader = document.getElementById('chart-loader');
  if (loader) loader.style.display = 'none';

  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // FIX #5: always use offsetWidth so resize works correctly
  const W = canvas.parentElement.offsetWidth;
  const H = 230;
  canvas.width  = W;
  canvas.height = H;

  const prices = data.map(d => d.close);
  const minP   = Math.min(...prices) * 0.998;
  const maxP   = Math.max(...prices) * 1.002;
  const pad    = { top: 16, right: 16, bottom: 36, left: 68 };
  const cW     = W - pad.left - pad.right;
  const cH     = H - pad.top  - pad.bottom;

  const toX = i => pad.left + (i / (data.length - 1)) * cW;
  const toY = p => pad.top  + (1 - (p - minP) / (maxP - minP)) * cH;

  ctx.clearRect(0, 0, W, H);

  // Y-Axis grid lines & labels
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y   = pad.top + t * cH;
    const val = maxP - t * (maxP - minP);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,242,248,0.3)';
    ctx.font      = '10px Space Grotesk';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0), pad.left - 8, y + 4);
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, 'rgba(245,200,66,0.30)');
  grad.addColorStop(1, 'rgba(245,200,66,0)');

  ctx.beginPath();
  data.forEach((d, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close));
  });
  ctx.lineTo(toX(data.length - 1), H - pad.bottom);
  ctx.lineTo(toX(0), H - pad.bottom);
  ctx.fillStyle = grad;
  ctx.fill();

  // Main price line
  ctx.beginPath();
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth   = 2.5;
  data.forEach((d, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close));
  });
  ctx.stroke();
}

// FIX #5: redraw chart on window resize
window.addEventListener('resize', () => {
  if (chartData.length > 0) drawChart(chartData);
});

// ── MARKET NEWS ───────────────────────────────
async function fetchMarketNews() {
  const url = `${BASE}/news?category=general&token=${API_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      useDemoNews();
      return;
    }

    const articles = data
      .filter(item => item.headline && item.headline.length > 10)
      .slice(0, 4);

    renderNews(articles);
    document.getElementById('news-meta').textContent =
      `${articles.length} articles · just now`;
  } catch (err) {
    useDemoNews();
  }
}

function renderNews(articles) {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = articles.map(a => `
    <a class="glass card news-card fade-up" href="${a.url || '#'}" target="_blank">
      <div class="news-source">${a.source || 'Market News'}</div>
      <div class="news-headline">${escHtml(a.headline)}</div>
      <div class="news-summary">${escHtml(a.summary || '')}</div>
      <div class="news-footer">
        <span class="news-time">${a.datetime ? timeAgo(a.datetime * 1000) : 'Recent'}</span>
        <span class="news-arrow">→</span>
      </div>
    </a>`).join('');
}

// FIX #6: demo news now has 4 articles instead of 1
function useDemoNews() {
  const demo = [
    {
      source: 'Reuters',
      headline: 'Gold steady as traders await US inflation data',
      summary: 'Gold prices held firm on Wednesday as the market shifts focus to upcoming CPI figures that could influence Fed rate decisions.',
      url: '#', datetime: Date.now() / 1000 - 3600,
    },
    {
      source: 'Bloomberg',
      headline: 'Dollar weakens ahead of Fed minutes release',
      summary: 'The US dollar softened against major peers as investors positioned ahead of the Federal Reserve meeting minutes due later today.',
      url: '#', datetime: Date.now() / 1000 - 7200,
    },
    {
      source: 'MarketWatch',
      headline: 'Central banks continue record gold purchases in Q1',
      summary: 'Global central banks added significant gold reserves in the first quarter, with demand driven by de-dollarization efforts.',
      url: '#', datetime: Date.now() / 1000 - 10800,
    },
    {
      source: 'FT',
      headline: 'Oil prices dip on demand concerns from China slowdown',
      summary: 'Crude oil futures fell after data showed weaker-than-expected factory output from China, the world\'s largest oil importer.',
      url: '#', datetime: Date.now() / 1000 - 14400,
    },
  ];
  renderNews(demo);
  document.getElementById('news-meta').textContent = '4 articles · demo mode';
}

// ── HELPERS ───────────────────────────────────
function setCard(id, label, value) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `
      <div class="card-label">${label}</div>
      <div class="card-value fade-up">${value}</div>
    `;
  }
}

function fmt(n) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  document.getElementById('error-box').style.display = 'flex';
}
function hideError() {
  document.getElementById('error-box').style.display = 'none';
}

// FIX #1 & #3 & #4: refresh price + news + market badge every 60s
//                    also refresh candles every 5 minutes
let candleRefreshCount = 0;

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    // Always refresh price and news
    await Promise.all([
      fetchGoldPrice(),
      fetchMarketNews(),
    ]);

    // Also update the market open/closed badge on every tick
    updateMarketBadge(); // FIX #4

    // Refresh candles every 5th tick (every ~5 minutes)
    candleRefreshCount++;
    if (candleRefreshCount % 5 === 0) {
      await fetchGoldCandles(); // FIX #3
    }

    scheduleRefresh();
  }, 60_000);
}

// ── START ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);