/* TICKTALKER — DETAILS PAGE ENGINE (With Fallback Logic) */

const API_KEY = 'd76lko9r01qtg3ne294gd76lko9r01qtg3ne2950';
const REST_URL = 'https://finnhub.io/api/v1';

const urlParams = new URLSearchParams(window.location.search);
const rawSymbol = urlParams.get('symbol');
const currentSymbol = rawSymbol ? rawSymbol.replace(/_/g, '') : null;

console.log("Raw symbol from URL:", rawSymbol);
console.log("Clean symbol (no underscores):", currentSymbol);

let oldPrice = 0; // Keep track of the price for directional flashing

// 2. Setup the UI immediately

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
            setTimeout(() => { priceBox.style.color = "#f0f2f8"; }, 2000); 
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

//FIX: FORCING CLEAN SYMBOLS FOR FOREX
function loadTradingViewChart() {
    const symbolMap = {
        'OANDA:XAUUSD': 'TVC:GOLD',
        'OANDA:XAGUSD': 'TVC:SILVER',
        'OANDA:XAUEUR': 'TVC:GOLDEUR',
        'OANDA:XAUAUD': 'TVC:GOLDAUD',
        'OANDA:XAUJPY': 'TVC:GOLDJPY',
        'OANDA:EURUSD': 'FX:EURUSD',
        'OANDA:GBPUSD': 'FX:GBPUSD',
        'OANDA:USDJPY': 'FX:USDJPY',
        'OANDA:USDCHF': 'FX:USDCHF',
        'OANDA:AUDUSD': 'FX:AUDUSD',
        'OANDA:USDCAD': 'FX:USDCAD',
        'OANDA:NZDUSD': 'FX:NZDUSD',
        'OANDA:EURGBP': 'FX:EURGBP',
        'OANDA:EURJPY': 'FX:EURJPY',
        'OANDA:GBPJPY': 'FX:GBPJPY',
        'OANDA:AUDJPY': 'FX:AUDJPY',
        'OANDA:EURAUD': 'FX:EURAUD',
        'OANDA:GBPAUD': 'FX:GBPAUD',
        'OANDA:USDINR': 'FX:USDINR',
        'OANDA:EURINR': 'FX:EURINR',
        'BINANCE:BTCUSDT': 'BINANCE:BTCUSDT',
        'BINANCE:ETHUSDT': 'BINANCE:ETHUSDT',
        'BINANCE:SOLUSDT': 'BINANCE:SOLUSDT',
        'BINANCE:BNBUSDT': 'BINANCE:BNBUSDT',
        'BINANCE:BCHUSDT': 'BINANCE:BCHUSDT',
        'BINANCE:AAVEUSDT': 'BINANCE:AAVEUSDT',
        'BINANCE:MKRUSDT': 'BINANCE:MKRUSDT',
        'BINANCE:AVAXUSDT': 'BINANCE:AVAXUSDT',
        'BINANCE:LINKUSDT': 'BINANCE:LINKUSDT',
        'BINANCE:INJUSDT': 'BINANCE:INJUSDT',
        'BINANCE:DOTUSDT': 'BINANCE:DOTUSDT',
        'BINANCE:LTCUSDT': 'BINANCE:LTCUSDT',
        'BINANCE:APTUSDT': 'BINANCE:APTUSDT',
        'BINANCE:UNIUSDT': 'BINANCE:UNIUSDT',
        'BINANCE:ATOMUSDT': 'BINANCE:ATOMUSDT',
    };

    const tvSymbol = symbolMap[currentSymbol] || currentSymbol;
    const theme = document.body.classList.contains('light') ? 'light' : 'dark';
    const bgColor = theme === 'light' ? 'ffffff' : '070b14';

    console.log("TradingView iframe symbol:", tvSymbol);

    const url = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(tvSymbol)}&interval=15&theme=${theme}&style=1&locale=en&backgroundColor=%23${bgColor}&hide_side_toolbar=0&allow_symbol_change=1&save_image=0`;

    document.getElementById('tradingview_widget').src = url;
}

function waitForTradingView() {
    loadTradingViewChart();
}
//LIGHT / DARK MODE TOGGLE
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
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    fetchInitialPrice();
    connectLiveFeed();
    waitForTradingView();
});
