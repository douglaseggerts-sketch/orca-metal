/* Regras de cálculo e formatação compartilhadas pelo app e pelo gerador de PDF. */
(function (root) {
  var UN = ['un', 'visita', 'mês', 'h', 'km', 'dia'];
  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var QF = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
  function money(n) { return BRL.format(isFinite(n) ? n : 0); }
  function qfmt(n) { return QF.format(n || 0); }
  function itTotal(i) { return (i.qtd || 0) * (i.preco || 0); }
  function calc(p) {
    var sub = 0;
    p.itens.forEach(function (i) { sub += itTotal(i); });
    var total = Math.max(0, sub - (p.desconto || 0));
    return { sub: sub, total: total };
  }
  var Core = { UN: UN, money: money, qfmt: qfmt, itTotal: itTotal, calc: calc };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
