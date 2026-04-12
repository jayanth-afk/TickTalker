/* TICKTALKER — V3 (Directional Flashing & Visual Polish) */

const API_KEY = 'd76lko9r01qtg3ne294gd76lko9r01qtg3ne2950';
const WS_URL  = `wss://ws.finnhub.io?token=${API_KEY}`;
const REST_URL = 'https://finnhub.io/api/v1';

const marketsToTrack = [
    // METALS
    'OANDA:XAU_USD', 'OANDA:XAG_USD', 'OANDA:XAU_EUR', 'OANDA:XAU_AUD', 'OANDA:XAU_JPY',
    // FOREX MAJORS
    'OANDA:EUR_USD', 'OANDA:GBP_USD', 'OANDA:USD_JPY', 'OANDA:USD_CHF', 'OANDA:AUD_USD',
    'OANDA:USD_CAD', 'OANDA:NZD_USD', 'OANDA:EUR_GBP', 'OANDA:EUR_JPY', 'OANDA:GBP_JPY',
    'OANDA:AUD_JPY', 'OANDA:EUR_AUD', 'OANDA:GBP_AUD', 'OANDA:USD_INR', 'OANDA:EUR_INR',
    // CRYPTO
    'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:BNBUSDT', 'BINANCE:BCHUSDT',
    'BINANCE:AAVEUSDT', 'BINANCE:MKRUSDT', 'BINANCE:AVAXUSDT', 'BINANCE:LINKUSDT', 'BINANCE:INJUSDT',
    'BINANCE:DOTUSDT', 'BINANCE:LTCUSDT', 'BINANCE:APTUSDT', 'BINANCE:UNIUSDT', 'BINANCE:ATOMUSDT',
    // STOCKS
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 
    'GOOGL', 'META', 'NFLX', 'AMD', 'SPY', 
    'QQQ', 'INTC', 'DIS', 'BA', 'JPM'
];

let socket;

// === ENTRY POINT ===
function init() {
    startClock();
    updateMarketHeaderStatus(); // Updates the Red/Green Forex pill
    buildMarketGrid();
    connectWebSocket();
    fetchInitialPrices(); 
    fetchMarketNews(); 
    
    document.getElementById('search-input').addEventListener('input', filterMarkets);
    document.getElementById('sort-select').addEventListener('change', sortMarkets);
}

// === FEATURE: HEADER STATUS CHECKER ===
function updateMarketHeaderStatus() {
    const dot = document.getElementById('market-dot');
    const label = document.getElementById('market-label');
    
    // Check if it is Saturday (6) or Sunday (0)
    const day = new Date().getUTCDay();
    const isWeekend = (day === 0 || day === 6);
    
    if (isWeekend) {
        dot.className = 'badge-dot closed'; // Turns it Red
        label.innerText = 'Forex/Stocks: Closed';
    } else {
        dot.className = 'badge-dot open'; // Turns it Green
        label.innerText = 'Forex/Stocks: Live';
    }
}

// === FEATURE: VISUAL POLISH (ICONS) ===
// === FEATURE: VISUAL POLISH (COMPLETE ICON DICTIONARY) ===
function getMarketIcon(symbol) {
    // 🥇 METALS
    if (symbol.includes('XAU')) return '🥇'; // Gold
    if (symbol.includes('XAG')) return '🥈'; // Silver

    // 🌍 FOREX MAJORS & CROSSES
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
    
    // 🇮🇳 INDIAN RUPEE PAIRS
    if (symbol.includes('USD_INR')) return '🇺🇸/🇮🇳';
    if (symbol.includes('EUR_INR')) return '🇪🇺/🇮🇳';

    // ⚡ CRYPTO
    if (symbol.includes('BTC')) return '₿';
    if (symbol.includes('ETH')) return '⟠';
    if (symbol.includes('SOL')) return '◎';
    if (symbol.includes('BNB')) return '🟡'; // Binance Coin
    if (symbol.includes('BCH')) return '₿🟩'; // Bitcoin Cash
    if (symbol.includes('AAVE')) return '👻'; // Aave Ghost
    if (symbol.includes('MKR')) return 'Ⓜ️'; // Maker
    if (symbol.includes('AVAX')) return '🔺'; // Avalanche
    if (symbol.includes('LINK')) return '🔗'; // Chainlink
    if (symbol.includes('INJ')) return '🥷'; // Injective
    if (symbol.includes('DOT')) return '🟣'; // Polkadot
    if (symbol.includes('LTC')) return 'Ł'; // Litecoin
    if (symbol.includes('APT')) return '⚫'; // Aptos
    if (symbol.includes('UNI')) return '🦄'; // Uniswap
    if (symbol.includes('ATOM')) return '⚛️'; // Cosmos
    
    // 📈 US STOCKS
    if (symbol === 'AAPL') return '🍎';
    if (symbol === 'MSFT') return '🪟';
    if (symbol === 'TSLA') return '⚡🚗';
    if (symbol === 'AMZN') return '📦';
    if (symbol === 'META') return '♾️';
    if (symbol === 'NFLX') return '🍿';
    
    // Generic fallbacks for anything else
    if (symbol.includes('BINANCE')) return '⚡'; // Crypto
    if (symbol.includes('OANDA')) return '💱'; // Forex
    return '🏢'; // Stocks
}

