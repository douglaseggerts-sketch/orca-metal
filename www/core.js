/* Regras de cálculo e formatação compartilhadas pelo app e pelo gerador de PDF. */
(function (root) {
  var UN = {
    kg: { l: 'Peso (kg)', s: 'kg' },
    m2: { l: 'Área (m²)', s: 'm²' },
    m: { l: 'Metro linear (m)', s: 'm' },
    h: { l: 'Hora de trabalho (h)', s: 'h' },
    un: { l: 'Unidade (un)', s: 'un' }
  };
  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var QF = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
  function money(n) { return BRL.format(isFinite(n) ? n : 0); }
  function qfmt(n) { return QF.format(n || 0); }
  function itTotal(i) { return i.qtd * (1 + (i.perda || 0) / 100) * i.preco; }
  function calc(b) {
    var sub = 0;
    b.itens.forEach(function (i) { sub += itTotal(i); });
    var mg = sub * (b.margem || 0) / 100;
    var base = sub + mg;
    var imp = base * (b.impostos || 0) / 100;
    var bruto = base + imp;
    var total = Math.max(0, bruto - (b.desconto || 0));
    return { sub: sub, mg: mg, base: base, imp: imp, bruto: bruto, total: total, fator: sub > 0 ? bruto / sub : 1 };
  }
  function medidas(it) {
    var p = [];
    var d = [it.larg, it.alt, it.comp].filter(function (x) { return x > 0; }).map(function (x) { return QF.format(x); });
    if (d.length) p.push(d.join(' x ') + ' m');
    if (it.esp > 0) p.push('esp. ' + QF.format(it.esp) + ' mm');
    if (it.diam > 0) p.push('diâm. ' + QF.format(it.diam) + ' mm');
    if (it.pecas > 1) p.push(QF.format(it.pecas) + ' peças');
    return p.join(', ');
  }
  var Core = { UN: UN, money: money, qfmt: qfmt, itTotal: itTotal, calc: calc, medidas: medidas };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
