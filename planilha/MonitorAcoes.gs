/**
 * Monitor de Ações — sincronização entre o celular e o PC pela Planilha Google.
 *
 * Como instalar (uma vez só):
 *  1. Na sua planilha: Extensões › Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 *  2. Troque a SENHA abaixo por uma senha sua (a mesma vai nos dois apps).
 *  3. Salve (ícone de disquete) › Implantar › Nova implantação › tipo "App da Web".
 *     Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa  › Implantar › Autorizar acesso.
 *  4. Copie o "URL do app da Web" e cole nos dois apps (aba Indicadores › Sincronizar).
 *
 * O script cria duas abas: "_monitor_sync" (dados dos apps, fica oculta) e
 * "Carteira (app)" (listas, metas, ativos e evolução mensal). As suas outras abas não são mexidas.
 */
const SENHA = 'troque-esta-senha';

const ABA_DADOS = '_monitor_sync';
const ABA_CARTEIRA = 'Carteira (app)';
const LIMITE_CELULA = 49000;

function doGet(e) {
  return responder(processar((e && e.parameter && e.parameter.chave) || '', null, ''));
}

function doPost(e) {
  let corpo = {};
  try { corpo = JSON.parse(e.postData.contents); } catch (err) { }
  return responder(processar(corpo.chave || '', corpo.dados || {}, corpo.aparelho || ''));
}

function responder(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function processar(chave, entrada, aparelho) {
  if (SENHA === 'troque-esta-senha') return { ok: false, erro: 'troque a SENHA no começo do script da planilha e publique de novo' };
  if (chave !== SENHA) return { ok: false, erro: 'senha incorreta' };
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const aba = abaDados_();
    const atual = lerDados_(aba);
    const r = juntar(atual, entrada || {});
    for (const k of r.mudou) {
      if (String(r.dados[k].v).length > LIMITE_CELULA) return { ok: false, erro: 'dados grandes demais para uma célula: ' + k };
    }
    if (r.mudou.length) gravarDados_(aba, r.dados, r.mudou);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (r.mudou.indexOf('carteira') >= 0 || !ss.getSheetByName(ABA_CARTEIRA)) {
      try { escreverCarteira_(r.dados.carteira ? JSON.parse(r.dados.carteira.v) : null); } catch (err) { }
    }
    return { ok: true, dados: r.dados, agora: Date.now() };
  } finally {
    lock.releaseLock();
  }
}

/* ======================= junção (sem dependência de planilha) ======================= */
/**
 * atual / entrada: { chave: { v: texto, t: hora_ms } }
 * Regra geral: vale a versão alterada por último.
 * Alertas: juntados um a um (cada alerta tem "mod"); exclusões ficam em alertasExcluidos.
 */
