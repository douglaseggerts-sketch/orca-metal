const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, net, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const motor = require('./motor');

const INTERVALO_MIN = 5;
const oculto = process.argv.includes('--oculto');
let janela = null, bandeja = null, saindo = false;

app.setAppUserModelId('br.com.monitoracoes');
if (!app.requestSingleInstanceLock()) { app.quit(); }

/* ---------- dados no PC (arquivo JSON na pasta do usuário) ---------- */
const ARQ = () => path.join(app.getPath('userData'), 'dados.json');
let dados = null;
function carregar() {
  if (dados) return dados;
  try { dados = JSON.parse(fs.readFileSync(ARQ(), 'utf8')); } catch (e) { dados = {}; }
  return dados;
}
function gravarArquivo() {
  try {
    fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
    fs.writeFileSync(ARQ() + '.tmp', JSON.stringify(dados));
    fs.renameSync(ARQ() + '.tmp', ARQ());
  } catch (e) { console.error(e); }
}
// chaves que vão para a planilha; cada uma guarda a hora da última alteração em _t
const SINCRONIZADAS = ['lista', 'medias', 'ifr', 'carteira', 'alertas', 'alertasExcluidos'];
const store = {
  get: (k) => (carregar()[k] != null ? String(carregar()[k]) : ''),
  tem: (k) => carregar()[k] != null,
  tempo: (k) => ((carregar()._t || {})[k] || 0),
  put: (k, v, t) => {
    const d = carregar(), mudou = d[k] !== v;
    d[k] = v;
    if (SINCRONIZADAS.includes(k) && (t != null || mudou)) { d._t = d._t || {}; d._t[k] = t != null ? t : Date.now(); }
    gravarArquivo();
  },
  alertas: () => { try { return JSON.parse(store.get('alertas') || '[]'); } catch (e) { return []; } },
  salvarAlertas: (a, alterou = true) => {
    const d = carregar(); d.alertas = JSON.stringify(a);
    if (alterou) { d._t = d._t || {}; d._t.alertas = Date.now(); }
    gravarArquivo();
  }
};

/* ---------- sincronização com a Planilha Google ---------- */
let sincronizando = null;
function syncConfigurado() { return !!(store.get('syncUrl') && store.get('syncChave')); }
async function sincronizar() {
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    const url = store.get('syncUrl').trim(), chave = store.get('syncChave').trim();
    if (!url || !chave) return 'Sincronização não configurada.';
    if (!url.startsWith('https://script.google.com/')) throw new Error('O endereço deve começar com https://script.google.com/');
    const dados = {};
    SINCRONIZADAS.forEach(k => { if (store.tem(k)) dados[k] = { v: store.get(k), t: store.tempo(k) }; });
    const r = await net.fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ chave, dados, aparelho: 'pc' }) });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('a planilha não respondeu (confira o endereço e se o script foi publicado para “Qualquer pessoa”)'); }
    if (!j.ok) throw new Error(j.erro || 'a planilha recusou a sincronização');
    let recebidos = 0;
    for (const [k, o] of Object.entries(j.dados || {})) {
      if (!SINCRONIZADAS.includes(k) || o == null || o.v == null) continue;
      if (o.v !== (store.tem(k) ? store.get(k) : null) && (o.t || 0) >= store.tempo(k)) { store.put(k, o.v, o.t || 0); recebidos++; }
    }
    store.put('ultimaSync', String(Date.now()));
    return recebidos ? `Sincronizado (${recebidos} item(ns) recebido(s)).` : 'Sincronizado.';
  })();
  try { return await sincronizando; } finally { sincronizando = null; }
}
async function tentarSync() { if (syncConfigurado()) { try { await sincronizar(); } catch (e) { } } }

/* ---------- internet (só Yahoo Finance) ---------- */
async function baixarTexto(url) {
  if (!/^https:\/\/query[12]\.finance\.yahoo\.com\//.test(url)) throw new Error('endereço não permitido');
  const r = await net.fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
  });
  const t = await r.text();
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return t;
}

/* ---------- alertas ---------- */
function notificar(titulo, texto) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: titulo, body: texto, icon: path.join(__dirname, 'icone.png') });
  n.on('click', mostrar);
  n.show();
}
let verificando = false;
async function verificar() {
  if (verificando) return 'Verificação já em andamento.';
  verificando = true;
  try {
    await tentarSync();
    const r = await motor.verificar(store, baixarTexto, notificar);
    await tentarSync();
    janela && janela.webContents.executeJavaScript('window.aoSincronizar && window.aoSincronizar()').catch(() => { });
    return r;
  }
  finally { verificando = false; }
}