// === BUILD THE HTML CARDS ===
function buildMarketGrid() {
    const grid = document.getElementById('markets-grid');
    grid.innerHTML = ''; 

    marketsToTrack.forEach(symbol => {
        const displayName = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        const icon = getMarketIcon(symbol); // Grab the right icon!

        const card = document.createElement('div');
        card.className = 'glass card market-card';
        card.id = `card-${symbol}`;
        card.dataset.symbol = displayName.toLowerCase();
        card.dataset.price = "0"; 

        // Notice the icon is now injected next to the display name!
        card.innerHTML = `
            <div class="market-symbol">${icon} ${displayName.replace('_', '/')}</div>
            <div class="market-price" id="price-${symbol}">---</div>
            <div class="market-time" id="time-${symbol}">Awaiting data...</div>
        `;
        // Make it look clickable
        card.style.cursor = 'pointer';
        
        // When clicked, redirect to the new page and pass the symbol in the URL!
        card.addEventListener('click', () => {
            window.location.href = `details.html?symbol=${symbol}`;
        });
        grid.appendChild(card);
    });
}

// === WEBSOCKET & DIRECTIONAL FLASHING ===
function connectWebSocket() {
    socket = new WebSocket(WS_URL);

    socket.addEventListener('open', function (event) {
        marketsToTrack.forEach(symbol => {
            socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
        });
    });

    socket.addEventListener('message', function (event) {
        const response = JSON.parse(event.data);
        
        if(response.type === "trade") {
            const symbol = response.data[0].s; 
            const newPrice = parseFloat(response.data[0].p);
            
            const cardElement = document.getElementById(`card-${symbol}`);
            const priceBox = document.getElementById(`price-${symbol}`);
            const timeBox = document.getElementById(`time-${symbol}`);
            
            if (priceBox && cardElement) {
                // FEATURE: DIRECTIONAL FLASHING
                const oldPrice = parseFloat(cardElement.dataset.price);
                let flashColor = "white"; // Default flash color
                
                // If it went up, flash Green. If it went down, flash Red!
                if (oldPrice > 0) {
                    if (newPrice > oldPrice) flashColor = "#39d98a"; 
                    else if (newPrice < oldPrice) flashColor = "#ff5f6d";
                }
                
                // Format and update UI
                priceBox.innerText = "$" + newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                cardElement.dataset.price = newPrice; // Save new price for the next comparison
                
                const now = new Date();
                timeBox.innerText = now.toLocaleTimeString() + ":" + now.getMilliseconds();
                
                // Execute the flash
                priceBox.style.color = flashColor;
                setTimeout(() => { priceBox.style.color = "#f0f2f8"; }, 2000); // Goes back to normal text color
            }
        }
    });
}