function juntar(atual, entrada) {
  const dados = {};
  const mudou = [];
  Object.keys(atual).forEach(k => dados[k] = { v: atual[k].v, t: +atual[k].t || 0 });
  const marcar = (k, v, t) => {
    if (!dados[k] || dados[k].v !== v || dados[k].t !== t) { dados[k] = { v: v, t: t }; if (mudou.indexOf(k) < 0) mudou.push(k); }
  };

  Object.keys(entrada).forEach(k => {
    if (k === 'alertas' || k === 'alertasExcluidos') return;
    const e = entrada[k];
    if (!e || e.v == null) return;
    const t = +e.t || 0;
    if (!dados[k] || t > dados[k].t) marcar(k, String(e.v), t);
  });

  // exclusões de alertas: união das duas listas
  const exc = Object.assign({}, lerJSON_(dados.alertasExcluidos && dados.alertasExcluidos.v, {}));
  const excE = lerJSON_(entrada.alertasExcluidos && entrada.alertasExcluidos.v, {});
  Object.keys(excE).forEach(id => { exc[id] = Math.max(exc[id] || 0, +excE[id] || 0); });
  const tExc = Math.max(dados.alertasExcluidos ? dados.alertasExcluidos.t : 0, entrada.alertasExcluidos ? +entrada.alertasExcluidos.t || 0 : 0);
  if (Object.keys(exc).length) marcar('alertasExcluidos', JSON.stringify(exc), tExc);

  // alertas: junta por id
  if (entrada.alertas || dados.alertas) {
    const S = lerJSON_(dados.alertas && dados.alertas.v, []);
    const E = lerJSON_(entrada.alertas && entrada.alertas.v, []);
    const porId = {};
    const ordem = [];
    const mod = a => +a.mod || +a.disparadoEm || +a.criadoEm || 0;
    S.concat(E).forEach(a => {
      if (!a || !a.id) return;
      const x = porId[a.id];
      if (!x) { porId[a.id] = a; ordem.push(a.id); return; }
      let escolhido = mod(a) > mod(x) ? a : x;
      const outro = escolhido === a ? x : a;
      // o "lado" das médias é a última observação, venha de onde vier
      if ((+outro.ladoEm || 0) > (+escolhido.ladoEm || 0) && escolhido.ativo !== false && !escolhido.disparadoEm) {
        escolhido = Object.assign({}, escolhido, { ultimoLado: outro.ultimoLado, ladoEm: outro.ladoEm });
      }
      porId[a.id] = escolhido;
    });
    const lista = ordem.filter(id => !exc[id]).map(id => porId[id])
      .sort((a, b) => (+a.criadoEm || 0) - (+b.criadoEm || 0));
    const tA = Math.max(dados.alertas ? dados.alertas.t : 0, entrada.alertas ? +entrada.alertas.t || 0 : 0, tExc);
    const v = JSON.stringify(lista);
    if (!dados.alertas || dados.alertas.v !== v) marcar('alertas', v, tA);
  }
  return { dados: dados, mudou: mudou };
}

function lerJSON_(txt, padrao) {
  if (txt == null || txt === '') return padrao;
  try { const o = JSON.parse(txt); return o == null ? padrao : o; } catch (e) { return padrao; }
}

/* ======================= aba de dados ======================= */
function abaDados_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA_DADOS);
  if (!aba) {
    aba = ss.insertSheet(ABA_DADOS);
    aba.getRange(1, 1, 1, 3).setValues([['chave', 'valor (JSON)', 'alterado em (ms)']]).setFontWeight('bold');
    aba.hideSheet();
  }
  return aba;
}

function lerDados_(aba) {
  const n = aba.getLastRow();
  const out = {};
  if (n < 2) return out;
  aba.getRange(2, 1, n - 1, 3).getValues().forEach((l, i) => {
    if (l[0]) out[String(l[0])] = { v: String(l[1]), t: +l[2] || 0, linha: i + 2 };
  });
  return out;
}

function gravarDados_(aba, dados, chaves) {
  const existentes = lerDados_(aba);
  chaves.forEach(k => {
    const linha = existentes[k] ? existentes[k].linha : aba.getLastRow() + 1;
    const cel = aba.getRange(linha, 1, 1, 3);
    cel.setNumberFormats([['@', '@', '0']]);
    cel.setValues([[k, dados[k].v, dados[k].t]]);
    existentes[k] = { linha: linha };
  });
}

