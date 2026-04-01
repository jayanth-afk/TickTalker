/* =============================================
   TICKTALKER — app.js
   Milestone 2: API Integration via Finnhub
   =============================================
   Endpoints used (all free tier):
   - GET /forex/rates?base=XAU          → live Gold price in all currencies
   - GET /forex/candles?symbol=OANDA:XAU_USD → 30-day historical candles
   - GET /news?category=general         → market news feed
   - GET /forex/rates (USD base)        → market open/closed status via timestamp

   Rate limit: 60 calls/min (free tier)
   Auto-refreshes price every 60 seconds
   ============================================= */

const API_KEY = 'd76k4l1r01qtg3ndtbg0d76k4l1r01qtg3ndtbgg'; // ← paste your Finnhub key here
const BASE    = 'https://finnhub.io/api/v1';

let chartData    = [];
let refreshTimer = null;

// ── ENTRY POINT ──────────────────────────────
async function init() {
  hideError();
  startClock();
  updateMarketBadge(); // set badge based on current time (no extra API call)

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

// ── MARKET BADGE (time-based, no API call) ────
// Forex/Gold trades 24/5: Mon 00:00 UTC → Fri 22:00 UTC
function updateMarketBadge() {
  const now  = new Date();
  const day  = now.getUTCDay();   // 0=Sun, 1=Mon ... 6=Sat
  const hour = now.getUTCHours();

  // Closed: Saturday all day, Sunday before midnight, Friday after 22:00 UTC
  const isOpen = !(
    day === 6 ||                         // Saturday
    (day === 0 && hour < 22) ||          // Sunday before 22:00 UTC
    (day === 5 && hour >= 22)            // Friday after 22:00 UTC
  );

  const dot   = document.querySelector('.badge-dot');
  const label = document.getElementById('market-label');
  dot.className   = 'badge-dot ' + (isOpen ? 'open' : 'closed');
  label.textContent = isOpen ? 'Forex Open' : 'Forex Closed';
}

// ── GOLD SPOT PRICE ───────────────────────────
// Endpoint: GET /forex/rates?base=XAU
// Returns: { base: "XAU", quote: { USD: 2374.5, ... } }
async function fetchGoldPrice() {
  const url = `${BASE}/forex/rates?base=XAU&token=${API_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.quote || !data.quote.USD) {
      useDemoGoldPrice();
      return;
    }

    const price = parseFloat(data.quote.USD);
    renderGoldPrice(price);
  } catch (err) {
    console.error('Gold price fetch failed:', err);
    useDemoGoldPrice();
  }
}

function renderGoldPrice(price) {
  // Hero price
  const priceEl = document.getElementById('gold-price');
  priceEl.classList.add('fade-up');
  priceEl.textContent = fmt(price);

  // Store price for comparison on next refresh
  const prev = parseFloat(sessionStorage.getItem('tt_prev_price') || price);
  sessionStorage.setItem('tt_prev_price', price);

  const diff    = price - prev;
  const diffPct = prev > 0 ? ((diff / prev) * 100).toFixed(3) : '0.000';
  const isUp    = diff >= 0;

  const changeEl = document.getElementById('gold-change');
  changeEl.className = 'hero-change ' + (isUp ? 'up' : 'down');
  changeEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(diffPct)}%`;
  changeEl.classList.add('fade-up');

  document.getElementById('hero-sub').textContent =
    `Live XAU/USD · Updated ${new Date().toLocaleTimeString()}`;
}

function useDemoGoldPrice() {
  renderGoldPrice(2374.50);
  setCard('stat-open', 'Open',        fmt(2368.00));
  setCard('stat-high', 'Day High',    fmt(2389.40));
  setCard('stat-low',  'Day Low',     fmt(2361.20));
  setCard('stat-prev', 'Prev. Close', fmt(2365.80));
}

// ── GOLD CANDLES (30-day chart) ───────────────
// Endpoint: GET /forex/candles?symbol=OANDA:XAU_USD&resolution=D&from=...&to=...
// Returns: { c: [...], h: [...], l: [...], o: [...], t: [...], s: "ok" }
async function fetchGoldCandles() {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60; // 30 days ago

  const url = `${BASE}/forex/candles?symbol=OANDA:XAU_USD&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      useDemoChart();
      return;
    }

    // Build chart data using Array.map() HOF
    chartData = data.t.map((timestamp, i) => ({
      date:  new Date(timestamp * 1000).toISOString().split('T')[0],
      open:  data.o[i],
      high:  data.h[i],
      low:   data.l[i],
      close: data.c[i],
    }));

    // Populate stat cards from today's candle
    const latest = chartData[chartData.length - 1];
    setCard('stat-open', 'Open',        fmt(latest.open));
    setCard('stat-high', 'Day High',    fmt(latest.high));
    setCard('stat-low',  'Day Low',     fmt(latest.low));
    setCard('stat-prev', 'Prev. Close', fmt(chartData[chartData.length - 2]?.close || latest.open));

    drawChart(chartData);
    document.getElementById('chart-meta').textContent =
      `${chartData.length} days · last ${latest.date}`;
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

  const latest = chartData[chartData.length - 1];
  setCard('stat-open', 'Open',        fmt(latest.open));
  setCard('stat-high', 'Day High',    fmt(latest.high));
  setCard('stat-low',  'Day Low',     fmt(latest.low));
  setCard('stat-prev', 'Prev. Close', fmt(chartData[chartData.length - 2].close));

  drawChart(chartData);
  document.getElementById('chart-meta').textContent = 'Demo data';
}

// ── CANVAS CHART ──────────────────────────────
function drawChart(data) {
  document.getElementById('chart-loader').style.display = 'none';

  const canvas = document.getElementById('trend-chart');
  const ctx    = canvas.getContext('2d');
  const W      = canvas.parentElement.clientWidth;
  const H      = 230;
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

  // Grid lines + Y labels
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y   = pad.top + t * cH;
    const val = maxP - t * (maxP - minP);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,242,248,0.3)';
    ctx.font      = '10px Space Grotesk, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0), pad.left - 8, y + 4);
  });

  // X labels every 5 days
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    if (i % 5 === 0 || i === data.length - 1) {
      ctx.fillStyle = 'rgba(240,242,248,0.3)';
      ctx.fillText(d.date.slice(5), toX(i), H - 10);
    }
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0,   'rgba(245,200,66,0.30)');
  grad.addColorStop(0.7, 'rgba(245,200,66,0.05)');
  grad.addColorStop(1,   'rgba(245,200,66,0)');

  ctx.beginPath();
  data.forEach((d, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close));
  });
  ctx.lineTo(toX(data.length - 1), H - pad.bottom);
  ctx.lineTo(toX(0), H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Price line
  ctx.beginPath();
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  data.forEach((d, i) => {
    i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close));
  });
  ctx.stroke();

  // End dot with glow
  const lx = toX(data.length - 1);
  const ly = toY(prices[prices.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fillStyle   = '#f5c842';
  ctx.shadowColor = 'rgba(245,200,66,0.8)';
  ctx.shadowBlur  = 12;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = '#070b14';
  ctx.lineWidth   = 2;
  ctx.stroke();
}

window.addEventListener('resize', () => {
  if (chartData.length) drawChart(chartData);
});

// ── MARKET NEWS ───────────────────────────────
// Endpoint: GET /news?category=general
// Returns: array of { headline, summary, source, url, datetime, image }
async function fetchMarketNews() {
  const url = `${BASE}/news?category=general&token=${API_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      useDemoNews();
      return;
    }

    // Use Array HOFs: filter out items without headline, then take first 4
    const articles = data
      .filter(item => item.headline && item.headline.length > 10)
      .slice(0, 4);

    renderNews(articles);
    document.getElementById('news-meta').textContent =
      `${articles.length} articles · just now`;
  } catch (err) {
    console.error('News fetch failed:', err);
    useDemoNews();
  }
}