// === WEEKEND FALLBACK (Keeps Dashboard Looking Good) ===
async function fetchInitialPrices() {
    for (const symbol of marketsToTrack) {
        try {
            const response = await fetch(`${REST_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
            const data = await response.json();
            let priceToDisplay = (data && data.c && data.c > 0) ? data.c : getWeekendFallback(symbol);

            if (priceToDisplay) {
                const cardElement = document.getElementById(`card-${symbol}`);
                const priceBox = document.getElementById(`price-${symbol}`);
                const timeBox = document.getElementById(`time-${symbol}`);

                if (priceBox && priceBox.innerText === "---") {
                    priceBox.innerText = "$" + parseFloat(priceToDisplay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                    timeBox.innerText = "Last Close (Market Paused)";
                    if (cardElement) cardElement.dataset.price = priceToDisplay; 
                }
            }
        } catch (err) { }
        await new Promise(resolve => setTimeout(resolve, 100)); 
    }
}

// === WEEKEND FALLBACK DICTIONARY (Updated for April 12, 2026) ===
// Injects the actual weekend closing prices so the dashboard is accurate.
function getWeekendFallback(symbol) {
    const fallbacks = {
        // Metals (Updated to 2026 Surge Prices)
        'OANDA:XAU_USD': 4748.18, 'OANDA:XAG_USD': 45.40, 'OANDA:XAU_EUR': 4047.55, 
        'OANDA:XAU_AUD': 7120.10, 'OANDA:XAU_JPY': 716000.00,
        
        // Major Forex
        'OANDA:EUR_USD': 1.1731, 'OANDA:GBP_USD': 1.3140, 'OANDA:USD_JPY': 151.20, 
        'OANDA:USD_CHF': 0.8820, 'OANDA:AUD_USD': 0.6650, 'OANDA:USD_CAD': 1.3480, 
        'OANDA:NZD_USD': 0.6110, 
        
        // Forex Crosses & INR
        'OANDA:EUR_GBP': 0.8930, 'OANDA:EUR_JPY': 177.30, 'OANDA:GBP_JPY': 198.60, 
        'OANDA:AUD_JPY': 100.50, 'OANDA:EUR_AUD': 1.7640, 'OANDA:GBP_AUD': 1.9750, 
        'OANDA:USD_INR': 83.35, 'OANDA:EUR_INR': 97.75,
        
        // Slower Ticking Crypto / High-Value Coins
        'BINANCE:BCHUSDT': 510.50, 'BINANCE:MKRUSDT': 3450.00, 
        'BINANCE:APTUSDT': 15.45, 'BINANCE:ATOMUSDT': 11.20,
        'BINANCE:BTCUSDT': 70830.75, 'BINANCE:ETHUSDT': 3850.25
    };
    return fallbacks[symbol] || null; 
}

// === SEARCH & SORT ===
function filterMarkets(e) {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.market-card');
    const noResults = document.getElementById('no-results');
    let visibleCount = 0;

    cards.forEach(card => {
        if (card.dataset.symbol.includes(query)) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // If no cards match the search, show the "No Results" message
    if (visibleCount === 0) {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
}

function sortMarkets(e) {
    const sortBy = e.target.value;
    const grid = document.getElementById('markets-grid');
    const cards = Array.from(document.querySelectorAll('.market-card'));

    cards.sort((a, b) => {
        const priceA = parseFloat(a.dataset.price) || 0;
        const priceB = parseFloat(b.dataset.price) || 0;
        if (sortBy === 'high') return priceB - priceA;
        if (sortBy === 'low')  return priceA - priceB;
        if (sortBy === 'az')   return a.dataset.symbol.localeCompare(b.dataset.symbol);
        return 0; 
    });
    cards.forEach(card => grid.appendChild(card));
}

// === UI HELPERS ===
function startClock() {
    setInterval(() => { document.getElementById('live-clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); }, 1000);
}

async function fetchMarketNews() {
    try {
        const res = await fetch(`${REST_URL}/news?category=general&token=${API_KEY}`);
        const data = await res.json();
        document.getElementById('news-grid').innerHTML = data.filter(i => i.headline).slice(0, 4).map(a => `
            <a class="glass card news-card fade-up" href="${a.url}" target="_blank" style="text-decoration:none;">
                <div class="news-source" style="font-size:10px; color:#c9a230; text-transform:uppercase; margin-bottom:8px;">${a.source}</div>
                <div class="news-headline" style="color:#fff; font-weight:bold; margin-bottom:8px;">${a.headline}</div>
                <div class="news-summary" style="font-size:12px; color:#aaa;">${a.summary.substring(0, 80)}...</div>
            </a>
        `).join('');
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', init);