/* ======================= aba "Carteira (app)" ======================= */
function escreverCarteira_(cart) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA_CARTEIRA);
  if (!aba) aba = ss.insertSheet(ABA_CARTEIRA);
  aba.getCharts().forEach(c => aba.removeChart(c));
  aba.clear();
  if (!cart || !cart.cats) {
    aba.getRange(1, 1).setValue('A carteira aparece aqui depois da primeira sincronização com dados.');
    return;
  }
  const R$ = 'R$ #,##0.00;-R$ #,##0.00';
  const valorItem = it => it.sym ? (+it.qtd || 0) * (+it.ult || 0) : (+it.valor || 0);
  const porCat = {};
  cart.cats.forEach(c => porCat[c.id] = 0);
  let total = 0;
  (cart.itens || []).forEach(it => { const v = valorItem(it); porCat[it.cat] = (porCat[it.cat] || 0) + v; total += v; });

  aba.getRange(1, 1).setValue('CARTEIRA (Monitor de Ações) — atualizado em ' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')).setFontWeight('bold').setFontSize(12);
  aba.getRange(2, 1).setValue('Os preços são os da última vez que a carteira foi aberta no app. Não edite esta aba: ela é reescrita a cada sincronização.')
    .setFontColor('#777777').setFontSize(9);

  // listas
  const cab = [['LISTA', 'VALOR', '% ATUAL', 'META %', 'VALOR META', 'APORTAR (+) / REDUZIR (−)']];
  const linhas = cart.cats.map(c => {
    const v = porCat[c.id] || 0, meta = (+c.meta || 0) / 100, alvo = total * meta;
    return [c.nome, v, total ? v / total : 0, meta, alvo, alvo - v];
  });
  linhas.push(['TOTAL', total, total ? 1 : 0, cart.cats.reduce((s, c) => s + (+c.meta || 0), 0) / 100, '', '']);
  const r0 = 4;
  aba.getRange(r0, 1, 1, 6).setValues(cab).setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  aba.getRange(r0 + 1, 1, linhas.length, 6).setValues(linhas);
  aba.getRange(r0 + 1, 2, linhas.length, 1).setNumberFormat(R$);
  aba.getRange(r0 + 1, 3, linhas.length, 2).setNumberFormat('0.00%');
  aba.getRange(r0 + 1, 5, linhas.length, 2).setNumberFormat(R$);
  cart.cats.forEach((c, i) => aba.getRange(r0 + 1 + i, 1).setBackground(c.cor || '#ffffff').setFontWeight('bold'));
  linhas.slice(0, -1).forEach((l, i) => aba.getRange(r0 + 1 + i, 6).setFontColor(l[5] >= 0 ? '#0a8f4f' : '#c62828'));
  aba.getRange(r0 + linhas.length, 1, 1, 6).setFontWeight('bold').setBackground('#f2f2f2');

  // ativos (como a aba de cada lista: preço, alvo, sinal, PM, investido, lucro)
  const a0 = r0 + linhas.length + 2;
  const nomeCat = {}; cart.cats.forEach(c => nomeCat[c.id] = c.nome);
  const ativos = (cart.itens || []).map(it => {
    const v = valorItem(it), inv = it.sym && it.pm ? (+it.pm) * (+it.qtd || 0) : '';
    const sinal = it.sym && it.alvo && it.ult ? (it.ult <= it.alvo ? 'COMPRA' : 'ACIMA DO ALVO') : '';
    return [nomeCat[it.cat] || '—', it.sym ? String(it.sym).replace(/\.SA$/, '') : it.nome,
      it.sym ? +it.ult || 0 : '', it.alvo ? +it.alvo : '', sinal, it.sym ? +it.qtd || 0 : '',
      it.sym && it.pm ? +it.pm : '', inv, v, inv ? v / inv - 1 : ''];
  }).sort((x, y) => String(x[0]).localeCompare(String(y[0])) || y[8] - x[8]);
  aba.getRange(a0, 1, 1, 10).setValues([['LISTA', 'ATIVO', 'PREÇO', 'ALVO', 'SINAL', 'QTD', 'PM', 'INVESTIDO', 'VALOR', 'LUCRO']])
    .setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  if (ativos.length) {
    aba.getRange(a0 + 1, 1, ativos.length, 10).setValues(ativos);
    aba.getRange(a0 + 1, 3, ativos.length, 2).setNumberFormat(R$);
    aba.getRange(a0 + 1, 7, ativos.length, 3).setNumberFormat(R$);
    aba.getRange(a0 + 1, 10, ativos.length, 1).setNumberFormat('0.00%');
    ativos.forEach((l, i) => {
      if (l[4] === 'COMPRA') aba.getRange(a0 + 1 + i, 5).setBackground('#00ff00').setFontWeight('bold');
      else if (l[4]) aba.getRange(a0 + 1 + i, 5).setFontColor('#c62828');
      if (l[9] !== '') aba.getRange(a0 + 1 + i, 10).setFontColor(l[9] >= 0 ? '#0a8f4f' : '#c62828');
    });
    const invT = ativos.reduce((s, l) => s + (+l[7] || 0), 0), valT = ativos.reduce((s, l) => s + (l[7] ? +l[8] : 0), 0);
    aba.getRange(a0 + 1 + ativos.length, 7, 1, 4).setValues([['TOTAL', invT, valT, invT ? valT / invT - 1 : '']]).setFontWeight('bold');
    aba.getRange(a0 + 1 + ativos.length, 8, 1, 2).setNumberFormat(R$);
    aba.getRange(a0 + 1 + ativos.length, 10).setNumberFormat('0.00%');
  }

  // aportes
  const aps = (cart.aportes || []).slice().sort((x, y) => x.d < y.d ? -1 : 1);
  const somaAte = m => aps.filter(x => x.d.slice(0, 7) <= m).reduce((s, x) => s + (+x.v || 0), 0);
  const noMes = m => aps.filter(x => x.d.slice(0, 7) === m).reduce((s, x) => s + (+x.v || 0), 0);
  const p0 = r0, pc = 17;
  aba.getRange(p0, pc, 1, 2).setValues([['APORTES', 'DATA']]).setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  if (aps.length) {
    aba.getRange(p0 + 1, pc, aps.length, 2).setValues(aps.map(x => [+x.v || 0, x.d.split('-').reverse().join('/')]));
    aba.getRange(p0 + 1, pc, aps.length, 1).setNumberFormat(R$);
    aba.getRange(p0 + 1, pc + 1, aps.length, 1).setNumberFormat('@');
    const tot = somaAte('9999-99');
    aba.getRange(p0 + 2 + aps.length, pc, 3, 2).setValues([[tot, 'TOTAL APORTADO'], [total - tot, 'LUCRO / PREJUÍZO'], [tot ? total / tot - 1 : '', '% SOBRE APORTES']]).setFontWeight('bold');
    aba.getRange(p0 + 2 + aps.length, pc, 2, 1).setNumberFormat(R$);
    aba.getRange(p0 + 4 + aps.length, pc).setNumberFormat('0.00%');
  }

  // evolução mensal
  const hist = (cart.hist || []).slice().sort((x, y) => x.m < y.m ? -1 : 1);
  const h0 = r0, hc = 12, temAp = aps.length > 0;
  aba.getRange(h0, hc, 1, 4).setValues([['MÊS/ANO', 'TOTAL', '% MÊS', '% ACUMULADO']])
    .setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  if (hist.length) {
    const t0 = hist[0].t;
    const hl = hist.map((x, i) => {
      const p = x.m.split('-'), ant = i ? hist[i - 1].t : 0, base = temAp ? somaAte(x.m) : t0;
      return [p[1] + '/' + p[0], x.t, ant ? (x.t - ant - (temAp ? noMes(x.m) : 0)) / ant : '', base ? x.t / base - 1 : ''];
    });
    aba.getRange(h0 + 1, hc, hl.length, 4).setValues(hl);
    aba.getRange(h0 + 1, hc, hl.length, 1).setNumberFormat('@');
    aba.getRange(h0 + 1, hc + 1, hl.length, 1).setNumberFormat(R$);
    aba.getRange(h0 + 1, hc + 2, hl.length, 2).setNumberFormat('0.00%');
  }
  aba.autoResizeColumns(1, 18);

  // gráficos
  const gl = a0 + Math.max(ativos.length, 1) + 3;
  aba.insertChart(aba.newChart().asColumnChart()
    .addRange(aba.getRange(r0, 1, cart.cats.length + 1, 2))
    .setPosition(gl, 1, 0, 0)
    .setOption('title', 'Valor por lista').setOption('legend', { position: 'none' }).build());
  if (hist.length) {
    aba.insertChart(aba.newChart().asLineChart()
      .addRange(aba.getRange(h0, hc, hist.length + 1, 2))
      .setPosition(gl, 7, 0, 0)
      .setOption('title', 'Evolução mensal').setOption('legend', { position: 'none' }).build());
  }
}

/** Rode esta função uma vez pelo editor para testar e autorizar o acesso à planilha. */
function testar() {
  const aba = abaDados_();
  const d = lerDados_(aba);
  Logger.log('Chaves guardadas: ' + Object.keys(d).join(', '));
  escreverCarteira_(d.carteira ? JSON.parse(d.carteira.v) : null);
}

if (typeof module !== 'undefined') module.exports = { juntar };
