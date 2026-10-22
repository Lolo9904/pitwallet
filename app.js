'use strict';
/* PitWallet — finanzas personales PWA. Datos en localStorage + sync opcional a un repo privado de GitHub. */

const KEY = 'pitwallet.data.v1', SYNC_KEY = 'pitwallet.sync.v1', SCHEMA = 1;
const $ = s => document.querySelector(s);
const now = () => Date.now();
const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ds(new Date());
const ymOf = d => d.slice(0, 7);
const parseNum = s => { const v = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : NaN; };
const r2 = n => Math.round(n * 100) / 100;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n, dec = 2) => (isFinite(n) ? n : 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec });
const fx = (n, d = 1) => isFinite(n) ? n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const live = a => a.filter(x => !x.del);
const addMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthLabel = (ym, short) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-ES', short ? { month: 'short' } : { month: 'long', year: 'numeric' }); };
const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dayLabel = d => new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const dateMs = d => new Date(d + 'T12:00').getTime();

/* ---------- Datos por defecto ---------- */
const DAYTYPES = {
  office: { n: 'Oficina', e: '🏢', s: 'OF' },
  idiada: { n: 'IDIADA', e: '🏁', s: 'ID' },
  custom: { n: 'Otro viaje', e: '🚗', s: 'VJ' },
  remote: { n: 'Teletrabajo', e: '🏠', s: 'TT' },
  off: { n: 'Libre', e: '🌴', s: 'LB' },
};
const WORK_TYPES = ['office', 'idiada', 'custom'];
const ACC_COLORS = { main: '#5aa9ff', save: '#3fd07a', hobby: '#ff4d2e' };

function defaults() {
  const t = 0; // u=0: cualquier dato real gana a los valores por defecto al sincronizar un dispositivo nuevo
  const accounts = [['main', 'Principal', '🏦'], ['save', 'Ahorro', '🐷'], ['hobby', 'Hobbys y viajes', '🏁']]
    .map(([id, name, icon], i) => ({ id, name, icon, initial: 0, order: i, u: t }));
  // [id, nombre, emoji, grupo, cuenta, esCoche]
  const E = [
    ['cafe', 'Café', '☕', 'Comida', 'main'], ['desayuno', 'Desayuno', '🥐', 'Comida', 'main'],
    ['comida', 'Comida fuera', '🍽️', 'Comida', 'main'], ['cena', 'Cena / restaurante', '🍷', 'Comida', 'main'],
    ['super', 'Supermercado', '🛒', 'Comida', 'main'], ['snack', 'Snacks / máquina', '🍫', 'Comida', 'main'],
    ['fuel', 'Gasoil coche', '⛽', 'Coche', 'main', 1], ['peajes', 'Peajes', '🛣️', 'Coche', 'main', 1],
    ['parking', 'Parking', '🅿️', 'Coche', 'main', 1], ['carmant', 'Mantenimiento coche', '🔧', 'Coche', 'main', 1],
    ['carseg', 'Seguro coche', '📄', 'Coche', 'main', 1], ['itv', 'ITV / impuestos', '🧾', 'Coche', 'main', 1],
    ['lavado', 'Lavado', '🧽', 'Coche', 'main', 1],
    ['quad', 'Quad (piezas)', '🏍️', 'Hobbys', 'hobby'], ['quadgas', 'Gasolina quad', '🛢️', 'Hobbys', 'hobby'],
    ['circuito', 'Circuito / karting', '🏁', 'Hobbys', 'hobby'], ['print3d', 'Impresión 3D', '🖨️', 'Hobbys', 'hobby'],
    ['electro', 'Electrónica', '🔌', 'Hobbys', 'hobby'], ['herram', 'Herramientas', '🛠️', 'Hobbys', 'hobby'],
    ['amazon', 'Amazon', '📦', 'Compras', 'main'], ['aliexpress', 'AliExpress', '📮', 'Compras', 'main'],
    ['ropa', 'Ropa', '👕', 'Compras', 'main'], ['tech', 'Tecnología', '💻', 'Compras', 'main'],
    ['crossfit', 'CrossFit', '🏋️', 'Deporte y salud', 'main'], ['farmacia', 'Farmacia', '💊', 'Deporte y salud', 'main'],
    ['pelu', 'Peluquería', '💈', 'Deporte y salud', 'main'],
    ['viajes', 'Viajes', '✈️', 'Ocio', 'hobby'], ['salidas', 'Salidas / fiesta', '🍻', 'Ocio', 'hobby'],
    ['eventos', 'Cine / eventos', '🎟️', 'Ocio', 'hobby'], ['subs', 'Suscripciones', '📱', 'Ocio', 'main'],
    ['regalos', 'Regalos', '🎁', 'Otros', 'main'], ['casa', 'Casa', '🏠', 'Otros', 'main'],
    ['movil', 'Móvil / telefonía', '📞', 'Otros', 'main'], ['banco', 'Comisiones banco', '🏦', 'Otros', 'main'],
    ['imprev', 'Imprevistos', '❗', 'Otros', 'main'], ['otros', 'Otros gastos', '•', 'Otros', 'main'],
  ];
  const I = [
    ['nomina', 'Nómina', '💶'], ['faros', 'Faros LED', '💡'], ['regalo_in', 'Regalos', '🎁'],
    ['venta', 'Venta 2ª mano', '🔄'], ['extra', 'Trabajo extra', '💻'], ['perdiem', 'Dietas / km empresa', '🚗'],
    ['intereses', 'Intereses', '📈'], ['otros_in', 'Otros ingresos', '•'],
    ['reimb', 'Reembolso empresa', '↩️', 1],
  ];
  const cats = [
    ...E.map(([id, name, emoji, group, acc, car], i) => ({ id, name, emoji, kind: 'exp', group, acc, budget: 0, car: !!car, order: i, u: t })),
    ...I.map(([id, name, emoji, sys], i) => ({ id, name, emoji, kind: 'inc', group: 'Ingresos', acc: 'main', budget: 0, sys: !!sys, order: 100 + i, u: t })),
  ];
  return {
    schema: SCHEMA, accounts, cats, tx: [], days: {},
    settings: { officeKm: 190, idiadaKm: 280, idiadaComp: 70, cons: 6.0, useReal: true, price: 1.70, compAcc: 'main', u: t },
  };
}

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.schema) return s; } catch (e) { }
  return null;
}
let S = load() || defaults();
const UI = { view: 'home', month: ymOf(today()), brush: null, f: { type: '', acc: '', cat: '', q: '' }, statsMonth: ymOf(today()) };

function persist() { localStorage.setItem(KEY, JSON.stringify(S)); }
function save() { persist(); render(); scheduleSync(); }

/* ---------- Helpers de dominio ---------- */
const accById = id => S.accounts.find(a => a.id === id);
const catById = id => S.cats.find(c => c.id === id);
const accName = id => accById(id)?.name || '¿?';
const catOf = t => catById(t.cat) || { name: t.type === 'tr' ? 'Transferencia' : t.type === 'adj' ? 'Ajuste de saldo' : 'Sin categoría', emoji: t.type === 'tr' ? '⇄' : t.type === 'adj' ? '⚖️' : '•' };
const sortedAccs = () => live(S.accounts).sort((a, b) => a.order - b.order);
const sortedCats = kind => live(S.cats).filter(c => c.kind === kind).sort((a, b) => a.order - b.order);
const txLive = () => live(S.tx);
// ¿Cuenta como gasto propio? (lo que adelantas para la empresa no)
const isOwnExp = t => t.type === 'exp' && !t.reimb;
const isOwnInc = t => t.type === 'inc' && t.cat !== 'reimb';

function balances() {
  const b = {};
  for (const a of live(S.accounts)) b[a.id] = +a.initial || 0;
  for (const t of txLive()) {
    const a = +t.amt || 0;
    if (t.type === 'exp') b[t.acc] = (b[t.acc] || 0) - a;
    else if (t.type === 'inc') b[t.acc] = (b[t.acc] || 0) + a;
    else if (t.type === 'tr') { b[t.acc] = (b[t.acc] || 0) - a; b[t.to] = (b[t.to] || 0) + a; }
    else if (t.type === 'adj') b[t.acc] = (b[t.acc] || 0) + a;
  }
  return b;
}

/* ---------- Coche ---------- */
const getDay = d => { const x = S.days[d]; return x && !x.del ? x : null; };
const dayKm = day => day.km != null ? +day.km : day.t === 'office' ? +S.settings.officeKm : day.t === 'idiada' ? +S.settings.idiadaKm : 0;
const dayComp = day => day.comp != null ? +day.comp : day.t === 'idiada' ? +S.settings.idiadaComp : 0;
const isWork = day => WORK_TYPES.includes(day.t);

function refuels() {
  return txLive().filter(t => t.type === 'exp' && t.fuel && t.fuel.l > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.fuel.odo || 0) - (b.fuel.odo || 0) || (a.u || 0) - (b.u || 0));
}
/* Cadena de repostajes. Cada repostaje lleva el odómetro total (odo) o los km recorridos desde el
   repostaje anterior (trip). Se reconstruye un odómetro "virtual" para poder mezclar ambos modos. */
