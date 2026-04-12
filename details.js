/* TICKTALKER — DETAILS PAGE ENGINE (With Fallback Logic) */

const API_KEY = 'd76lko9r01qtg3ne294gd76lko9r01qtg3ne2950';
const REST_URL = 'https://finnhub.io/api/v1';

// 1. Grab the symbol from the URL and immediately strip ALL underscores
const urlParams = new URLSearchParams(window.location.search);
const rawSymbol = urlParams.get('symbol');
const currentSymbol = rawSymbol ? rawSymbol.replace(/_/g, '') : null;

console.log("Raw symbol from URL:", rawSymbol);
console.log("Clean symbol (no underscores):", currentSymbol);

let oldPrice = 0; // Keep track of the price for directional flashing

// 2. Setup the UI immediately
// === FEATURE: VISUAL POLISH (COMPLETE ICON DICTIONARY) ===
function getMarketIcon(symbol) {
    if (symbol.includes('XAU')) return '🥇';
    if (symbol.includes('XAG')) return '🥈';

    // FOREX FLAGS
    if (symbol.includes('EUR_USD')) return '🇪🇺/🇺🇸';
    if (symbol.includes('GBP_USD')) return '🇬🇧/🇺🇸';
    if (symbol.includes('USD_JPY')) return '🇺🇸/🇯🇵';
    if (symbol.includes('USD_CHF')) return '🇺🇸/🇨🇭';
    if (symbol.includes('AUD_USD')) return '🇦🇺/🇺🇸';
    if (symbol.includes('USD_CAD')) return '🇺🇸/🇨🇦';
    if (symbol.includes('NZD_USD')) return '🇳🇿/🇺🇸';
    if (symbol.includes('EUR_GBP')) return '🇪🇺/🇬🇧';
    if (symbol.includes('EUR_JPY')) return '🇪🇺/🇯🇵';
    if (symbol.includes('GBP_JPY')) return '🇬🇧/🇯🇵';
    if (symbol.includes('AUD_JPY')) return '🇦🇺/🇯🇵';
    if (symbol.includes('EUR_AUD')) return '🇪🇺/🇦🇺';
    if (symbol.includes('GBP_AUD')) return '🇬🇧/🇦🇺';
    if (symbol.includes('USD_INR')) return '🇺🇸/🇮🇳';
    if (symbol.includes('EUR_INR')) return '🇪🇺/🇮🇳';

    // CRYPTO SYMBOLS
    if (symbol.includes('BTC')) return '₿';
    if (symbol.includes('ETH')) return '⟠';
    if (symbol.includes('SOL')) return '◎';
    if (symbol.includes('BNB')) return '🟡';
    if (symbol.includes('BCH')) return '₿🟩';
    if (symbol.includes('AAVE')) return '👻';
    if (symbol.includes('MKR')) return 'Ⓜ️';
    if (symbol.includes('AVAX')) return '🔺';
    if (symbol.includes('LINK')) return '🔗';
    if (symbol.includes('INJ')) return '🥷';
    if (symbol.includes('DOT')) return '🟣';
    if (symbol.includes('LTC')) return 'Ł';
    if (symbol.includes('APT')) return '⚫';
    if (symbol.includes('UNI')) return '🦄';
    if (symbol.includes('ATOM')) return '⚛️';
    
    // STOCKS
    if (symbol === 'AAPL') return '🍎';
    if (symbol === 'MSFT') return '🪟';
    if (symbol === 'TSLA') return '⚡🚗';
    if (symbol === 'AMZN') return '📦';
    if (symbol === 'META') return '♾️';
    if (symbol === 'NFLX') return '🍿';
    
    return '📈'; // Generic Fallback
}

// === UPDATED SETUP UI ===
function setupUI() {
    if (!currentSymbol) {
        window.location.href = 'index.html';
        return;
    }

    const displayName = currentSymbol.includes(':') ? currentSymbol.split(':')[1].replace('_', '/') : currentSymbol;
    
    document.getElementById('detail-title').innerText = displayName;
    document.title = `${displayName} - TickTalker`;
    
    // Now using the full dictionary for the icon!
    document.getElementById('detail-icon').innerText = getMarketIcon(currentSymbol);
}