function renderNews(articles) {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = articles.map(a => {
    const time = a.datetime
      ? timeAgo(a.datetime * 1000)
      : 'Recently';
    return `
      <a class="glass card news-card fade-up" href="${a.url || '#'}" target="_blank" rel="noopener">
        <div class="news-source">${a.source || 'Market News'}</div>
        <div class="news-headline">${escHtml(a.headline)}</div>
        <div class="news-summary">${escHtml(a.summary || '')}</div>
        <div class="news-footer">
          <span class="news-time">${time}</span>
          <span class="news-arrow">→</span>
        </div>
      </a>`;
  }).join('');
}

function useDemoNews() {
  const demo = [
    { source: 'Reuters',       headline: 'Gold rises as dollar softens ahead of Fed meeting',         summary: 'Spot gold edged up 0.3% as the dollar weakened, boosting demand for the safe-haven metal.', url: '#', datetime: Date.now()/1000 - 3600  },
    { source: 'Bloomberg',     headline: 'Central banks increase gold reserves to record high in Q1', summary: 'Global central bank gold purchases hit a record in the first quarter, led by China and India.', url: '#', datetime: Date.now()/1000 - 7200  },
    { source: 'MarketWatch',   headline: 'XAU/USD holds above $2,350 as geopolitical tensions persist', summary: 'Gold remains well-supported amid ongoing geopolitical uncertainty and risk-off sentiment.', url: '#', datetime: Date.now()/1000 - 10800 },
    { source: 'Financial Times', headline: 'Analysts raise gold price targets on inflation concerns', summary: 'Several major banks have revised their gold forecasts upward, citing persistent inflationary pressures.', url: '#', datetime: Date.now()/1000 - 14400 },
  ];
  renderNews(demo);
  document.getElementById('news-meta').textContent = 'Demo data';
}

// ── HELPERS ───────────────────────────────────
function setCard(id, label, value) {
  document.getElementById(id).innerHTML = `
    <div class="card-label">${label}</div>
    <div class="card-value fade-up">${value}</div>
  `;
}

function fmt(n) {
  return '$' + parseFloat(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ERROR ─────────────────────────────────────
function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  document.getElementById('error-box').style.display = 'flex';
}
function hideError() {
  document.getElementById('error-box').style.display = 'none';
}

// ── AUTO REFRESH ──────────────────────────────
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    await fetchGoldPrice();
    scheduleRefresh();
  }, 60_000); // refresh price every 60s (well within 60 req/min limit)
}

// ── START ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);