function fuelChain() {
  const r = refuels(); const ch = r.map(t => ({ t, v: t.fuel.odo > 0 ? +t.fuel.odo : null, km: null }));
  for (let i = 1; i < ch.length; i++) if (ch[i].v == null && ch[i - 1].v != null && ch[i].t.fuel.trip > 0) ch[i].v = ch[i - 1].v + +ch[i].t.fuel.trip;
  for (let i = ch.length - 2; i >= 0; i--) if (ch[i].v == null && ch[i + 1].v != null && ch[i + 1].t.fuel.trip > 0) ch[i].v = ch[i + 1].v - ch[i + 1].t.fuel.trip;
  if (ch.length && ch.every(c => c.v == null)) { // solo trips: odómetro relativo desde 0
    let acc = 0; ch.forEach((c, i) => { c.rel = true; if (i === 0) { c.v = 0; return; } if (c.t.fuel.trip > 0) { acc += +c.t.fuel.trip; c.v = acc; } });
  }
  for (let i = 0; i < ch.length; i++) {
    const f = ch[i].t.fuel;
    ch[i].km = f.trip > 0 ? +f.trip : (i > 0 && ch[i].v != null && ch[i - 1].v != null && ch[i].v > ch[i - 1].v) ? ch[i].v - ch[i - 1].v : null;
  }
  return ch;
}
// Consumo real por método lleno-a-lleno (litros repostados ÷ km hechos desde el último lleno)
function consumption() {
  const seg = {}; let started = false, accL = 0, accKm = 0, totKm = 0, totL = 0, n = 0;
  for (const c of fuelChain()) {
    const f = c.t.fuel;
    if (!started) { if (f.full) { started = true; accL = 0; accKm = 0; } continue; }
    if (c.km == null) { started = !!f.full; accL = 0; accKm = 0; continue; } // hueco sin km: se reinicia la cadena
    accL += f.l; accKm += c.km;
    if (f.full) {
      if (accKm > 0) { seg[c.t.id] = { km: accKm, l: accL, c: accL / accKm * 100 }; totKm += accKm; totL += accL; n++; }
      accL = 0; accKm = 0;
    }
  }
  return { avg: totKm > 0 ? totL / totKm * 100 : null, seg, n, km: totKm };
}
function usedCons() { const c = consumption(); return S.settings.useReal && c.avg ? c.avg : +S.settings.cons; }
function priceAt(date) {
  const r = refuels(); let p = null;
  for (const t of r) { if (t.date <= date) p = t.amt / t.fuel.l; else break; }
  if (p == null && r.length) p = r[0].amt / r[0].fuel.l;
  return p ?? +S.settings.price;
}
const lastPrice = () => priceAt('9999-12-31');
const dayCost = (d, day) => dayKm(day) * usedCons() / 100 * priceAt(d);

// Odómetro interpolado (lineal entre repostajes con km)
function odoPoints() {
  const p = fuelChain().filter(c => c.v != null).map(c => ({ ms: dateMs(c.t.date), odo: c.v, d: c.t.date }));
  p.sort((a, b) => a.ms - b.ms || a.odo - b.odo); return p;
}
function odoAt(ms, pts) {
  if (!pts.length || ms < pts[0].ms || ms > pts[pts.length - 1].ms) return null;
  for (let i = 1; i < pts.length; i++) if (ms <= pts[i].ms) {
    const a = pts[i - 1], b = pts[i]; if (b.ms === a.ms) return b.odo;
    return a.odo + (b.odo - a.odo) * (ms - a.ms) / (b.ms - a.ms);
  }
  return pts[pts.length - 1].odo;
}
// km totales en un rango [d1,d2] (fechas inclusive) recortado a lo que cubren los repostajes
function kmRange(d1, d2) {
  const pts = odoPoints(); if (pts.length < 2) return null;
  let a = dateMs(d1) - 12 * 3600e3, b = dateMs(d2) + 12 * 3600e3;
  const lo = pts[0].ms, hi = pts[pts.length - 1].ms;
  a = Math.max(a, lo); b = Math.min(b, hi); if (b <= a) return null;
  return { km: odoAt(b, pts) - odoAt(a, pts), from: ds(new Date(a)), to: ds(new Date(b)) };
}
function workIn(d1, d2) {
  let km = 0, cost = 0, comp = 0, compPaid = 0; const n = { office: 0, idiada: 0, custom: 0, remote: 0, off: 0 };
  for (const [d, day] of Object.entries(S.days)) {
    if (day.del || d < d1 || d > d2) continue;
    n[day.t] = (n[day.t] || 0) + 1;
    if (!isWork(day)) continue;
    km += dayKm(day); cost += dayCost(d, day);
    const c = dayComp(day); comp += c; if (day.paid) compPaid += c;
  }
  return { km, cost, comp, compPaid, n };
}

/* ---------- Pendiente de cobro ---------- */
function pendingItems() {
  const items = [];
  for (const t of txLive()) if (t.type === 'exp' && t.reimb === 'pending')
    items.push({ kind: 'tx', id: t.id, date: t.date, amt: +t.amt, label: catOf(t).name + (t.note ? ' · ' + t.note : ''), emoji: catOf(t).emoji });
  for (const [d, day] of Object.entries(S.days)) {
    if (day.del || day.paid || d > today()) continue;
    const c = dayComp(day);
    if (c > 0) items.push({ kind: 'day', id: d, date: d, amt: c, label: day.t === 'idiada' ? 'Dietas IDIADA' : 'Viaje: ' + (day.note || 'trabajo'), emoji: DAYTYPES[day.t].e });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}
function markPaid(kind, id) {
  const t0 = now();
  if (kind === 'tx') {
    const t = S.tx.find(x => x.id === id); if (!t) return;
    const inc = { id: uid(), u: t0, type: 'inc', date: today(), amt: +t.amt, acc: t.acc, cat: 'reimb', note: 'Reembolso: ' + (catOf(t).name) + (t.note ? ' · ' + t.note : ''), link: t.id };
    S.tx.push(inc); t.reimb = 'paid'; t.reimbTx = inc.id; t.u = t0;
  } else {
    const day = S.days[id]; if (!day) return;
    const inc = { id: uid(), u: t0, type: 'inc', date: today(), amt: dayComp(day), acc: S.settings.compAcc || 'main', cat: 'perdiem', note: (day.t === 'idiada' ? 'Dietas IDIADA ' : 'Viaje ') + id, day: id };
    S.tx.push(inc); day.paid = true; day.paidTx = inc.id; day.u = t0;
  }
}
function unmarkPaid(kind, id) {
  const t0 = now();
  if (kind === 'tx') {
    const t = S.tx.find(x => x.id === id); if (!t) return;
    const inc = S.tx.find(x => x.id === t.reimbTx); if (inc) { inc.del = true; inc.u = t0; }
    t.reimb = 'pending'; t.reimbTx = null; t.u = t0;
  } else {
    const day = S.days[id]; if (!day) return;
    const inc = S.tx.find(x => x.id === day.paidTx); if (inc) { inc.del = true; inc.u = t0; }
    day.paid = false; day.paidTx = null; day.u = t0;
  }
}
function deleteTx(id) {
  const t = S.tx.find(x => x.id === id); if (!t) return; const t0 = now();
  t.del = true; t.u = t0;
  if (t.reimbTx) { const i = S.tx.find(x => x.id === t.reimbTx); if (i) { i.del = true; i.u = t0; } }
  if (t.link) { const o = S.tx.find(x => x.id === t.link); if (o && !o.del) { o.reimb = 'pending'; o.reimbTx = null; o.u = t0; } }
  if (t.day && S.days[t.day]) { const d = S.days[t.day]; d.paid = false; d.paidTx = null; d.u = t0; }
}

/* ---------- Render ---------- */
function render() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === UI.view));
  const v = { home: vHome, tx: vTx, car: vCar, stats: vStats, set: vSet }[UI.view];
  $('#view').innerHTML = v();
  $('.fab').style.display = UI.view === 'set' ? 'none' : '';
}
const mnav = (ym, key) => `<div class="mnav"><button data-a="mon" data-k="${key}" data-n="-1">‹</button><b>${monthLabel(ym)}</b><button data-a="mon" data-k="${key}" data-n="1">›</button></div>`;