// 3. Fetch Initial Price (Bypass the Weekend Empty Screen)
async function fetchInitialPrice() {
    try {
        const response = await fetch(`${REST_URL}/quote?symbol=${currentSymbol}&token=${API_KEY}`);
        const data = await response.json();
        
        // Use Finnhub's data if it's a US Stock, otherwise use our Fallback
        let priceToDisplay = (data && data.c && data.c > 0) ? data.c : getWeekendFallback(currentSymbol);

        if (priceToDisplay) {
            const priceBox = document.getElementById('detail-price');
            
            // Only update if the WebSocket hasn't already sent live data!
            if (priceBox && priceBox.innerText === "$---") {
                priceBox.innerText = "$" + parseFloat(priceToDisplay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                document.getElementById('detail-time').innerText = "Last Close (Market Paused / Waiting for Live Tick)";
                oldPrice = parseFloat(priceToDisplay); // Set oldPrice so the first live tick flashes correctly
            }
        }
    } catch (err) {
        console.log("Could not fetch initial price.");
    }
}

// 4. Connect to the Live Feed
function connectLiveFeed() {
    const socket = new WebSocket(`wss://ws.finnhub.io?token=${API_KEY}`);

    socket.addEventListener('open', function () {
        socket.send(JSON.stringify({'type':'subscribe', 'symbol': currentSymbol}));
    });

    socket.addEventListener('message', function (event) {
        const response = JSON.parse(event.data);
        
        if (response.type === "trade") {
            const newPrice = parseFloat(response.data[0].p);
            const priceBox = document.getElementById('detail-price');
            
            // Directional Flashing
            let flashColor = "white";
            if (oldPrice > 0) {
                if (newPrice > oldPrice) flashColor = "#39d98a"; 
                else if (newPrice < oldPrice) flashColor = "#ff5f6d";
            }
            
            // Update UI
            priceBox.innerText = "$" + newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
            document.getElementById('detail-time').innerText = "Live Tick: " + new Date().toLocaleTimeString() + ":" + new Date().getMilliseconds();
            
            // Flash
            priceBox.style.color = flashColor;
            setTimeout(() => { priceBox.style.color = "#f0f2f8"; }, 2000); // Using your 2000ms preference!
            
            oldPrice = newPrice;
        }
    });
}

function getWeekendFallback(symbol) {
    const fallbacks = {
        'OANDA:XAUUSD': 4748.18, 'OANDA:XAGUSD': 45.40, 'OANDA:XAUEUR': 4047.55, 'OANDA:XAUAUD': 7120.10, 'OANDA:XAUJPY': 716000.00,
        'OANDA:EURUSD': 1.1731, 'OANDA:GBPUSD': 1.3140, 'OANDA:USDJPY': 151.20, 'OANDA:USDCHF': 0.8820, 'OANDA:AUDUSD': 0.6650,
        'OANDA:USDCAD': 1.3480, 'OANDA:NZDUSD': 0.6110, 'OANDA:EURGBP': 0.8930, 'OANDA:EURJPY': 177.30, 'OANDA:GBPJPY': 198.60,
        'OANDA:AUDJPY': 100.50, 'OANDA:EURAUD': 1.7640, 'OANDA:GBPAUD': 1.9750, 'OANDA:USDINR': 83.35, 'OANDA:EURINR': 97.75,
        'BINANCE:BCHUSDT': 510.50, 'BINANCE:MKRUSDT': 3450.00, 'BINANCE:APTUSDT': 15.45, 'BINANCE:ATOMUSDT': 11.20,
        'BINANCE:BTCUSDT': 70830.75, 'BINANCE:ETHUSDT': 3850.25
    };
    return fallbacks[symbol] || null;
}
// === FEATURE: TRADINGVIEW CHART INJECTION ===
// === FEATURE: TRADINGVIEW CHART INJECTION (Cleaned for Forex) ===
// === FEATURE: TRADINGVIEW CHART INJECTION (Final Fix) ===
// === FINAL BULLETPROOF CHART FIX ===
// === FIX: FORCING CLEAN SYMBOLS FOR FOREX ===
function loadTradingViewChart() {

    // currentSymbol is already clean (no underscores) — just fix the prefix
    let tvSymbol = currentSymbol;

    if (currentSymbol.includes('OANDA:')) {
        const pair = currentSymbol.split(':')[1]; // e.g. "XAUUSD", "EURUSD"
        if (pair.includes('XAU') || pair.includes('XAG')) {
            tvSymbol = 'OANDA:' + pair;  // Metals stay on OANDA
        } else {
            tvSymbol = 'FX:' + pair;     // All forex: EURUSD, GBPUSD, NZDUSD etc.
        }
    }
    // Crypto (BINANCE:BTCUSDT) — no change needed

    console.log("TradingView loading symbol:", tvSymbol);

    try {
        new TradingView.widget({
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "15",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": "tradingview_widget",
            "backgroundColor": "rgba(7, 11, 20, 1)",
            "gridColor": "rgba(255, 255, 255, 0.05)"
        });
    } catch (e) {
        console.error("TV Widget Error:", e);
    }
}
// === LIGHT / DARK MODE TOGGLE ===
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  const btn = document.getElementById('theme-toggle');
  btn.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  btn.style.color = isLight ? '#0d1117' : '#f0f2f8';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}
// Apply saved theme on page load
(function() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.add('light');
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = '☀️ Light';
      btn.style.color = '#0d1117';
    }
  }
})();
// Run the setup
// Wait for tv.js to finish loading before injecting the widget
function waitForTradingView() {
    if (typeof TradingView !== 'undefined') {
        loadTradingViewChart();
    } else {
        setTimeout(waitForTradingView, 100);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    fetchInitialPrice();
    connectLiveFeed();
    waitForTradingView();
});
