# Genera referencias.json con calculos independientes (Python + pandas) para contrastar los indicadores de js/indicadores.js.
import json, math
import pandas as pd

N = 70
c = [round(100 + 10 * math.sin(i / 5) + 0.3 * i + (i % 7) * 0.5, 2) for i in range(N)]
o = [round(c[i - 1] + ((i * 13) % 5 - 2) * 0.3, 2) if i else round(c[0] - 0.4, 2) for i in range(N)]
h = [round(max(o[i], c[i]) + 1 + (i % 3) * 0.4, 2) for i in range(N)]
l = [round(min(o[i], c[i]) - 1 - (i % 4) * 0.3, 2) for i in range(N)]
v = [1000 + (i * 37) % 500 for i in range(N)]
nan = None

def sma(x, n): return [None if i < n - 1 else sum(x[i - n + 1:i + 1]) / n for i in range(len(x))]
def ema(x, n):
    o_ = [None] * len(x); a = 2 / (n + 1)
    for i in range(len(x)):
        if i == n - 1: o_[i] = sum(x[:n]) / n
        elif i >= n: o_[i] = a * x[i] + (1 - a) * o_[i - 1]
    return o_
def wma(x, n): return [None if i < n - 1 else sum((k + 1) * x[i - n + 1 + k] for k in range(n)) / (n * (n + 1) / 2) for i in range(len(x))]
def rsi(x, n):
    d = [x[i] - x[i - 1] for i in range(1, len(x))]
    g = [max(t, 0) for t in d]; p = [max(-t, 0) for t in d]
    ag = sum(g[:n]) / n; ap = sum(p[:n]) / n; r = [None] * len(x); r[n] = 100 - 100 / (1 + ag / ap)
    for i in range(n, len(d)):
        ag = (ag * (n - 1) + g[i]) / n; ap = (ap * (n - 1) + p[i]) / n
        r[i + 1] = 100 - 100 / (1 + ag / ap)
    return r
def tr(i): return h[i] - l[i] if i == 0 else max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1]))
def atr(n):
    t = [tr(i) for i in range(N)]; r = [None] * N; r[n - 1] = sum(t[:n]) / n
    for i in range(n, N): r[i] = (r[i - 1] * (n - 1) + t[i]) / n
    return r
def adx(n):
    pdm = [0] + [max(h[i] - h[i - 1], 0) if (h[i] - h[i - 1]) > (l[i - 1] - l[i]) else 0 for i in range(1, N)]
    mdm = [0] + [max(l[i - 1] - l[i], 0) if (l[i - 1] - l[i]) > (h[i] - h[i - 1]) else 0 for i in range(1, N)]
    t = [tr(i) for i in range(N)]
    st = sum(t[1:n + 1]); sp = sum(pdm[1:n + 1]); sm = sum(mdm[1:n + 1])
    pdi = [None] * N; mdi = [None] * N; dx = [None] * N; ax = [None] * N
    for i in range(n, N):
        if i > n: st = st - st / n + t[i]; sp = sp - sp / n + pdm[i]; sm = sm - sm / n + mdm[i]
        pdi[i] = 100 * sp / st; mdi[i] = 100 * sm / st; dx[i] = 100 * abs(pdi[i] - mdi[i]) / (pdi[i] + mdi[i])
    ax[2 * n - 1] = sum(dx[n:2 * n]) / n
    for i in range(2 * n, N): ax[i] = (ax[i - 1] * (n - 1) + dx[i]) / n
    return pdi, mdi, ax
def stoch(n, k, d):
    raw = [None] * N
    for i in range(n - 1, N):
        hh = max(h[i - n + 1:i + 1]); ll = min(l[i - n + 1:i + 1]); raw[i] = 100 * (c[i] - ll) / (hh - ll)
    K = [None] * N
    for i in range(N):
        w = raw[i - k + 1:i + 1] if i >= k - 1 else []
        if len(w) == k and all(q is not None for q in w): K[i] = sum(w) / k
    D = [None] * N
    for i in range(N):
        w = K[i - d + 1:i + 1] if i >= d - 1 else []
        if len(w) == d and all(q is not None for q in w): D[i] = sum(w) / d
    return K, D
def obv():
    r = [0]
    for i in range(1, N): r.append(r[-1] + (v[i] if c[i] > c[i - 1] else -v[i] if c[i] < c[i - 1] else 0))
    return r
def mm(i, n, f): return f((h if f is max else l)[i - n + 1:i + 1])

macd_line = [None if (a is None or b is None) else a - b for a, b in zip(ema(c, 12), ema(c, 26))]
first = next(i for i, q in enumerate(macd_line) if q is not None)
sig = [None] * first + ema(macd_line[first:], 9)
ten = [None if i < 8 else (mm(i, 9, max) + mm(i, 9, min)) / 2 for i in range(N)]
kij = [None if i < 25 else (mm(i, 26, max) + mm(i, 26, min)) / 2 for i in range(N)]
spB = [None if i < 51 else (mm(i, 52, max) + mm(i, 52, min)) / 2 for i in range(N)]
pdi, mdi, ax = adx(14); K, D = stoch(14, 3, 3)
sc = pd.Series(c); mid = sc.rolling(20).mean(); sd = sc.rolling(20).std(ddof=0)
nn = lambda s: [None if pd.isna(q) else float(q) for q in s]
ref = {
  'entrada': {'o': o, 'h': h, 'l': l, 'c': c, 'v': v},
  'sma5': sma(c, 5), 'sma5_pandas': nn(sc.rolling(5).mean()), 'ema10': ema(c, 10), 'wma6': wma(c, 6), 'rsi14': rsi(c, 14),
  'macd': macd_line, 'macdSenal': sig,
  'bbMid': nn(mid), 'bbSup': nn(mid + 2 * sd), 'bbInf': nn(mid - 2 * sd),
  'atr14': atr(14), 'pdi14': pdi, 'mdi14': mdi, 'adx14': ax, 'stochK': K, 'stochD': D, 'obv': obv(),
  'tenkan': ten, 'kijun': kij, 'spanB': spB,
  'pivotes': {'P': (h[-1] + l[-1] + c[-1]) / 3},
  'rsiStockCharts': {'cierres': [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64],
                     'nota': 'Valores publicados por StockCharts (RSI 14 Wilder): 70.53 en el indice 14, 66.32 en el 15 y 66.55 en el 16 (aprox., redondeo de la fuente).'},
}
json.dump(ref, open('referencias.json', 'w'))
print('ok', len(c))
