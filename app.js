/* TICKTALKER — app.js */
  
const API_KEY = 'd76lko9r01qtg3ne294gd76lko9r01qtg3ne2950';
const BASE    = 'https://finnhub.io/api/v1';

let chartData    = [];
let refreshTimer = null;
let prevPrice    = null; 

//ENTRY POINT
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

//  LIVE CLOCK 
function startClock() {
  const el = document.getElementById('live-clock');
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// MARKET BADGE
function updateMarketBadge() {
  const now  = new Date();
  const day  = now.getUTCDay();
  const hour = now.getUTCHours();

  // GLD is a US Stock (NYSE). Markets are open ~13:30 to 20:00 UTC
  const isOpen = (day !== 0 && day !== 6 && hour >= 13 && hour < 20);

  const dot   = document.querySelector('.badge-dot');
  const label = document.getElementById('market-label');
  dot.className     = 'badge-dot ' + (isOpen ? 'open' : 'closed');
  label.textContent = isOpen ? 'Market Open' : 'Market Closed';
}

//GOLD PRICE
async function fetchGoldPrice() {

  const url = `${BASE}/quote?symbol=GLD&token=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      const msg = `Gold quote request failed ${res.status}: ${errorText}`;
      console.error(msg);
      showError(msg);
      useDemoGoldPrice();
      return;
    }

    const data = await res.json();

    if (data.error || !data.c || data.c === 0) {
      const msg = data.error ? `Finnhub error: ${data.error}` : 'Gold API returned no quote';
      console.warn(msg);
      showError(msg);
      useDemoGoldPrice();
      return;
    }

    hideError();
    renderGoldPrice(data.c);

    setCard('stat-open', 'Open',        fmt(data.o));
    setCard('stat-high', 'Day High',    fmt(data.h));
    setCard('stat-low',  'Day Low',     fmt(data.l));
    setCard('stat-prev', 'Prev. Close', fmt(data.pc));

  } catch (err) {
    const msg = `Gold price fetch failed: ${err.message || err}`;
    console.error(msg, err);
    showError(msg);
    useDemoGoldPrice();
  }
}

function renderGoldPrice(price) {
  const priceEl = document.getElementById('gold-price');
  priceEl.classList.remove('fade-up');
  void priceEl.offsetWidth;
  priceEl.classList.add('fade-up');
  priceEl.textContent = fmt(price);

  const storedPrev = parseFloat(sessionStorage.getItem('tt_prev_price'));
  const prev = (!isNaN(prevPrice) && prevPrice !== null)
    ? prevPrice
    : (!isNaN(storedPrev) ? storedPrev : price);

  const diff = price - prev;
  const diffPct = prev > 0 ? ((diff / prev) * 100).toFixed(4) : '0.0000';
  const isUp = diff >= 0;

  prevPrice = price;
  sessionStorage.setItem('tt_prev_price', String(price));

  const changeEl = document.getElementById('gold-change');
  changeEl.className = 'hero-change ' + (isUp ? 'up' : 'down');
  changeEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(diffPct)}%`;

  document.getElementById('hero-sub').textContent =
    `GLD (Gold ETF) · Updated ${new Date().toLocaleTimeString()}`;
}

function useDemoGoldPrice() {
  const base  = 245.50; // Adjusted demo price to look like GLD ($200s)
  const drift = (Math.random() - 0.5) * 0.5;
  renderGoldPrice(parseFloat((base + drift).toFixed(2)));
  setCard('stat-open', 'Open',        fmt(244.00));
  setCard('stat-high', 'Day High',    fmt(246.40));
  setCard('stat-low',  'Day Low',     fmt(243.20));
  setCard('stat-prev', 'Prev. Close', fmt(242.80));
}

//GOLD CANDLES
async function fetchGoldCandles() {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;

  // CHANGED: Endpoint changed from /forex/candles to /stock/candle
  const url = `${BASE}/stock/candle?symbol=GLD&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      const msg = `Candles request failed ${res.status}: ${errorText}`;
      console.error(msg);
      showError(msg);
      useDemoChart();
      return;
    }

    const data = await res.json();

    if (data.error || data.s !== 'ok' || !data.c || data.c.length === 0) {
      const msg = data.error || 'Candles API returned no data';
      console.warn(msg);
      showError(msg);
      useDemoChart();
      return;
    }

    hideError();
    chartData = data.t.map((timestamp, i) => ({
      date:  new Date(timestamp * 1000).toISOString().split('T')[0],
      open:  data.o[i],
      high:  data.h[i],
      low:   data.l[i],
      close: data.c[i],
    }));

    drawChart(chartData);
    document.getElementById('chart-meta').textContent =
      `${chartData.length} days · GLD Tracker`;
  } catch (err) {
    const msg = `Candles fetch failed: ${err.message || err}`;
    console.error(msg);
    showError(msg);
    useDemoChart();
  }
}

function useDemoChart() {
  const base = 240;
  chartData = Array.from({ length: 30 }, (_, i) => {
    const d     = new Date(Date.now() - (29 - i) * 86400000);
    const close = base + Math.sin(i * 0.45) * 5 + Math.random() * 2 + i * 0.1;
    return {
      date:  d.toISOString().split('T')[0],
      open:  parseFloat((close - 1).toFixed(2)),
      high:  parseFloat((close + 1.5).toFixed(2)),
      low:   parseFloat((close - 1.5).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    };
  });
  drawChart(chartData);
}

// Keep your drawChart, fetchMarketNews, and Helpers exactly as they were
function drawChart(data) {
  const loader = document.getElementById('chart-loader');
  if (loader) loader.style.display = 'none';
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.offsetWidth;
  const H = 230;
  canvas.width  = W;
  canvas.height = H;
  const prices = data.map(d => d.close);
  const minP   = Math.min(...prices) * 0.99;
  const maxP   = Math.max(...prices) * 1.01;
  const pad    = { top: 16, right: 16, bottom: 36, left: 68 };
  const cW     = W - pad.left - pad.right;
  const cH     = H - pad.top  - pad.bottom;
  const toX = i => pad.left + (i / (data.length - 1)) * cW;
  const toY = p => pad.top  + (1 - (p - minP) / (maxP - minP)) * cH;
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, 'rgba(245,200,66,0.30)');
  grad.addColorStop(1, 'rgba(245,200,66,0)');
  ctx.beginPath();
  data.forEach((d, i) => { i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close)); });
  ctx.lineTo(toX(data.length - 1), H - pad.bottom);
  ctx.lineTo(toX(0), H - pad.bottom);
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth   = 2.5;
  data.forEach((d, i) => { i === 0 ? ctx.moveTo(toX(i), toY(d.close)) : ctx.lineTo(toX(i), toY(d.close)); });
  ctx.stroke();
}

window.addEventListener('resize', () => { if (chartData.length > 0) drawChart(chartData); });

async function fetchMarketNews() {
  const url = `${BASE}/news?category=general&token=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`News request failed ${res.status}: ${errorText}`);
      showError(`News fetch failed: ${res.statusText}`);
      useDemoNews();
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      showError('News API returned no articles.');
      useDemoNews();
      return;
    }

    hideError();
    const articles = data.filter(item => item.headline && item.headline.length > 10).slice(0, 4);
    renderNews(articles);
  } catch (err) {
    console.error('Market news fetch failed:', err);
    showError('Market news fetch failed');
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

function useDemoNews() {
  const demo = [
    { source: 'Reuters', headline: 'Gold steady as traders await US inflation data', summary: 'Gold prices held firm on Wednesday...', url: '#', datetime: Date.now() / 1000 - 3600 },
    { source: 'Bloomberg', headline: 'Dollar weakens ahead of Fed minutes', summary: 'The US dollar softened against peers...', url: '#', datetime: Date.now() / 1000 - 7200 }
  ];
  renderNews(demo);
}

function setCard(id, label, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="card-label">${label}</div><div class="card-value fade-up">${value}</div>`;
}

function fmt(n) { return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function timeAgo(ms) { const diff = Date.now() - ms; const mins = Math.floor(diff / 60000); if (mins < 60) return `${mins}m ago`; return `${Math.floor(mins / 60)}h ago`; }
function escHtml(str) { return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function showError(msg) { document.getElementById('error-msg').textContent = msg; document.getElementById('error-box').style.display = 'flex'; }
function hideError() { document.getElementById('error-box').style.display = 'none'; }

let candleRefreshCount = 0;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    await Promise.all([fetchGoldPrice(), fetchMarketNews()]);
    updateMarketBadge();
    candleRefreshCount++;
    if (candleRefreshCount % 5 === 0) await fetchGoldCandles();
    scheduleRefresh();
  }, 60_000);
}

document.addEventListener('DOMContentLoaded', init);