function monthTotals(ym) {
  let inc = 0, exp = 0;
  for (const t of txLive()) if (ymOf(t.date) === ym) { if (isOwnInc(t)) inc += +t.amt; if (isOwnExp(t)) exp += +t.amt; }
  return { inc, exp, net: inc - exp };
}
function spendByCat(ym) {
  const m = {};
  for (const t of txLive()) if (isOwnExp(t) && ymOf(t.date) === ym) m[t.cat] = (m[t.cat] || 0) + +t.amt;
  return m;
}
function txRow(t) {
  const c = catOf(t); const a = +t.amt;
  let sign = '', cls = '';
  if (t.type === 'exp') { sign = '−'; cls = t.reimb ? 'amber' : ''; }
  else if (t.type === 'inc') { sign = '+'; cls = 'pos'; }
  else if (t.type === 'adj') { sign = a >= 0 ? '+' : '−'; cls = 'mut'; }
  const acc = t.type === 'tr' ? `${esc(accName(t.acc))} → ${esc(accName(t.to))}` : esc(accName(t.acc));
  let badges = '';
  if (t.reimb === 'pending') badges += '<span class="badge p">empresa · pendiente</span>';
  if (t.reimb === 'paid') badges += '<span class="badge ok">empresa · devuelto</span>';
  if (t.fuel) badges += `<span class="badge">${fx(t.fuel.l, 1)} L · ${fx(t.amt / t.fuel.l, 3)} €/L</span>`;
  return `<button class="li" data-a="editTx" data-id="${t.id}"><div class="ic">${c.emoji}</div><div class="mid"><div class="t1">${esc(t.note && t.type !== 'exp' && t.type !== 'inc' ? t.note : c.name)}${badges}</div><div class="t2">${t.note && (t.type === 'exp' || t.type === 'inc') ? esc(t.note) + ' · ' : ''}${acc}</div></div><div class="amt num ${cls}">${sign}${eur(Math.abs(a))}</div></button>`;
}
function budgetRows(ym, onlyBudgeted = true) {
  const sp = spendByCat(ym); const isCur = ym === ymOf(today());
  const pace = isCur ? new Date().getDate() / daysIn(ym) * 100 : null;
  const cats = sortedCats('exp').filter(c => c.budget > 0 || (!onlyBudgeted && sp[c.id]));
  if (!cats.length) return `<div class="empty">Sin presupuestos. Ponlos en Ajustes → Categorías.</div>`;
  let totB = 0, totS = 0;
  const rows = cats.map(c => {
    const s = sp[c.id] || 0, b = +c.budget; totB += b; totS += s;
    const p = b ? s / b * 100 : 0; const cl = p > 100 ? 'over' : p > 80 ? 'warn' : '';
    return `<div class="bud"><div class="h"><span>${c.emoji} ${esc(c.name)}</span><span class="num ${p > 100 ? 'neg' : ''}">${eur(s, 0)} <span class="mut">/ ${eur(b, 0)}</span></span></div><div class="bar ${cl}"><i style="width:${Math.min(p, 100)}%"></i>${pace != null ? `<span class="pace" style="left:${pace}%"></span>` : ''}</div></div>`;
  }).join('');
  const pT = totB ? totS / totB * 100 : 0;
  return `<div class="bud"><div class="h"><b>Total presupuestado</b><b class="num ${pT > 100 ? 'neg' : ''}">${eur(totS, 0)} / ${eur(totB, 0)}</b></div><div class="bar ${pT > 100 ? 'over' : pT > 80 ? 'warn' : ''}"><i style="width:${Math.min(pT, 100)}%"></i>${pace != null ? `<span class="pace" style="left:${pace}%"></span>` : ''}</div></div>` + rows +
    (pace != null ? `<div class="hint">La rayita marca dónde deberías ir según el día del mes (${Math.round(pace)}%).</div>` : '');
}

function vHome() {
  const b = balances(); const liq = Object.values(b).reduce((s, x) => s + x, 0);
  const pend = pendingItems(); const pendT = pend.reduce((s, x) => s + x.amt, 0);
  const ym = ymOf(today()); const mt = monthTotals(ym);
  const recent = txLive().sort((a, c) => c.date.localeCompare(a.date) || c.u - a.u).slice(0, 8);
  return `
  <section class="card hero">
    <div class="lbl">Saldo líquido (3 cuentas)</div>
    <div class="big num ${liq < 0 ? 'neg' : ''}">${eur(liq)}</div>
    <div class="row2">
      <div><span class="lbl">Pendiente empresa</span><b class="num amber">+${eur(pendT)}</b></div>
      <div><span class="lbl">Saldo real (cuando paguen)</span><b class="num">${eur(liq + pendT)}</b></div>
    </div>
  </section>
  <div class="accs">${sortedAccs().map(a => `<button class="acc" style="--c:${ACC_COLORS[a.id] || '#a78bfa'}" data-a="accSheet" data-id="${a.id}"><div class="n">${a.icon || ''} ${esc(a.name)}</div><b class="num ${b[a.id] < 0 ? 'neg' : ''}">${eur(b[a.id] || 0)}</b></button>`).join('')}</div>
  <section class="card"><h3><span>${monthLabel(ym)}</span><a data-a="tab" data-v="stats">Stats ›</a></h3>
    <div class="row3"><div class="kpi"><small>Ingresos</small><b class="num pos">${eur(mt.inc, 0)}</b></div><div class="kpi"><small>Gastos</small><b class="num neg">${eur(mt.exp, 0)}</b></div><div class="kpi"><small>Neto</small><b class="num ${mt.net < 0 ? 'neg' : 'pos'}">${eur(mt.net, 0)}</b></div></div>
  </section>
  <section class="card"><h3><span>Pendiente de cobro</span>${pend.length > 1 ? `<a data-a="payAll">Cobrar todo</a>` : ''}</h3>
    ${pend.length ? pend.map(p => `<div class="li"><div class="ic">${p.emoji}</div><div class="mid"><div class="t1">${esc(p.label)}</div><div class="t2">${dayLabel(p.date)}</div></div><div class="amt num amber">${eur(p.amt)}</div><button class="btn sm sec" data-a="pay" data-k="${p.kind}" data-id="${p.id}">Cobrado</button></div>`).join('') : '<div class="empty">Nada pendiente 👌</div>'}
  </section>
  <section class="card"><h3><span>Presupuesto del mes</span><a data-a="tab" data-v="set">Editar ›</a></h3>${budgetRows(ym)}</section>
  <section class="card"><h3><span>Últimos movimientos</span><a data-a="tab" data-v="tx">Todos ›</a></h3>${recent.length ? recent.map(txRow).join('') : '<div class="empty">Aún no hay movimientos. Dale al + para empezar.</div>'}</section>`;
}