/* ---------- ponte com a tela ---------- */
ipcMain.handle('fetch', (e, url) => baixarTexto(url));
ipcMain.handle('verificarAgora', () => verificar());
ipcMain.handle('sincronizar', () => sincronizar());
ipcMain.on('load', (e, k) => { e.returnValue = store.get(k); });
ipcMain.on('save', (e, k, v) => { store.put(k, v); e.returnValue = true; });
ipcMain.on('alertas', (e) => { e.returnValue = JSON.stringify(store.alertas()); });
ipcMain.on('addAlerta', (e, j) => {
  const a = store.alertas();
  try {
    const o = JSON.parse(j);
    if (!o.id) o.id = Date.now() + '-' + Math.random().toString(16).slice(2, 6);
    o.ativo = true; o.criadoEm = Date.now(); o.mod = Date.now();
    a.push(o); store.salvarAlertas(a);
  } catch (err) { }
  e.returnValue = JSON.stringify(a);
});
ipcMain.on('removerAlerta', (e, id) => {
  const a = store.alertas().filter(x => x.id !== id);
  let exc = {}; try { exc = JSON.parse(store.get('alertasExcluidos') || '{}'); } catch (err) { }
  exc[id] = Date.now(); store.put('alertasExcluidos', JSON.stringify(exc));
  store.salvarAlertas(a); e.returnValue = JSON.stringify(a);
});
ipcMain.on('ativarAlerta', (e, id, on) => {
  const a = store.alertas();
  a.forEach(x => {
    if (x.id === id) { x.ativo = !!on; x.mod = Date.now(); if (on) { delete x.disparadoEm; delete x.precoDisparo; delete x.ultimoLado; delete x.ladoEm; } }
  });
  store.salvarAlertas(a); e.returnValue = JSON.stringify(a);
});
ipcMain.on('notificacoesLiberadas', (e) => { e.returnValue = Notification.isSupported(); });

/* ---------- janela e ícone perto do relógio ---------- */
function criarJanela() {
  janela = new BrowserWindow({
    width: 1100, height: 820, minWidth: 380, minHeight: 600,
    title: 'Monitor de Ações', backgroundColor: '#08090C', show: !oculto,
    icon: path.join(__dirname, 'icone.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  janela.loadFile(path.join(__dirname, 'ui', 'index.html'));
  janela.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  janela.on('close', (ev) => {
    if (!saindo) {
      ev.preventDefault();
      janela.hide();
      if (!store.get('avisouBandeja')) {
        store.put('avisouBandeja', '1');
        notificar('Monitor de Ações continua rodando', 'Os alertas seguem sendo conferidos. Para fechar de vez, clique com o botão direito no ícone perto do relógio › Sair.');
      }
    }
  });
  janela.on('show', () => janela.webContents.executeJavaScript('window.aoVoltarAoApp && window.aoVoltarAoApp()').catch(() => { }));
}
function mostrar() {
  if (!janela) criarJanela();
  janela.show(); janela.focus();
}
function criarBandeja() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'icone.png')).resize({ width: 16, height: 16 });
  bandeja = new Tray(img);
  bandeja.setToolTip('Monitor de Ações');
  const iniciaComWindows = () => app.getLoginItemSettings().openAtLogin;
  const montarMenu = () => bandeja.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: mostrar },
    { label: 'Verificar alertas agora', click: async () => notificar('Monitor de Ações', await verificar()) },
    { type: 'separator' },
    {
      label: 'Iniciar com o Windows', type: 'checkbox', checked: iniciaComWindows(),
      click: (it) => { app.setLoginItemSettings({ openAtLogin: it.checked, args: ['--oculto'] }); montarMenu(); }
    },
    { type: 'separator' },
    { label: 'Sair', click: () => { saindo = true; app.quit(); } }
  ]));
  montarMenu();
  bandeja.on('click', mostrar);
}

app.on('second-instance', mostrar);
app.on('before-quit', () => { saindo = true; });
app.on('window-all-closed', (e) => { /* continua na bandeja */ });

app.whenReady().then(() => {
  // na primeira vez, já deixa iniciando junto com o Windows (dá para desligar no menu do ícone)
  if (app.isPackaged && !store.get('configurouInicio')) {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--oculto'] });
    store.put('configurouInicio', '1');
  }
  criarJanela();
  criarBandeja();
  setTimeout(verificar, 20 * 1000);
  setInterval(verificar, INTERVALO_MIN * 60 * 1000);
});
