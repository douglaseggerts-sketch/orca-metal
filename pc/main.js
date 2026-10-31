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
const store = {
  get: (k) => (carregar()[k] != null ? String(carregar()[k]) : ''),
  put: (k, v) => { carregar()[k] = v; gravarArquivo(); },
  alertas: () => { try { return JSON.parse(store.get('alertas') || '[]'); } catch (e) { return []; } },
  salvarAlertas: (a) => store.put('alertas', JSON.stringify(a))
};

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
  try { return await motor.verificar(store, baixarTexto, notificar); }
  finally { verificando = false; }
}

/* ---------- ponte com a tela ---------- */
ipcMain.handle('fetch', (e, url) => baixarTexto(url));
ipcMain.handle('verificarAgora', () => verificar());
ipcMain.on('load', (e, k) => { e.returnValue = store.get(k); });
ipcMain.on('save', (e, k, v) => { store.put(k, v); e.returnValue = true; });
ipcMain.on('alertas', (e) => { e.returnValue = JSON.stringify(store.alertas()); });
ipcMain.on('addAlerta', (e, j) => {
  const a = store.alertas();
  try {
    const o = JSON.parse(j);
    if (!o.id) o.id = String(Date.now());
    o.ativo = true; o.criadoEm = Date.now();
    a.push(o); store.salvarAlertas(a);
  } catch (err) { }
  e.returnValue = JSON.stringify(a);
});
ipcMain.on('removerAlerta', (e, id) => {
  const a = store.alertas().filter(x => x.id !== id);
  store.salvarAlertas(a); e.returnValue = JSON.stringify(a);
});
ipcMain.on('ativarAlerta', (e, id, on) => {
  const a = store.alertas();
  a.forEach(x => {
    if (x.id === id) { x.ativo = !!on; if (on) { delete x.disparadoEm; delete x.precoDisparo; delete x.ultimoLado; } }
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
