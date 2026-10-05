const ALLOWED_ORIGIN = "*";

// ===== Giao diện dashboard =====
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard cổ phiếu</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
:root{--bg:#f6f7f9;--card:#fff;--text:#1a1d21;--muted:#6b7280;--line:#e5e7eb;--accent:#2563eb;--up:#16a34a;--down:#dc2626}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#181b21;--text:#e8eaed;--muted:#9aa0a6;--line:#2a2e36;--accent:#60a5fa}}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}
.wrap{max-width:1000px;margin:0 auto;padding:20px 16px 40px}
h1{font-size:22px;margin:0 0 16px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}
input,select,button{font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text)}
input{width:110px;text-transform:uppercase}
button{cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button.chip.active{border-color:var(--accent);color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}
.label{font-size:12px;color:var(--muted)}
.value{font-size:22px;font-weight:600;margin-top:4px}
.up{color:var(--up)}.down{color:var(--down)}
.chart{height:340px}.chart.small{height:150px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:8px;text-align:right;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left}
.scroll{overflow-x:auto}
#msg{color:var(--down);min-height:20px;margin-bottom:8px}
</style>
</head>
<body>
<div class="wrap">
  <h1>📈 Dashboard cổ phiếu</h1>
  <div class="bar">
    <input id="ticker" value="VNM" maxlength="10">
    <select id="days">
      <option value="30">30 ngày</option>
      <option value="90" selected>90 ngày</option>
      <option value="180">180 ngày</option>
      <option value="365">1 năm</option>
    </select>
    <button class="primary" id="go">Xem</button>
    <span id="chips"></span>
  </div>
  <div id="msg"></div>
  <div class="grid" id="metrics"></div>
  <div class="card" style="margin-bottom:12px"><div class="chart"><canvas id="c1"></canvas></div></div>
  <div class="card" style="margin-bottom:12px"><div class="chart small"><canvas id="c2"></canvas></div></div>
  <div class="card scroll">
    <table>
      <thead><tr><th>Ngày</th><th>Mở</th><th>Cao</th><th>Thấp</th><th>Đóng</th><th>KL</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
</div>
<script>
var chart1, chart2;
var QUICK = ['VNM','FPT','HPG','VCB','TCB','SSI'];

function fmt(n){ return Number(n).toLocaleString('vi-VN', {maximumFractionDigits: 2}); }

function metric(label, value, cls){
  return '<div class="card"><div class="label">' + label + '</div><div class="value ' + (cls || '') + '">' + value + '</div></div>';
}

function render(t, data){
  data.sort(function(a, b){ return a.time < b.time ? -1 : 1; });
  var last = data[data.length - 1];
  var prev = data.length > 1 ? data[data.length - 2] : last;
  var chg = last.close - prev.close;
  var pct = prev.close ? chg / prev.close * 100 : 0;
  var cls = chg >= 0 ? 'up' : 'down';
  var hi = Math.max.apply(null, data.map(function(d){ return d.high; }));
  var lo = Math.min.apply(null, data.map(function(d){ return d.low; }));

  document.getElementById('metrics').innerHTML =
    metric('Giá đóng cửa ' + t, fmt(last.close), cls) +
    metric('Thay đổi', (chg >= 0 ? '+' : '') + fmt(chg) + ' (' + pct.toFixed(2) + '%)', cls) +
    metric('Cao nhất kỳ', fmt(hi)) +
    metric('Thấp nhất kỳ', fmt(lo)) +
    metric('KL phiên cuối', fmt(last.volume));

  var labels = data.map(function(d){ return String(d.time).slice(0, 10); });
  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();
  chart1 = new Chart(document.getElementById('c1'), {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Giá đóng cửa', data: data.map(function(d){ return d.close; }), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, pointRadius: 0, tension: 0.2 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 8 } } } }
  });
  chart2 = new Chart(document.getElementById('c2'), {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Khối lượng', data: data.map(function(d){ return d.volume; }), backgroundColor: '#9ca3af' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 8 } } } }
  });

  document.getElementById('rows').innerHTML = data.slice(-15).reverse().map(function(d){
    return '<tr><td>' + String(d.time).slice(0, 10) + '</td><td>' + fmt(d.open) + '</td><td>' + fmt(d.high) + '</td><td>' + fmt(d.low) + '</td><td>' + fmt(d.close) + '</td><td>' + fmt(d.volume) + '</td></tr>';
  }).join('');
}

async function load(t){
  t = (t || '').trim().toUpperCase();
  if (!t) return;
  document.getElementById('ticker').value = t;
  var msg = document.getElementById('msg');
  msg.textContent = 'Đang tải ' + t + '...';
  try {
    var days = document.getElementById('days').value;
    var r = await fetch('/price?ticker=' + encodeURIComponent(t) + '&days=' + days);
    var j = await r.json();
    if (!r.ok || j.error) throw new Error((j.error || 'Lỗi không xác định') + ' ' + (j.detail || ''));
    if (!j.data || !j.data.length) throw new Error('Không có dữ liệu cho ' + t);
    render(t, j.data);
    msg.textContent = '';
    document.querySelectorAll('.chip').forEach(function(b){ b.classList.toggle('active', b.textContent === t); });
  } catch (e) {
    msg.textContent = 'Lỗi: ' + e.message;
  }
}

document.getElementById('chips').innerHTML = QUICK.map(function(q){ return '<button class="chip">' + q + '</button> '; }).join('');
document.querySelectorAll('.chip').forEach(function(b){ b.onclick = function(){ load(b.textContent); }; });
document.getElementById('go').onclick = function(){ load(document.getElementById('ticker').value); };
document.getElementById('ticker').onkeydown = function(e){ if (e.key === 'Enter') load(this.value); };
document.getElementById('days').onchange = function(){ load(document.getElementById('ticker').value); };
load('VNM');
</script>
</body>
</html>`;

// ===== Nhà cung cấp dữ liệu =====
class HttpError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function getPriceTCBS(ticker, days, env) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 60 * 60 * 24 * days;
  const api =
    "https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term" +
    `?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;

  const res = await fetch(api, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) {
    throw new HttpError(502, `TCBS trả về lỗi ${res.status}`, (await res.text()).slice(0, 200));
  }
  const json = await res.json();
  return (json.data || []).map(d => ({
    time: d.tradingDate,
    open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
  }));
}

async function getPriceSSI() {
  throw new HttpError(501, "SSI chưa được cài đặt");
}

const providers = { tcbs: getPriceTCBS, ssi: getPriceSSI };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    },
  });
}

// ===== Xử lý request =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/") {
        return new Response(DASHBOARD_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/health") {
        return json({ ok: true, time: new Date().toISOString() });
      }

      if (url.pathname === "/price") {
        const ticker = (url.searchParams.get("ticker") || "VNM").toUpperCase();
        if (!/^[A-Z0-9]{2,10}$/.test(ticker)) throw new HttpError(400, "Mã cổ phiếu không hợp lệ");

        const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 1), 365);
        const name = (env.DATA_PROVIDER || "tcbs").toLowerCase();
        const provider = providers[name];
        if (!provider) throw new HttpError(400, `Nhà cung cấp không hỗ trợ: ${name}`);

        const data = await provider(ticker, days, env);
        return json({ provider: name, ticker, count: data.length, data });
      }

      throw new HttpError(404, "Không tìm thấy đường dẫn");
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: err.message, detail: err.detail || null }, status);
    }
  },
};
