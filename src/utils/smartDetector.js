// smartDetector.js
// Ultra hızlı, 100% deterministik Smart Detection Engine
// LLaMA/AI yerine kullanılır - milisaniyeler içinde coin tespiti

const BASE_NAME_MAP = {
  BTC: ["bitcoin"],
  ETH: ["ethereum"],
  SOL: ["solana"],
  BNB: ["binance coin", "bnb chain", "binance smart chain"],
  XRP: ["xrp", "ripple"],
  ADA: ["cardano"],
  DOGE: ["dogecoin"],
  SUI: ["sui"],
  AVAX: ["avalanche"],
  MATIC: ["polygon"],
  DOT: ["polkadot"],
  ATOM: ["cosmos"],
  APT: ["aptos"],
  LINK: ["chainlink"],
  UNI: ["uniswap"],
  AAVE: ["aave"],
  MKR: ["maker"],
};

const BLOCK_WORDS = [
  "stock market",
  "equity fund",
  "forex",
  "bond yield",
  "interest rate",
];

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCoinFromNews(title, description, baseSet) {
  const raw = `${title} ${description}`;
  if (!raw.trim()) return "NONE";

  const text = normalize(raw);

  // Block words kontrolü
  for (const bad of BLOCK_WORDS) {
    if (text.includes(bad)) return "NONE";
  }

  const scores = new Map();

  // baseSet içindeki her coin için skor hesapla
  for (const base of baseSet) {
    const upper = base.toUpperCase();

    let score = 0;

    // Coin isimleri kontrolü (3 puan)
    const names = BASE_NAME_MAP[upper] || [];
    for (const name of names) {
      if (text.includes(name.toLowerCase())) score += 3;
    }

    // Ticker sembolü kontrolü (2 puan) - kelime sınırları ile
    const tickerRegex = new RegExp(`\\b${upper}\\b`);
    if (tickerRegex.test(raw)) score += 2;

    if (score > 0) scores.set(upper, score);
  }

  if (scores.size === 0) return "NONE";

  // En yüksek skorlu coin'i bul
  let best = "NONE";
  let bestScore = 0;

  for (const [coin, sc] of scores.entries()) {
    if (sc > bestScore) {
      best = coin;
      bestScore = sc;
    }
  }

  // Minimum skor kontrolü
  if (bestScore < 2) return "NONE";
  return best;
}