function vTx() {
  const ym = UI.month, f = UI.f;
  let list = txLive().filter(t => ymOf(t.date) === ym);
  if (f.type) list = list.filter(t => f.type === 'reimb' ? !!t.reimb : f.type === 'fuel' ? !!t.fuel : t.type === f.type);
  if (f.acc) list = list.filter(t => t.acc === f.acc || t.to === f.acc);
  if (f.cat) list = list.filter(t => t.cat === f.cat);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(t => (t.note || '').toLowerCase().includes(q) || catOf(t).name.toLowerCase().includes(q)); }
  list.sort((a, b) => b.date.localeCompare(a.date) || b.u - a.u);
  let html = '', cur = '';
  const dayTot = {}; list.forEach(t => { if (t.type === 'exp') dayTot[t.date] = (dayTot[t.date] || 0) + +t.amt; });
  for (const t of list) {
    if (t.date !== cur) { cur = t.date; html += `<div class="dayhdr"><span>${dayLabel(cur)}</span><span class="num">${dayTot[cur] ? '−' + eur(dayTot[cur]) : ''}</span></div>`; }
    html += txRow(t);
  }
  const sumE = list.filter(t => t.type === 'exp').reduce((s, t) => s + +t.amt, 0), sumI = list.filter(t => t.type === 'inc').reduce((s, t) => s + +t.amt, 0);
  const types = [['', 'Todo'], ['exp', 'Gastos'], ['inc', 'Ingresos'], ['tr', 'Transf.'], ['fuel', 'Repostajes'], ['reimb', 'Empresa']];
  return mnav(ym, 'month') + `
  <div class="seg">${types.map(([k, n]) => `<button class="${f.type === k ? 'on' : ''}" data-a="ftype" data-k="${k}">${n}</button>`).join('')}</div>
  <div class="filters">
    <select data-ch="facc"><option value="">Todas las cuentas</option>${sortedAccs().map(a => `<option value="${a.id}" ${f.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
    <select data-ch="fcat"><option value="">Todas las categorías</option>${['exp', 'inc'].map(k => sortedCats(k).map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('')).join('')}</select>
  </div>
  <input type="search" placeholder="Buscar en notas…" value="${esc(f.q)}" data-ch="fq" style="margin-bottom:6px">
  <div class="card" style="padding:6px 14px">
    <div class="dayhdr" style="margin-top:6px"><span>${list.length} movimientos</span><span class="num"><span class="pos">+${eur(sumI)}</span> · <span class="neg">−${eur(sumE)}</span></span></div>
    ${html || '<div class="empty">Nada este mes con estos filtros.</div>'}
  </div>`;
}

function vCar() {
  const ym = UI.month; const [y, m] = ym.split('-').map(Number);
  const d1 = `${ym}-01`, d2 = `${ym}-${pad(daysIn(ym))}`;
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const td = today();
  let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(w => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let d = 1; d <= daysIn(ym); d++) {
    const dd = `${ym}-${pad(d)}`, day = getDay(dd), wd = (offset + d - 1) % 7;
    const c = day ? dayComp(day) : 0;
    const dot = c > 0 ? `<span class="dot">${day.paid ? '✓' : '€'}</span>` : '';
    cells += `<button class="d ${wd >= 5 ? 'we' : ''} ${dd === td ? 'today' : ''} ${day ? 't-' + day.t : ''}" data-a="day" data-d="${dd}">${d}${day ? `<small>${DAYTYPES[day.t].s}</small>` : ''}${dot}</button>`;
  }
  const w = workIn(d1, d2); const cons = usedCons(); const C = consumption();
  const kr = kmRange(d1, d2);
  let split = '';
  if (kr && kr.km > 0) {
    const ww = workIn(kr.from, kr.to); const pers = Math.max(0, kr.km - ww.km);
    const pWork = Math.min(100, ww.km / kr.km * 100);
    const persCost = pers * cons / 100 * priceAt(kr.to);
    split = `<div class="split"><i style="width:${pWork}%;background:var(--blu)"></i><i style="width:${100 - pWork}%;background:var(--acc)"></i></div>
      <div class="legend" style="margin-top:4px"><span><b class="blu">■</b> Trabajo ${fx(ww.km, 0)} km (${Math.round(pWork)}%)</span><span><b style="color:var(--acc)">■</b> Personal/hobby ${fx(pers, 0)} km · ${eur(persCost)}</span></div>
      <div class="hint">Km totales del odómetro ${fx(kr.km, 0)} km (del ${dayLabel(kr.from)} al ${dayLabel(kr.to)}, según tus repostajes).${ww.km > kr.km ? ' ⚠️ Marcas más km de trabajo que los que marca el odómetro: revisa los días o los km por defecto.' : ''}</div>`;
  } else split = `<div class="hint">Para separar trabajo/personal con km reales necesito repostajes con km (trip u odómetro) que cubran este mes.</div>`;
  const fuelMonth = refuels().filter(t => ymOf(t.date) === ym);
  const fuelSpent = fuelMonth.reduce((s, t) => s + +t.amt, 0), fuelL = fuelMonth.reduce((s, t) => s + t.fuel.l, 0);
  const compDays = Object.entries(S.days).filter(([d, x]) => !x.del && d >= d1 && d <= d2 && dayComp(x) > 0).sort();

  // 12 meses
  const from12 = ds(new Date(new Date().setFullYear(new Date().getFullYear() - 1))), to12 = td;
  const carCats = live(S.cats).filter(c => c.car).map(c => c.id);
  const car12 = {}; let car12T = 0;
  for (const t of txLive()) if (isOwnExp(t) && carCats.includes(t.cat) && t.date > from12 && t.date <= to12) { car12[t.cat] = (car12[t.cat] || 0) + +t.amt; car12T += +t.amt; }
  const km12 = kmRange(from12, to12);
  const w12 = workIn(from12, to12);
  const months12 = Math.max(1, Math.min(12, (() => { const all = txLive().filter(t => carCats.includes(t.cat)).map(t => t.date).sort(); if (!all.length) return 1; const f = all[0] > from12 ? all[0] : from12; return (dateMs(to12) - dateMs(f)) / (30.44 * 864e5); })()));
  const chainKm = {}; fuelChain().forEach(c => { chainKm[c.t.id] = c.km; });
  const segRows = refuels().slice().reverse().slice(0, 12).map(t => {
    const s = C.seg[t.id], k = chainKm[t.id];
    return `<tr data-a="editTx" data-id="${t.id}"><td>${dayLabel(t.date)}</td><td class="num">${fx(t.fuel.l, 1)}</td><td class="num">${fx(t.amt / t.fuel.l, 3)}</td><td class="num">${eur(t.amt)}</td><td class="num">${k != null ? fx(k, 0) : '—'}</td><td class="num">${s ? fx(s.c, 2) : t.fuel.full ? '' : '<span class="mut">parcial</span>'}</td></tr>`;
  }).join('');

  return mnav(ym, 'month') + `
  <section class="card"><h3><span>Calendario de trabajo</span></h3>
    <div class="brushes">
      <button class="${!UI.brush ? 'on' : ''}" data-a="brush" data-b="">✎ Editar día</button>
      ${Object.entries(DAYTYPES).map(([k, v]) => `<button class="${UI.brush === k ? 'on' : ''}" data-a="brush" data-b="${k}">${v.e} ${v.n}</button>`).join('')}
      <button class="${UI.brush === 'clear' ? 'on' : ''}" data-a="brush" data-b="clear">⌫ Borrar</button>
    </div>
    <div class="cal">${cells}</div>
    <div class="hint">${UI.brush ? (UI.brush === 'clear' ? 'Toca días para borrarlos.' : `Toca días para marcarlos como <b>${DAYTYPES[UI.brush].n}</b> (otra vez para quitar).`) : 'Elige un pincel y toca los días, o toca un día para editarlo en detalle.'} € = compensación pendiente, ✓ = cobrada.</div>
  </section>
  <section class="card"><h3><span>Trabajo este mes</span></h3>
    <div class="row3">
      <div class="kpi"><small>🏢 Oficina</small><b>${w.n.office} días</b></div>
      <div class="kpi"><small>🏁 IDIADA</small><b>${w.n.idiada} días</b></div>
      <div class="kpi"><small>🚗 Otros</small><b>${w.n.custom} días</b></div>
    </div>
    <table class="mini" style="margin-top:8px">
      <tr><td>Km por trabajo</td><td class="num">${fx(w.km, 0)} km</td></tr>
      <tr><td>Coste gasoil trabajo <span class="mut">(${fx(cons, 2)} L/100 · precio del último repostaje)</span></td><td class="num neg">−${eur(w.cost)}</td></tr>
      <tr><td>Compensaciones empresa</td><td class="num pos">+${eur(w.comp)}${w.comp && w.compPaid < w.comp ? ` <span class="amber">(${eur(w.comp - w.compPaid)} pdte)</span>` : ''}</td></tr>
      <tr><td><b>Coste neto de ir a trabajar</b></td><td class="num"><b class="${w.cost - w.comp > 0 ? 'neg' : 'pos'}">${eur(-(w.cost - w.comp))}</b></td></tr>
    </table>
    ${compDays.length ? `<div style="margin-top:10px">${compDays.map(([d, x]) => `<div class="li"><div class="ic">${DAYTYPES[x.t].e}</div><div class="mid"><div class="t1">${x.t === 'idiada' ? 'IDIADA' : esc(x.note || 'Viaje')}</div><div class="t2">${dayLabel(d)} · ${fx(dayKm(x), 0)} km</div></div><div class="amt num">${eur(dayComp(x))}</div>${x.paid ? `<button class="btn sm sec" data-a="unpay" data-k="day" data-id="${d}">✓ Cobrado</button>` : d <= td ? `<button class="btn sm" data-a="pay" data-k="day" data-id="${d}">Cobrar</button>` : '<span class="badge">futuro</span>'}</div>`).join('')}</div>` : ''}
  </section>
  <section class="card"><h3><span>Trabajo vs personal (km reales)</span></h3>${split}
    <table class="mini" style="margin-top:8px"><tr><td>Repostado este mes</td><td class="num">${fx(fuelL, 1)} L · ${eur(fuelSpent)}</td></tr></table>
  </section>
  <section class="card"><h3><span>Datos del coche</span></h3>
    <div class="row3">
      <div class="kpi"><small>Consumo real</small><b>${C.avg ? fx(C.avg, 2) : '—'}</b><small>${C.avg ? `L/100 · ${C.n} tramos` : 'faltan llenos'}</small></div>
      <div class="kpi"><small>Último €/L</small><b>${fx(lastPrice(), 3)}</b><small>${refuels().length ? 'último repostaje' : 'por defecto'}</small></div>
      <div class="kpi"><small>Gasoil €/km</small><b>${fx(cons / 100 * lastPrice(), 3)}</b><small>${fx(cons / 100 * lastPrice() * 100, 2)} €/100 km</small></div>
    </div>
    <h3 style="margin-top:14px"><span>Coste total coche · 12 meses</span></h3>
    <table class="mini">
      ${Object.entries(car12).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${catById(c)?.emoji || ''} ${esc(catById(c)?.name || c)}</td><td class="num">${eur(v)}</td></tr>`).join('') || '<tr><td class="mut">Sin gastos de coche aún</td><td></td></tr>'}
      <tr><td><b>Total</b></td><td class="num"><b>${eur(car12T)}</b></td></tr>
      <tr><td>Media mensual</td><td class="num">${eur(car12T / months12)}</td></tr>
      ${km12 && km12.km > 0 ? `<tr><td>Km recorridos (odómetro)</td><td class="num">${fx(km12.km, 0)} km</td></tr><tr><td><b>Coste real por km</b> <span class="mut">(todo incluido)</span></td><td class="num"><b>${fx(car12T / km12.km, 3)} €/km</b></td></tr>` : ''}
      <tr><td>Km de trabajo marcados</td><td class="num">${fx(w12.km, 0)} km</td></tr>
      <tr><td>Compensaciones cobradas/previstas</td><td class="num pos">+${eur(w12.comp)}</td></tr>
    </table>
    <div class="hint">Esta cifra €/km es la que tienes que comparar con la letra + seguro + carga de un coche nuevo.</div>
  </section>
  <section class="card"><h3><span>Repostajes</span><a data-a="add" data-t="fuel">+ Repostaje</a></h3>
    ${segRows ? `<table class="mini"><tr><th>Fecha</th><th>L</th><th>€/L</th><th>€</th><th>Km hechos</th><th>L/100</th></tr>${segRows}</table><div class="hint">El consumo sale por el método lleno-a-lleno: marca "depósito lleno" cuando llenes hasta el corte.</div>` : '<div class="empty">Registra tu primer repostaje con los litros y los km hechos (trip) u odómetro.</div>'}
  </section>`;
}

function vStats() {
  const ym = UI.statsMonth; const mt = monthTotals(ym); const sp = spendByCat(ym);
  const byGroup = {};
  for (const [cid, v] of Object.entries(sp)) { const g = catById(cid)?.group || 'Otros'; byGroup[g] = (byGroup[g] || 0) + v; }
  const gmax = Math.max(1, ...Object.values(byGroup));
  const cats = Object.entries(sp).sort((a, b) => b[1] - a[1]); const cmax = Math.max(1, ...cats.map(x => x[1]));
  const inc = {}; for (const t of txLive()) if (isOwnInc(t) && ymOf(t.date) === ym) inc[t.cat] = (inc[t.cat] || 0) + +t.amt;
  const incL = Object.entries(inc).sort((a, b) => b[1] - a[1]); const imax = Math.max(1, ...incL.map(x => x[1]));
  const months = [...Array(6)].map((_, i) => addMonth(ym, i - 5)); const mts = months.map(monthTotals);
  const vmax = Math.max(1, ...mts.map(x => Math.max(x.inc, x.exp)));
  const byAcc = {}; for (const t of txLive()) if (isOwnExp(t) && ymOf(t.date) === ym) byAcc[t.acc] = (byAcc[t.acc] || 0) + +t.amt;
  const rate = mt.inc > 0 ? (mt.net / mt.inc * 100) : null;
  const hb = (label, v, max, color) => `<div class="hbar"><span>${label}</span><div class="tr"><i style="width:${v / max * 100}%;${color ? 'background:' + color : ''}"></i></div><span class="num">${eur(v, 0)}</span></div>`;
  return mnav(ym, 'statsMonth') + `
  <section class="card"><div class="row3">
    <div class="kpi"><small>Ingresos</small><b class="num pos">${eur(mt.inc, 0)}</b></div>
    <div class="kpi"><small>Gastos</small><b class="num neg">${eur(mt.exp, 0)}</b></div>
    <div class="kpi"><small>Ahorro</small><b class="num ${mt.net < 0 ? 'neg' : 'pos'}">${rate != null ? Math.round(rate) + '%' : '—'}</b><small>${eur(mt.net, 0)}</small></div>
  </div></section>
  <section class="card"><h3><span>Últimos 6 meses</span><span class="lbl"><b class="pos">■</b> ingresos <b class="neg">■</b> gastos</span></h3>
    <div class="vchart">${months.map((mm, i) => `<div class="col"><div class="bars"><i style="height:${mts[i].inc / vmax * 100}%;background:var(--pos)"></i><i style="height:${mts[i].exp / vmax * 100}%;background:var(--neg)"></i></div><small>${monthLabel(mm, true)}</small></div>`).join('')}</div>
  </section>
  <section class="card"><h3><span>Gasto por grupo</span></h3>${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, v]) => hb(esc(g), v, gmax)).join('') || '<div class="empty">Sin gastos</div>'}</section>
  <section class="card"><h3><span>Gasto por categoría</span></h3>${cats.map(([c, v]) => hb(`${catById(c)?.emoji || ''} ${esc(catById(c)?.name || c)}`, v, cmax, 'var(--amb)')).join('') || '<div class="empty">Sin gastos</div>'}</section>
  <section class="card"><h3><span>De dónde viene el dinero</span></h3>${incL.map(([c, v]) => hb(`${catById(c)?.emoji || ''} ${esc(catById(c)?.name || c)}`, v, imax, 'var(--pos)')).join('') || '<div class="empty">Sin ingresos</div>'}</section>
  <section class="card"><h3><span>Gasto por cuenta</span></h3>${sortedAccs().map(a => hb(esc(a.name), byAcc[a.id] || 0, Math.max(1, ...Object.values(byAcc)), ACC_COLORS[a.id])).join('')}</section>
  <section class="card"><h3><span>Presupuestos</span></h3>${budgetRows(ym)}</section>
  <div class="hint" style="text-align:center;margin-bottom:10px">Lo que adelantas para la empresa y sus reembolsos no cuentan como gasto/ingreso.</div>`;
}

function vSet() {
  const st = S.settings, sc = syncCfg();
  const b = balances();
  const catList = kind => {
    let g = '', h = '';
    for (const c of sortedCats(kind).filter(c => !c.sys)) {
      if (c.group !== g) { g = c.group; h += `<div class="dayhdr"><span>${esc(g)}</span></div>`; }
      h += `<button class="li" data-a="catSheet" data-id="${c.id}"><div class="ic">${c.emoji}</div><div class="mid"><div class="t1">${esc(c.name)}${c.hidden ? '<span class="badge">oculta</span>' : ''}</div><div class="t2">${esc(accName(c.acc))}</div></div><div class="amt num ${c.budget ? '' : 'mut'}">${c.budget ? eur(c.budget, 0) + '/mes' : kind === 'exp' ? 'sin pto.' : ''}</div></button>`;
    }
    return h;
  };
  const inp = (k, v, step = 'any') => `<input type="text" inputmode="decimal" data-set="${k}" value="${esc(String(v).replace('.', ','))}">`;
  return `
  <section class="card"><h3><span>Cuentas</span></h3>
    ${sortedAccs().map(a => `<button class="li" data-a="accSheet" data-id="${a.id}"><div class="ic">${a.icon || '🏦'}</div><div class="mid"><div class="t1">${esc(a.name)}</div><div class="t2">Saldo inicial ${eur(+a.initial || 0)}</div></div><div class="amt num">${eur(b[a.id] || 0)}</div></button>`).join('')}
    <div class="hint">Toca una cuenta para poner saldo inicial, cuadrar el saldo real o renombrarla.</div>
  </section>
  <section class="card"><h3><span>Coche y trabajo</span></h3>
    <div class="setrow"><span>Km día de oficina (ida+vuelta)</span>${inp('officeKm', st.officeKm)}</div>
    <div class="setrow"><span>Km día IDIADA</span>${inp('idiadaKm', st.idiadaKm)}</div>
    <div class="setrow"><span>Compensación IDIADA (€)</span>${inp('idiadaComp', st.idiadaComp)}</div>
    <div class="setrow"><span>Consumo por defecto (L/100)</span>${inp('cons', st.cons)}</div>
    <div class="setrow"><span>Usar consumo real cuando haya datos</span><input type="checkbox" data-set="useReal" ${st.useReal ? 'checked' : ''}></div>
    <div class="setrow"><span>Precio por defecto (€/L)<br><small class="mut">solo si no hay repostajes</small></span>${inp('price', st.price)}</div>
    <div class="setrow"><span>Cuenta donde cobras dietas</span><select data-set="compAcc">${sortedAccs().map(a => `<option value="${a.id}" ${st.compAcc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
  </section>
  <section class="card"><h3><span>Categorías de gasto y presupuestos</span><a data-a="catSheet" data-kind="exp">+ Nueva</a></h3>${catList('exp')}</section>
  <section class="card"><h3><span>Fuentes de ingreso</span><a data-a="catSheet" data-kind="inc">+ Nueva</a></h3>${catList('inc')}</section>
  <section class="card"><h3><span>Sincronización (GitHub)</span></h3>
    <div class="f2"><div class="f"><label>Usuario</label><input id="sOwner" value="${esc(sc.owner || 'Lolo9904')}" autocapitalize="off"></div><div class="f"><label>Repo privado</label><input id="sRepo" value="${esc(sc.repo || 'pitwallet-data')}" autocapitalize="off"></div></div>
    <div class="f2"><div class="f"><label>Rama</label><input id="sBranch" value="${esc(sc.branch || 'main')}" autocapitalize="off"></div><div class="f"><label>Archivo</label><input id="sPath" value="${esc(sc.path || 'data.json')}" autocapitalize="off"></div></div>
    <div class="f"><label>Token (fine-grained, solo ese repo, Contents: read & write)</label><input id="sToken" type="password" value="${esc(sc.token || '')}" placeholder="github_pat_…" autocapitalize="off" autocomplete="off"></div>
    <div class="btns"><button class="btn" data-a="saveSync">Guardar y sincronizar</button>${sc.token ? '<button class="btn sec" data-a="clearSync" style="width:auto">Desconectar</button>' : ''}</div>
    <div class="hint" id="syncMsg">${esc(syncState.msg)}</div>
  </section>
  <section class="card"><h3><span>Datos</span></h3>
    <div class="btns"><button class="btn sec" data-a="exportJson">Backup JSON</button><button class="btn sec" data-a="exportCsv">Exportar CSV</button></div>
    <div class="btns"><label class="btn sec" style="text-align:center">Importar JSON<input type="file" accept="application/json,.json" data-ch="import" hidden></label><button class="btn ghost" data-a="wipe">Borrar local</button></div>
    <div class="hint">${txLive().length} movimientos · ${Object.values(S.days).filter(d => !d.del).length} días marcados · v1.1</div>
  </section>`;
}

/* ---------- Sheets ---------- */
function openSheet(html) { $('#sheet').innerHTML = html; document.body.classList.add('sheet-open'); }
function closeSheet() { document.body.classList.remove('sheet-open'); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200); }

let F = null; // estado del formulario de movimiento
function openTx(id, presetType) {
  const t = id ? S.tx.find(x => x.id === id) : null;
  if (t) F = { id: t.id, type: t.fuel ? 'fuel' : t.type, amt: t.amt, date: t.date, acc: t.acc, to: t.to, cat: t.cat, note: t.note || '', reimb: t.reimb || '', l: t.fuel?.l, full: t.fuel ? t.fuel.full : true, kmMode: t.fuel?.trip > 0 ? 'trip' : t.fuel?.odo > 0 ? 'odo' : (S.settings.fuelMode || 'trip'), km: t.fuel?.trip > 0 ? t.fuel.trip : t.fuel?.odo || '' };
  else {
    const type = presetType || 'exp';
    F = { id: null, type, amt: '', date: today(), acc: 'main', to: 'save', cat: type === 'fuel' ? 'fuel' : '', note: '', reimb: '', l: '', full: true, kmMode: S.settings.fuelMode || 'trip', km: '' };
  }
  renderTxForm();
}
function readTxForm() {
  const g = id => document.getElementById(id);
  if (!g('fAmt')) return;
  F.amt = g('fAmt').value; F.date = g('fDate').value || today(); F.acc = g('fAcc').value; F.note = g('fNote').value;
  if (g('fTo')) F.to = g('fTo').value;
  if (g('fReimb')) F.reimb = g('fReimb').value;
  if (g('fL')) { F.l = g('fL').value; F.km = g('fKm').value; F.full = g('fFull').checked; }
}
function renderTxForm() {
  const isNew = !F.id, T = F.type;
  if (F.reimb === 'paid' && T !== 'exp') F.reimb = '';
  const accOpts = sel => sortedAccs().map(a => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  const types = [['exp', 'Gasto'], ['inc', 'Ingreso'], ['tr', 'Transferencia'], ['fuel', '⛽ Repostaje']];
  let catHtml = '';
  if (T === 'exp' || T === 'inc') {
    let g = '';
    for (const c of sortedCats(T).filter(c => !c.sys && (!c.hidden || c.id === F.cat))) {
      if (T === 'exp' && c.group !== g) { g = c.group; catHtml += `<div class="catgrp">${esc(g)}</div>`; }
      catHtml += `<button class="${F.cat === c.id ? 'on' : ''}" data-a="pickCat" data-id="${c.id}"><span>${c.emoji}</span>${esc(c.name)}</button>`;
    }
  }
  let lastOdo = 0; fuelChain().forEach(c => { if (c.t.id !== F.id && c.t.fuel.odo > lastOdo) lastOdo = c.t.fuel.odo; });
  const trip = F.kmMode === 'trip';
  const linked = F.id && S.tx.find(x => x.id === F.id);
  const sysNote = linked && (linked.link || linked.day) ? `<div class="hint" style="margin-bottom:10px">Este ingreso se creó al marcar algo como cobrado. Si lo borras, vuelve a quedar pendiente.</div>` : '';
  openSheet(`
    <h2>${isNew ? 'Nuevo movimiento' : 'Editar'} <button class="link" data-a="closeSheet">Cerrar</button></h2>
    ${isNew ? `<div class="seg">${types.map(([k, n]) => `<button class="${T === k ? 'on' : ''}" data-a="fType" data-k="${k}">${n}</button>`).join('')}</div>` : ''}
    ${sysNote}
    <div class="f"><input id="fAmt" class="amtin num" inputmode="decimal" placeholder="0,00 €" value="${esc(String(F.amt ?? '').replace('.', ','))}" data-ch="fuelCalc"></div>
    ${T === 'fuel' ? `
      <div class="f2"><div class="f"><label>Litros</label><input id="fL" inputmode="decimal" value="${esc(String(F.l ?? '').replace('.', ','))}" data-ch="fuelCalc"></div>
      <div class="f"><label>${trip ? 'Km hechos desde el último repostaje' : 'Km del odómetro total'}</label><input id="fKm" inputmode="decimal" value="${esc(String(F.km ?? '').replace('.', ','))}" placeholder="${trip ? 'ej. 742 (trip)' : lastOdo ? 'último ' + lastOdo : 'ej. 214350'}" data-ch="fuelCalc"></div></div>
      <div class="seg" style="margin:-4px 0 10px"><button class="${trip ? 'on' : ''}" data-a="kmMode" data-k="trip">Km recorridos (trip)</button><button class="${!trip ? 'on' : ''}" data-a="kmMode" data-k="odo">Odómetro total</button></div>
      <div class="hint" id="fuelInfo" style="margin:-4px 0 10px"></div>
      <label class="chk"><input type="checkbox" id="fFull" ${F.full ? 'checked' : ''}> Depósito lleno (hasta el corte)</label>` : ''}
    ${catHtml ? `<div class="f"><label>Categoría</label><div class="catgrid">${catHtml}</div></div>` : ''}
    <div class="f2">
      <div class="f"><label>${T === 'tr' ? 'Desde' : 'Cuenta'}</label><select id="fAcc">${accOpts(F.acc)}</select></div>
      ${T === 'tr' ? `<div class="f"><label>Hacia</label><select id="fTo">${accOpts(F.to)}</select></div>` : `<div class="f"><label>Fecha</label><input id="fDate" type="date" value="${F.date}"></div>`}
    </div>
    ${T === 'tr' ? `<div class="f"><label>Fecha</label><input id="fDate" type="date" value="${F.date}"></div>` : ''}
    <div class="f"><label>${T === 'fuel' ? 'Gasolinera / nota' : 'Nota'}</label><input id="fNote" value="${esc(F.note)}" placeholder="${T === 'exp' ? 'ej. pastillas freno YFZ' : T === 'inc' ? 'ej. 2 kits LTZ' : ''}"></div>
    ${T === 'exp' || T === 'fuel' ? `<div class="f"><label>¿Lo tiene que devolver la empresa?</label><select id="fReimb"><option value="">No, es mío</option><option value="pending" ${F.reimb === 'pending' ? 'selected' : ''}>Sí · pendiente de cobro</option><option value="paid" ${F.reimb === 'paid' ? 'selected' : ''}>Sí · ya me lo han devuelto</option></select></div>` : ''}
    <div class="btns">${!isNew ? '<button class="btn ghost" data-a="delTx" style="width:auto">Borrar</button>' : ''}<button class="btn" data-a="saveTx">Guardar</button></div>
  `);
  if (T === 'fuel') fuelCalc();
  if (isNew) setTimeout(() => document.getElementById('fAmt')?.focus(), 250);
}
function fuelCalc() {
  const el = document.getElementById('fuelInfo'); if (!el) return;
  const a = parseNum($('#fAmt').value), l = parseNum($('#fL').value), k = parseNum($('#fKm').value), full = $('#fFull')?.checked;
  const date = $('#fDate')?.value || F.date || today();
  const parts = [];
  if (a > 0 && l > 0) parts.push(`<b>${fx(a / l, 3)} €/L</b>`);
  // Repostajes anteriores (sin el que estamos editando) para calcular el tramo lleno-a-lleno
  const prev = fuelChainExcept(F.id).filter(c => c.t.date <= date);
  let km = null;
  if (k > 0) {
    if (F.kmMode === 'trip') km = k;
    else { const lastV = [...prev].reverse().find(c => c.v != null && !c.rel); if (lastV && k > lastV.v) km = k - lastV.v; }
  }
  if (km != null && F.kmMode === 'odo') parts.push(`${fx(km, 0)} km desde el último`);
  if (km > 0 && l > 0) {
    let sumL = l, sumKm = km, ok = false, partials = 0;
    for (let i = prev.length - 1; i >= 0; i--) {
      const c = prev[i];
      if (c.t.fuel.full) { ok = true; break; }
      if (c.km == null) break;
      sumL += c.t.fuel.l; sumKm += c.km; partials++;
    }
    if (!full) parts.push('repostaje parcial: el consumo saldrá en el próximo lleno');
    else if (ok || !prev.length) parts.push(`consumo <b>${fx(sumL / sumKm * 100, 2)} L/100</b>${partials ? ` (suma ${partials} parcial${partials > 1 ? 'es' : ''})` : ''}${!prev.length ? ' · aprox., es el primer repostaje' : ''}`);
    if (full && a > 0) parts.push(`${fx(a / sumKm * 100, 2)} €/100 km`);
  }
  el.innerHTML = parts.join(' · ');
}
function fuelChainExcept(id) {
  const t = S.tx.find(x => x.id === id); if (!t || t.del) return fuelChain();
  t.del = true; try { return fuelChain(); } finally { t.del = false; }
}
function saveTx() {
  readTxForm();
  const amt = r2(parseNum(F.amt));
  if (!(amt > 0)) return toast('Pon un importe');
  const T = F.type;
  if ((T === 'exp' || T === 'inc') && !F.cat) return toast('Elige una categoría');
  if (T === 'tr' && F.acc === F.to) return toast('Elige dos cuentas distintas');
  let fuel = null;
  if (T === 'fuel') {
    const l = parseNum(F.l); if (!(l > 0)) return toast('Pon los litros');
    const k = parseNum(F.km);
    fuel = { l: r2(l), odo: F.kmMode === 'odo' && k > 0 ? Math.round(k) : 0, trip: F.kmMode === 'trip' && k > 0 ? r2(k) : 0, full: !!F.full };
    if (S.settings.fuelMode !== F.kmMode) { S.settings.fuelMode = F.kmMode; S.settings.u = now(); }
  }
  const t0 = now();
  let t = F.id ? S.tx.find(x => x.id === F.id) : null;
  const prevReimb = t?.reimb || '';
  if (!t) { t = { id: uid() }; S.tx.push(t); }
  Object.assign(t, {
    u: t0, type: T === 'fuel' ? 'exp' : T, amt, date: F.date, acc: F.acc, note: F.note.trim(),
    cat: T === 'fuel' ? 'fuel' : T === 'tr' ? null : F.cat, to: T === 'tr' ? F.to : null, fuel,
  });
  if (t.type === 'exp') {
    const want = F.reimb || null;
    if (prevReimb === 'paid' && want !== 'paid') unmarkPaid('tx', t.id);
    if (want === 'paid') { if (prevReimb !== 'paid') { t.reimb = 'pending'; markPaid('tx', t.id); } }
    else t.reimb = want;
    // si cambió el importe y ya estaba devuelto, actualiza el ingreso enlazado
    if (t.reimb === 'paid' && t.reimbTx) { const i = S.tx.find(x => x.id === t.reimbTx); if (i && i.amt !== amt) { i.amt = amt; i.u = t0; } }
  } else { t.reimb = null; }
  closeSheet(); save(); toast(F.id ? 'Guardado' : 'Añadido');
}

function openAccSheet(id) {
  const a = accById(id); const b = balances()[id] || 0;
  openSheet(`
    <h2>${a.icon || ''} ${esc(a.name)} <button class="link" data-a="closeSheet">Cerrar</button></h2>
    <div class="card hero" style="text-align:center"><div class="lbl">Saldo según la app</div><div class="big num">${eur(b)}</div></div>
    <div class="f"><label>Cuadrar saldo: ¿cuánto tienes de verdad en el banco?</label><input id="aReal" inputmode="decimal" placeholder="${fx(b, 2)}"></div>
    <div class="hint" style="margin:-6px 0 12px">Crea un movimiento de "Ajuste" con la diferencia, así no tocas el histórico.</div>
    <button class="btn" data-a="adjAcc" data-id="${id}">Cuadrar saldo</button>
    <div style="height:18px"></div>
    <div class="f2"><div class="f"><label>Nombre</label><input id="aName" value="${esc(a.name)}"></div><div class="f"><label>Icono</label><input id="aIcon" value="${esc(a.icon || '')}" maxlength="4"></div></div>
    <div class="f"><label>Saldo inicial</label><input id="aInit" inputmode="decimal" value="${String(+a.initial || 0).replace('.', ',')}"></div>
    <div class="hint" style="margin:-6px 0 12px">Lo que había en la cuenta antes del primer movimiento que apuntes.</div>
    <div class="btns"><button class="btn sec" data-a="add" data-t="tr">⇄ Transferir</button><button class="btn" data-a="saveAcc" data-id="${id}">Guardar</button></div>
  `);
}
function openCatSheet(id, kind) {
  const c = id ? catById(id) : { id: null, name: '', emoji: '🔸', kind, group: kind === 'inc' ? 'Ingresos' : 'Otros', acc: 'main', budget: 0 };
  const groups = [...new Set(sortedCats('exp').map(x => x.group))];
  openSheet(`
    <h2>${id ? 'Editar categoría' : 'Nueva categoría'} <button class="link" data-a="closeSheet">Cerrar</button></h2>
    <div class="f2" style="grid-template-columns:80px 1fr"><div class="f"><label>Emoji</label><input id="cEmoji" value="${esc(c.emoji)}" maxlength="4" style="text-align:center;font-size:22px"></div><div class="f"><label>Nombre</label><input id="cName" value="${esc(c.name)}"></div></div>
    ${c.kind === 'exp' ? `<div class="f"><label>Grupo</label><input id="cGroup" list="grps" value="${esc(c.group)}"><datalist id="grps">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>` : ''}
    <div class="f2"><div class="f"><label>Cuenta por defecto</label><select id="cAcc">${sortedAccs().map(a => `<option value="${a.id}" ${c.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
    ${c.kind === 'exp' ? `<div class="f"><label>Presupuesto €/mes</label><input id="cBudget" inputmode="decimal" value="${c.budget ? String(c.budget).replace('.', ',') : ''}" placeholder="0 = sin"></div>` : ''}</div>
    ${c.kind === 'exp' ? `<label class="chk"><input type="checkbox" id="cCar" ${c.car ? 'checked' : ''}> Cuenta como gasto del coche</label>` : ''}
    ${id ? `<label class="chk"><input type="checkbox" id="cHidden" ${c.hidden ? 'checked' : ''}> Ocultar al añadir (mantiene el histórico)</label>` : ''}
    <div class="btns"><button class="btn" data-a="saveCat" data-id="${id || ''}" data-kind="${c.kind}">Guardar</button></div>
  `);
}
function openDaySheet(d) {
  const day = getDay(d) || { t: UI.brush && UI.brush !== 'clear' ? UI.brush : 'office' };
  const defKm = t => t === 'office' ? S.settings.officeKm : t === 'idiada' ? S.settings.idiadaKm : 0;
  openSheet(`
    <h2>${dayLabel(d)} <button class="link" data-a="closeSheet">Cerrar</button></h2>
    <div class="seg" id="dType">${Object.entries(DAYTYPES).map(([k, v]) => `<button class="${day.t === k ? 'on' : ''}" data-a="dType" data-k="${k}">${v.e} ${v.n}</button>`).join('')}</div>
    <div class="f2"><div class="f"><label>Km del día</label><input id="dKm" inputmode="decimal" value="${day.km != null ? day.km : defKm(day.t)}"></div>
    <div class="f"><label>Compensación empresa €</label><input id="dComp" inputmode="decimal" value="${day.comp != null ? day.comp : day.t === 'idiada' ? S.settings.idiadaComp : 0}"></div></div>
    <div class="f"><label>Nota</label><input id="dNote" value="${esc(day.note || '')}" placeholder="ej. visita proveedor Barcelona"></div>
    <div class="hint" style="margin:-4px 0 12px">Coste estimado: ${eur(dayCost(d, { ...day, km: day.km ?? defKm(day.t) }))} (${fx(usedCons(), 2)} L/100 · ${fx(priceAt(d), 3)} €/L)</div>
    <div class="btns">${getDay(d) ? '<button class="btn ghost" data-a="delDay" style="width:auto">Quitar</button>' : ''}<button class="btn" data-a="saveDay" data-d="${d}">Guardar</button></div>
  `);
  openDaySheet.t = day.t;
}
function saveDay(d) {
  const t = openDaySheet.t, km = parseNum($('#dKm').value), comp = parseNum($('#dComp').value), note = $('#dNote').value.trim();
  const defKm = t === 'office' ? +S.settings.officeKm : t === 'idiada' ? +S.settings.idiadaKm : 0;
  const defComp = t === 'idiada' ? +S.settings.idiadaComp : 0;
  const prev = getDay(d) || {};
  const day = { ...prev, t, note, u: now(), del: false, km: isFinite(km) && km !== defKm ? km : null, comp: isFinite(comp) && comp !== defComp ? comp : null };
  if (!isWork(day)) { day.km = null; day.comp = null; }
  S.days[d] = day;
  if (dayComp(day) === 0 && day.paid) unmarkPaid('day', d);
  else if (day.paid && day.paidTx) { const i = S.tx.find(x => x.id === day.paidTx); if (i && i.amt !== dayComp(day)) { i.amt = dayComp(day); i.u = now(); } }
  closeSheet(); save();
}
function clearDay(d) {
  const day = S.days[d]; if (!day || day.del) return;
  if (day.paidTx) unmarkPaid('day', d);
  S.days[d] = { del: true, u: now() };
}
function applyBrush(d) {
  const b = UI.brush, cur = getDay(d);
  if (!b) return openDaySheet(d);
  if (b === 'clear' || (cur && cur.t === b)) { clearDay(d); return save(); }
  if (b === 'custom') { openDaySheet.t = 'custom'; return openDaySheet(d); }
  const day = { ...(cur || {}), t: b, km: null, comp: null, u: now(), del: false };
  S.days[d] = day;
  if (day.paid && dayComp(day) === 0) unmarkPaid('day', d);
  save();
}

/* ---------- Acciones ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  switch (a) {
    case 'tab': UI.view = el.dataset.v; closeSheet(); render(); scrollTo(0, 0); break;
    case 'mon': UI[el.dataset.k] = addMonth(UI[el.dataset.k], +el.dataset.n); render(); break;
    case 'add': openTx(null, el.dataset.t || (UI.view === 'car' ? 'fuel' : 'exp')); break;
    case 'editTx': openTx(id); break;
    case 'closeSheet': closeSheet(); break;
    case 'fType': readTxForm(); F.type = el.dataset.k; F.cat = F.type === 'fuel' ? 'fuel' : ''; if (F.type === 'tr' && F.to === F.acc) F.to = sortedAccs().find(x => x.id !== F.acc)?.id; renderTxForm(); break;
    case 'pickCat': {
      F.cat = id; document.querySelectorAll('.catgrid button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
      const c = catById(id); if (c?.acc && $('#fAcc')) $('#fAcc').value = c.acc;
      if (id === 'fuel' && F.type === 'exp' && !F.id) { readTxForm(); F.type = 'fuel'; renderTxForm(); }
      break;
    }
    case 'saveTx': saveTx(); break;
    case 'kmMode': readTxForm(); if (F.kmMode !== el.dataset.k) { F.kmMode = el.dataset.k; F.km = ''; } renderTxForm(); break;
    case 'delTx': if (confirm('¿Borrar este movimiento?')) { deleteTx(F.id); closeSheet(); save(); toast('Borrado'); } break;
    case 'pay': markPaid(el.dataset.k, id); save(); toast('Marcado como cobrado'); break;
    case 'unpay': if (confirm('¿Marcar otra vez como pendiente?')) { unmarkPaid(el.dataset.k, id); save(); } break;
    case 'payAll': if (confirm('¿Marcar todo lo pendiente como cobrado hoy?')) { pendingItems().forEach(p => markPaid(p.kind, p.id)); save(); toast('Todo cobrado'); } break;
    case 'ftype': UI.f.type = el.dataset.k; render(); break;
    case 'brush': UI.brush = el.dataset.b || null; render(); break;
    case 'day': applyBrush(el.dataset.d); break;
    case 'dType': {
      openDaySheet.t = el.dataset.k; document.querySelectorAll('#dType button').forEach(b => b.classList.toggle('on', b.dataset.k === el.dataset.k));
      const k = el.dataset.k; $('#dKm').value = k === 'office' ? S.settings.officeKm : k === 'idiada' ? S.settings.idiadaKm : 0; $('#dComp').value = k === 'idiada' ? S.settings.idiadaComp : 0;
      break;
    }
    case 'saveDay': saveDay(el.dataset.d); break;
    case 'delDay': { const d = $('[data-a=saveDay]').dataset.d; clearDay(d); closeSheet(); save(); break; }
    case 'accSheet': openAccSheet(id); break;
    case 'adjAcc': {
      const real = parseNum($('#aReal').value); if (!isFinite(real)) return toast('Pon el saldo real');
      const diff = r2(real - (balances()[id] || 0)); if (Math.abs(diff) < 0.005) { closeSheet(); return toast('Ya cuadra 👍'); }
      S.tx.push({ id: uid(), u: now(), type: 'adj', date: today(), amt: diff, acc: id, cat: null, note: 'Ajuste de saldo' });
      closeSheet(); save(); toast(`Ajustado ${diff > 0 ? '+' : ''}${eur(diff)}`); break;
    }
    case 'saveAcc': {
      const acc = accById(id); const init = parseNum($('#aInit').value);
      acc.name = $('#aName').value.trim() || acc.name; acc.icon = $('#aIcon').value.trim(); acc.initial = isFinite(init) ? r2(init) : 0; acc.u = now();
      closeSheet(); save(); break;
    }
    case 'catSheet': openCatSheet(id, el.dataset.kind); break;
    case 'saveCat': {
      const kind = el.dataset.kind; let c = id ? catById(id) : null;
      const name = $('#cName').value.trim(); if (!name) return toast('Pon un nombre');
      if (!c) { c = { id: 'c_' + uid(), kind, order: Math.max(0, ...S.cats.map(x => x.order || 0)) + 1, budget: 0 }; S.cats.push(c); }
      c.name = name; c.emoji = $('#cEmoji').value.trim() || '•'; c.acc = $('#cAcc').value;
      if (kind === 'exp') {
        const g = $('#cGroup').value.trim() || 'Otros';
        if (g !== c.group) { const same = sortedCats('exp').filter(x => x.group === g && x.id !== c.id); if (same.length) c.order = same[same.length - 1].order + 0.01; }
        c.group = g; const bud = parseNum($('#cBudget').value); c.budget = bud > 0 ? r2(bud) : 0; c.car = $('#cCar').checked;
      } else c.group = 'Ingresos';
      if ($('#cHidden')) c.hidden = $('#cHidden').checked;
      c.u = now(); closeSheet(); save(); break;
    }
    case 'sync': sync(true); break;
    case 'saveSync': {
      const cfg = { owner: $('#sOwner').value.trim(), repo: $('#sRepo').value.trim(), branch: $('#sBranch').value.trim() || 'main', path: $('#sPath').value.trim() || 'data.json', token: $('#sToken').value.trim() };
      localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); sync(true); break;
    }
    case 'clearSync': if (confirm('¿Quitar el token de este dispositivo? Los datos locales se quedan.')) { localStorage.removeItem(SYNC_KEY); setSync('', 'Sin sincronizar'); render(); } break;
    case 'exportJson': download(`pitwallet-${today()}.json`, JSON.stringify(S, null, 1), 'application/json'); break;
    case 'exportCsv': download(`pitwallet-${today()}.csv`, toCsv(), 'text/csv'); break;
    case 'wipe': if (confirm('Esto borra los datos de ESTE dispositivo (lo sincronizado en GitHub no). ¿Seguro?')) { localStorage.removeItem(KEY); S = defaults(); persist(); render(); } break;
  }
});
document.addEventListener('input', e => {
  const k = e.target.dataset.ch;
  if (k === 'fuelCalc') fuelCalc();
  if (k === 'fq') { UI.f.q = e.target.value; clearTimeout(UI._q); UI._q = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = $('[data-ch=fq]'); i.focus(); i.setSelectionRange(pos, pos); }, 300); }
});
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset.ch, s = t.dataset.set;
  if (k === 'facc') { UI.f.acc = t.value; render(); }
  if (k === 'fcat') { UI.f.cat = t.value; render(); }
  if (k === 'import') importFile(t.files[0]);
  if (s) {
    let v = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : parseNum(t.value);
    if (typeof v === 'number' && !isFinite(v)) return toast('Número no válido');
    S.settings[s] = v; S.settings.u = now(); save(); toast('Guardado');
  }
});

/* ---------- Export / import ---------- */
function download(name, text, type) {
  const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function toCsv() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const n = v => v == null || v === '' ? '' : String(v).replace('.', ',');
  const rows = [['fecha', 'tipo', 'cuenta', 'cuenta_destino', 'grupo', 'categoria', 'importe', 'nota', 'empresa', 'litros', 'odometro', 'km_hechos', 'lleno']];
  const tn = { exp: 'gasto', inc: 'ingreso', tr: 'transferencia', adj: 'ajuste' };
  for (const t of txLive().sort((a, b) => a.date.localeCompare(b.date))) {
    const c = catById(t.cat);
    rows.push([t.date, tn[t.type], accName(t.acc), t.to ? accName(t.to) : '', c?.group || '', c?.name || '', n(t.type === 'exp' ? -t.amt : t.amt), t.note, t.reimb || '', n(t.fuel?.l), t.fuel?.odo || '', n(t.fuel?.trip || ''), t.fuel ? (t.fuel.full ? 'si' : 'no') : '']);
  }
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\n');
}
function importFile(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { const d = JSON.parse(rd.result); if (!d.schema) throw 0; S = merge(S, d); persist(); render(); scheduleSync(); toast('Importado y fusionado'); }
    catch (e) { toast('Ese archivo no es un backup válido'); }
  };
  rd.readAsText(file);
}

/* ---------- Merge (por registro, gana el más reciente) ---------- */
function mergeArr(a = [], b = []) {
  const m = new Map();
  for (const x of [...a, ...b]) { const p = m.get(x.id); if (!p || (x.u || 0) > (p.u || 0)) m.set(x.id, x); }
  return [...m.values()].sort((x, y) => x.id < y.id ? -1 : 1);
}
function mergeObj(a = {}, b = {}) {
  const r = {};
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[k], y = b[k]; r[k] = !x ? y : !y ? x : (y.u || 0) > (x.u || 0) ? y : x;
  }
  return r;
}
function merge(L, R) {
  return {
    schema: SCHEMA,
    accounts: mergeArr(L.accounts, R.accounts), cats: mergeArr(L.cats, R.cats), tx: mergeArr(L.tx, R.tx),
    days: mergeObj(L.days, R.days),
    settings: (R.settings?.u || 0) > (L.settings?.u || 0) ? R.settings : L.settings,
  };
}
const canon = d => JSON.stringify(merge(d, { accounts: [], cats: [], tx: [], days: {}, settings: { u: -1 } }));

/* ---------- Sync con GitHub (Contents API) ---------- */
const syncCfg = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } };
const syncState = { msg: 'Sin sincronizar', busy: false, again: false };
function setSync(cls, msg) {
  syncState.msg = msg; const p = $('#syncPill'); p.className = 'sync-pill ' + cls;
  p.querySelector('span').textContent = cls === 'ok' ? 'sync' : cls === 'busy' ? '…' : cls === 'err' ? 'error' : 'local';
  const m = $('#syncMsg'); if (m) m.textContent = msg;
}
const b64e = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
let syncTimer = null;
function scheduleSync() { if (!syncCfg().token) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => sync(false), 2500); }
async function sync(manual) {
  const c = syncCfg();
  if (!c.token) { if (manual) { UI.view = 'set'; render(); toast('Configura la sincronización abajo'); } return; }
  if (syncState.busy) { syncState.again = true; return; }
  syncState.busy = true; setSync('busy', 'Sincronizando…');
  const url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`;
  const H = { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let remote = null, sha;
      const r = await fetch(`${url}?ref=${encodeURIComponent(c.branch)}&t=${now()}`, { headers: H, cache: 'no-store' });
      if (r.status === 200) {
        const j = await r.json(); sha = j.sha;
        let txt = j.content ? b64d(j.content) : await (await fetch(`${url}?ref=${encodeURIComponent(c.branch)}`, { headers: { ...H, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' })).text();
        remote = JSON.parse(txt);
      } else if (r.status === 401) throw new Error('Token no válido o caducado (401)');
      else if (r.status === 404) { const rr = await fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`, { headers: H }); if (rr.status !== 200) throw new Error('No encuentro el repo (¿nombre o permisos del token?)'); }
      else if (r.status !== 404) throw new Error(`GitHub respondió ${r.status}`);
      S = remote ? merge(S, remote) : merge(S, S); persist();
      const out = canon(S);
      if (remote && out === canon(remote)) { break; }
      const put = await fetch(url, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `sync ${new Date().toISOString()}`, content: b64e(JSON.stringify(S)), branch: c.branch, ...(sha ? { sha } : {}) }) });
      if (put.status === 200 || put.status === 201) break;
      if (put.status === 409 || put.status === 422) { if (attempt < 2) continue; }
      if (put.status === 403) throw new Error('Sin permiso de escritura (403): da Contents read & write al token');
      throw new Error(`Error al subir (${put.status})`);
    }
    setSync('ok', `Sincronizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    render(); if (manual) toast('Sincronizado ✓');
  } catch (e) {
    setSync('err', e.message || 'Sin conexión'); if (manual) toast(e.message || 'Sin conexión');
  } finally {
    syncState.busy = false;
    if (syncState.again) { syncState.again = false; scheduleSync(); }
  }
}

/* ---------- Arranque ---------- */
render();
if (syncCfg().token) sync(false);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && syncCfg().token) sync(false); });
window.addEventListener('online', () => scheduleSync());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
