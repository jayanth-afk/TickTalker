/* TICKTALKER — DETAILS PAGE ENGINE (With Fallback Logic) */

const API_KEY = 'd76lko9r01qtg3ne294gd76lko9r01qtg3ne2950';
const REST_URL = 'https://finnhub.io/api/v1';

// 1. Grab the symbol from the URL
const urlParams = new URLSearchParams(window.location.search);
const currentSymbol = urlParams.get('symbol');

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

// 5. The Fallback Dictionary (Same as app.js)
function getWeekendFallback(symbol) {
    const fallbacks = {
        'OANDA:XAU_USD': 4748.18, 'OANDA:XAG_USD': 45.40, 'OANDA:XAU_EUR': 4047.55, 'OANDA:XAU_AUD': 7120.10, 'OANDA:XAU_JPY': 716000.00,
        'OANDA:EUR_USD': 1.1731, 'OANDA:GBP_USD': 1.3140, 'OANDA:USD_JPY': 151.20, 'OANDA:USD_CHF': 0.8820, 'OANDA:AUD_USD': 0.6650, 
        'OANDA:USD_CAD': 1.3480, 'OANDA:NZD_USD': 0.6110, 'OANDA:EUR_GBP': 0.8930, 'OANDA:EUR_JPY': 177.30, 'OANDA:GBP_JPY': 198.60, 
        'OANDA:AUD_JPY': 100.50, 'OANDA:EUR_AUD': 1.7640, 'OANDA:GBP_AUD': 1.9750, 'OANDA:USD_INR': 83.35, 'OANDA:EUR_INR': 97.75,
        'BINANCE:BCHUSDT': 510.50, 'BINANCE:MKRUSDT': 3450.00, 'BINANCE:APTUSDT': 15.45, 'BINANCE:ATOMUSDT': 11.20,
        'BINANCE:BTCUSDT': 70830.75, 'BINANCE:ETHUSDT': 3850.25
    };
    return fallbacks[symbol] || null; 
}

// Run the setup
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    fetchInitialPrice(); // Fetch the static price immediately!
    connectLiveFeed();   // Let the WebSocket take over if it's active
});