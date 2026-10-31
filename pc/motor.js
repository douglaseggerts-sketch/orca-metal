// Verificação de alertas (mesma regra do app Android)
//  abaixo      → COMPRA quando preço ≤ valor
//  acima       → VENDA  quando preço ≥ valor
//  cruza_cima  → COMPRA quando a média curta cruza para cima da longa (período 1 = o próprio preço)
//  cruza_baixo → VENDA  quando a média curta cruza para baixo da longa

const URL_Y = 'https://query1.finance.yahoo.com/v8/finance/chart/';

const URL_TF = { d: '?range=2y&interval=1d', w: '?range=10y&interval=1wk', m: '?range=max&interval=1mo' };
function mesmoPeriodo(a, b, tf) {
  if (!a || !b) return false;
  if (tf === 'w') return Math.abs(b - a) < 6 * 86400;
  const n = tf === 'm' ? 7 : 10;
  return new Date(a * 1000).toISOString().slice(0, n) === new Date(b * 1000).toISOString().slice(0, n);
}
async function baixar(baixarTexto, sym, tf) {
  const j = JSON.parse(await baixarTexto(URL_Y + encodeURIComponent(sym) + URL_TF[tf]));
  const r = j.chart && j.chart.result && j.chart.result[0];
  if (!r) throw new Error('sem dados para ' + sym);
  const cc = (r.indicators.quote[0] || {}).close || [], ts = r.timestamp || [];
  const c = [], t = [];
  cc.forEach((x, i) => { if (x != null) { c.push(x); t.push(ts[i] || 0); } });
  // o Yahoo às vezes repete a semana/mês atual em duas linhas: fica só a última
  while (c.length >= 2 && mesmoPeriodo(t[t.length - 2], t[t.length - 1], tf)) { c.splice(c.length - 2, 1); t.splice(t.length - 2, 1); }
  let preco = r.meta.regularMarketPrice;
  if (preco == null) {
    if (!c.length) throw new Error('sem preço para ' + sym);
    preco = c[c.length - 1];
  } else if (c.length) c[c.length - 1] = preco; else c.push(preco);
  return { preco, moeda: r.meta.currency || 'BRL', fech: c };
}

function media(v, p, tipo) {
  const n = v.length;
  if (p <= 1) return n ? v[n - 1] : NaN;
  if (n < p) return NaN;
  if (tipo === 'EMA') {
    const k = 2 / (p + 1);
    let e = 0;
    for (let i = 0; i < p; i++) e += v[i];
    e /= p;
    for (let i = p; i < n; i++) e = v[i] * k + e * (1 - k);
    return e;
  }
  let s = 0;
  for (let i = n - p; i < n; i++) s += v[i];
  return s / p;
}

function ifr(v, p) {
  const n = v.length;
  if (p < 2 || n <= p) return NaN;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) { const d = v[i] - v[i - 1]; if (d > 0) g += d; else l -= d; }
  g /= p; l /= p;
  for (let i = p + 1; i < n; i++) {
    const d = v[i] - v[i - 1];
    g = (g * (p - 1) + Math.max(d, 0)) / p; l = (l * (p - 1) + Math.max(-d, 0)) / p;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function dinheiro(v, moeda) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(v); }
  catch (e) { return v.toFixed(2); }
}
const rot = s => s.replace(/\.SA$/, '');
const nomeMM = (p, t) => p <= 1 ? 'Preço' : (t === 'EMA' ? 'MME' : 'MM') + p;

/**
 * store: { alertas(): [], salvarAlertas(arr), put(k, v) }
 * baixarTexto(url) → Promise<string>
 * notificar(titulo, texto)
 */
