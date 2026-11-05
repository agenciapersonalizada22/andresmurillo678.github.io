'use strict';
// Deteccion de tickers conocidos en titulares: $CASHTAGS, simbolos en mayusculas y nombres propios.

// simbolo -> alias (se busca con la capitalizacion indicada, como palabra completa)
const CRIPTO = {
  BTC: ['Bitcoin'], ETH: ['Ethereum', 'Ether'], SOL: ['Solana'], XRP: ['XRP', 'Ripple'], BNB: ['Binance Coin'], ADA: ['Cardano'],
  DOGE: ['Dogecoin'], AVAX: ['Avalanche'], DOT: ['Polkadot'], MATIC: ['Polygon'], LTC: ['Litecoin'], SHIB: ['Shiba Inu'],
  TRX: ['Tron'], TON: ['Toncoin'], XLM: ['Stellar'], ATOM: ['Cosmos'], XMR: ['Monero'], BCH: ['Bitcoin Cash'], ETC: ['Ethereum Classic'],
  USDT: ['Tether'], USDC: ['USDC'], DAI: [], PEPE: ['Pepe'], APT: ['Aptos'], ARB: ['Arbitrum'], OP: [], SUI: [], NEAR: [], FIL: ['Filecoin'],
  HBAR: [], ICP: [], UNI: ['Uniswap'], AAVE: ['Aave'], MKR: [], LINK: ['Chainlink'], ALGO: ['Algorand'], VET: ['VeChain'], FTM: ['Fantom']
};
const ACCIONES = {
  AAPL: ['Apple'], MSFT: ['Microsoft'], GOOGL: ['Alphabet', 'Google'], GOOG: [], AMZN: ['Amazon'], META: ['Meta Platforms'], TSLA: ['Tesla'],
  NVDA: ['Nvidia'], AMD: [], INTC: ['Intel'], NFLX: ['Netflix'], DIS: ['Disney'], JPM: ['JPMorgan'], BAC: ['Bank of America'], WMT: ['Walmart'],
  KO: ['Coca-Cola'], PEP: ['PepsiCo'], V: [], MA: [], XOM: ['Exxon'], CVX: ['Chevron'], BA: ['Boeing'], NKE: ['Nike'], ORCL: ['Oracle'],
  COIN: ['Coinbase'], MSTR: ['MicroStrategy', 'Strategy Inc'], PYPL: ['PayPal'], UBER: ['Uber'], SPY: [], QQQ: [], DIA: [], IWM: [],
  SAN: ['Banco Santander'], BBVA: ['BBVA'], ITX: ['Inditex'], TEF: ['Telefonica'], IBE: ['Iberdrola'], ARM: []
};
// Simbolos que son palabras comunes: solo se aceptan como $CASHTAG o con su nombre.
const AMBIGUOS = new Set(['OP', 'ARB', 'SUI', 'NEAR', 'UNI', 'LINK', 'V', 'MA', 'BA', 'KO', 'DIS', 'ARM', 'SAN', 'TON', 'DAI', 'ATOM', 'FIL', 'ETC', 'META', 'AMD', 'ICP', 'DOT', 'APT', 'AAVE', 'TRX']);

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function construir(extra = {}) {
  const mapa = new Map();
  for (const [s, al] of Object.entries(Object.assign({}, CRIPTO, ACCIONES))) mapa.set(s, al);
  for (const [s, al] of Object.entries(extra)) mapa.set(String(s).toUpperCase(), [].concat(al || []));
  const reAlias = [];
  for (const [s, al] of mapa) for (const a of al) reAlias.push([s, new RegExp(`(?<![\\p{L}\\p{N}])${escapar(a)}(?![\\p{L}\\p{N}])`, 'u')]);
  return { mapa, reAlias };
}
let base = null;

function extraerTickers(texto, { extra, max = 6, indice } = {}) {
  const ix = indice || (extra ? construir(extra) : (base = base || construir()));
  const t = String(texto || '');
  const hallados = [];
  const add = (s) => { if (!hallados.includes(s)) hallados.push(s); };
  for (const m of t.matchAll(/\$([A-Za-z]{1,6})\b/g)) { const s = m[1].toUpperCase(); if (ix.mapa.has(s)) add(s); }
  for (const m of t.matchAll(/(?<![\p{L}\p{N}$])([A-Z]{2,6})(?![\p{L}\p{N}])/gu)) { const s = m[1]; if (ix.mapa.has(s) && !AMBIGUOS.has(s)) add(s); }
  for (const [s, re] of ix.reAlias) if (re.test(t)) add(s);
  return hallados.slice(0, max);
}

module.exports = { extraerTickers, construir };