async function verificar(store, baixarTexto, notificar) {
  const porAtivo = {};
  for (const a of store.alertas()) {
    if (a.ativo === false || a.disparadoEm || !a.sym) continue;
    (porAtivo[a.sym] = porAtivo[a.sym] || []).push(a);
  }
  const syms = Object.keys(porAtivo);
  if (!syms.length) { store.put('ultimaVerificacao', String(Date.now())); return 'Nenhum alerta ativo.'; }

  const mudancas = {};
  const erros = [];
  let disparados = 0;

  for (const sym of syms) {
    const cache = {};
    for (const a of porAtivo[sym]) {
      const ind = /^(cruza|ifr)/.test(a.tipo || '');
      const k = ind && (a.tf === 'w' || a.tf === 'm') ? a.tf : 'd';
      if (!cache[k]) {
        try { cache[k] = await baixar(baixarTexto, sym, k); }
        catch (e) { if (!erros.includes(rot(sym))) erros.push(rot(sym)); continue; }
      }
      const s = cache[k];
      const sufixo = ind ? (k === 'm' ? ' (mensal)' : k === 'w' ? ' (semanal)' : ' (diário)') : '';
      const m = {};
      let titulo = null, texto = null;
      if (a.tipo === 'abaixo' || a.tipo === 'acima') {
        if (!(a.valor > 0)) continue;
        const compra = a.tipo === 'abaixo';
        if (compra ? s.preco <= a.valor : s.preco >= a.valor) {
          titulo = (compra ? '🟢 COMPRA: ' : '🔴 VENDA: ') + rot(sym) + ' a ' + dinheiro(s.preco, s.moeda);
          texto = 'Preço ' + (compra ? 'chegou a ' : 'atingiu ') + dinheiro(s.preco, s.moeda) +
            ' (alvo ' + (compra ? '≤ ' : '≥ ') + dinheiro(a.valor, s.moeda) + ').';
        }
      } else if (a.tipo === 'cruza_cima' || a.tipo === 'cruza_baixo') {
        const pc = a.mmCurta || 9, pl = a.mmLonga || 21, tm = a.tipoMM || 'SMA';
        const curta = media(s.fech, pc, tm), longa = media(s.fech, pl, tm);
        if (isNaN(curta) || isNaN(longa)) continue;
        const lado = curta > longa ? 'acima' : 'abaixo';
        const antes = a.ultimoLado || '';
        m.ultimoLado = lado; m.ladoEm = Date.now();
        const querCima = a.tipo === 'cruza_cima';
        if (antes && antes !== lado && querCima === (lado === 'acima')) {
          const nc = nomeMM(pc, tm), nl = nomeMM(pl, tm);
          titulo = (querCima ? '🟢 COMPRA: ' : '🔴 VENDA: ') + rot(sym) + ' — ' + nc +
            (querCima ? ' cruzou para cima da ' : ' cruzou para baixo da ') + nl;
          texto = 'Preço ' + dinheiro(s.preco, s.moeda) + '. ' + nc + ' = ' + dinheiro(curta, s.moeda) +
            ', ' + nl + ' = ' + dinheiro(longa, s.moeda) + '.';
        }
      } else if (a.tipo === 'ifr_abaixo' || a.tipo === 'ifr_acima') {
        const pi = a.ifrP || 9, r = ifr(s.fech, pi);
        if (!(a.valor > 0) || isNaN(r)) continue;
        const compra = a.tipo === 'ifr_abaixo';
        if (compra ? r <= a.valor : r >= a.valor) {
          titulo = (compra ? '🟢 COMPRA: ' : '🔴 VENDA: ') + rot(sym) + ' — IFR(' + pi + ') ' +
            r.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + (compra ? ' (sobrevendido)' : ' (sobrecomprado)');
          texto = 'Preço ' + dinheiro(s.preco, s.moeda) + '. IFR ' + (compra ? '≤ ' : '≥ ') + a.valor + '.';
        }
      } else continue;

      if (titulo) {
        titulo += sufixo;
        if (a.nota) texto += '\n' + a.nota;
        Object.assign(m, { disparadoEm: Date.now(), precoDisparo: s.preco, ativo: false, mod: Date.now() });
        notificar(titulo, texto);
        disparados++;
      }
      if (Object.keys(m).length) mudancas[a.id] = m;
    }
  }

  // grava só o que mudou, sobre a versão atual (o usuário pode ter mexido no meio-tempo)
  if (Object.keys(mudancas).length) {
    const atual = store.alertas();
    for (const a of atual) {
      const m = mudancas[a.id];
      if (m && a.ativo !== false) Object.assign(a, m);
    }
    // só "disparou" conta como alteração para a sincronização; o lado das médias é interno
    store.salvarAlertas(atual, disparados > 0);
  }
  store.put('ultimaVerificacao', String(Date.now()));

  let r = disparados ? disparados + ' alerta(s) disparado(s).' : 'Nenhum alerta disparou.';
  if (erros.length) r += ' Sem cotação para: ' + erros.join(', ') + '.';
  return r;
}

module.exports = { verificar, media, ifr };
