const KEY='orcametal.v1';
const {UN,money,qfmt,calc,itTotal}=Core;
const ST={rascunho:'Rascunho',enviado:'Enviado',aprovado:'Aprovado',recusado:'Recusado'};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=n=>String(n==null?'':n).replace('.',',');
function pn(v){v=String(v==null?'':v).trim();if(!v)return 0;if(v.indexOf(',')>=0)v=v.replace(/\./g,'').replace(',','.');const x=parseFloat(v);return isFinite(x)?x:0}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const dbr=iso=>iso?iso.split('-').reverse().join('/'):'';

let storageOK=true;
function defSettings(){return{empresa:'Minha Serralheria',doc:'',fone:'',email:'',endereco:'',logo:null,servicos:['Galpão','Portão','Grade','Escada','Corrimão e guarda-corpo','Cobertura e telhado','Estrutura metálica','Mezanino','Tanque e reservatório','Tubulação','Caldeiraria sob medida','Manutenção e reparo','Outro'],margem:30,impostos:6,validade:10,pagamento:'50% na aprovação e 50% na entrega'}}
function seed(){
  const mats=[
    {id:'m1',nome:'Chapa de aço 1020',un:'kg',preco:9.5},
    {id:'m2',nome:'Tubo metalon 30x30',un:'m',preco:28},
    {id:'m3',nome:'Cantoneira 1"',un:'m',preco:14},
    {id:'m4',nome:'Barra chata 1"x1/8"',un:'m',preco:12},
    {id:'m5',nome:'Mão de obra: solda e montagem',un:'h',preco:65},
    {id:'m6',nome:'Mão de obra: corte e dobra',un:'h',preco:60},
    {id:'m7',nome:'Pintura esmalte sintético',un:'m2',preco:45},
    {id:'m8',nome:'Instalação no local',un:'h',preco:55}
  ];
  const ex={id:uid(),num:'ORC-001',cliente:'Cliente de exemplo',fone:'',tipo:'Portão',obra:'Basculante 3,00 x 2,20 m (exemplo)',data:today(),status:'rascunho',
    itens:[
      {id:uid(),mat:'m2',desc:'Tubo metalon 30x30',un:'m',qtd:28,perda:8,preco:28},
      {id:uid(),mat:'m1',desc:'Chapa de aço 1020',un:'kg',qtd:42,perda:5,preco:9.5},
      {id:uid(),mat:'m5',desc:'Mão de obra: solda e montagem',un:'h',qtd:14,perda:0,preco:65},
      {id:uid(),mat:'m7',desc:'Pintura esmalte sintético',un:'m2',qtd:6.6,perda:0,preco:45},
      {id:uid(),mat:'m8',desc:'Instalação no local',un:'h',qtd:4,perda:0,preco:55}
    ],margem:30,impostos:6,desconto:0,validade:10,pagamento:'50% na aprovação e 50% na entrega',obs:''};
  return{seq:1,settings:defSettings(),materials:mats,budgets:[ex]};
}
function load(){
  try{const t='__t';localStorage.setItem(t,'1');localStorage.removeItem(t)}catch(e){storageOK=false}
  try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&Array.isArray(d.budgets)&&Array.isArray(d.materials)&&d.settings){d.settings=Object.assign(defSettings(),d.settings);return d}}}catch(e){}
  return seed();
}
let db=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){storageOK=false}}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
save();

let view='list',curId=null,editIdx=-1,editMat=null,confirmT=null;
const cur=()=>db.budgets.find(b=>b.id===curId);

/* ---------- views ---------- */
function vList(){
  const bs=db.budgets.slice().reverse();
  let aberto=0,aprov=0;
  db.budgets.forEach(b=>{const t=calc(b).total;if(b.status==='enviado')aberto+=t;if(b.status==='aprovado')aprov+=t});
  return `<div><h1>Orçamentos</h1><p class="sub">${esc(db.settings.empresa)}</p></div>
  <div class="stats"><div class="stat"><span>Enviados</span><b>${money(aberto)}</b></div><div class="stat"><span>Aprovados</span><b>${money(aprov)}</b></div></div>
  <div class="list">${bs.length?bs.map(b=>`<button class="bud" data-act="open" data-id="${b.id}">
    <span class="who">${esc(b.cliente||'Sem cliente')}</span><span class="val">${money(calc(b).total)}</span>
    <span class="what">${esc(b.num)} · ${dbr(b.data)}${[b.tipo,b.obra].filter(Boolean).map(x=>' · '+esc(x)).join('')}</span><span class="pill ${b.status}">${ST[b.status]}</span></button>`).join(''):
    '<div class="empty">Nenhum orçamento ainda. Toque em Novo para criar o primeiro.</div>'}</div>
  <button class="fab" data-act="new">+ Novo</button>`;
}
function itemsHTML(b){
  if(!b.itens.length)return '<div class="empty">Nenhum item. Toque em + Item para adicionar material ou mão de obra.</div>';
  return '<div class="list">'+b.itens.map((i,k)=>`<button class="item" data-act="item" data-i="${k}"><span class="d">${esc(i.desc||'Item sem nome')}</span>
    <span class="m">${qfmt(i.qtd)} ${UN[i.un].s} × ${money(i.preco)}${i.perda?' (+'+qfmt(i.perda)+'% perda)':''}</span><span class="t">${money(itTotal(i))}</span></button>`).join('')+'</div>';
}
function tipoOpts(b){
  const l=(db.settings.servicos||[]).slice();if(b.tipo&&l.indexOf(b.tipo)<0)l.push(b.tipo);
  return '<option value="">Selecione o tipo</option>'+l.map(x=>`<option value="${esc(x)}"${b.tipo===x?' selected':''}>${esc(x)}</option>`).join('');
}
function vEdit(){
  const b=cur();if(!b){view='list';return vList()}
  return `<div class="top"><button class="ghost" data-act="back">‹ Orçamentos</button><span class="num">${esc(b.num)}</span></div>
  <h1>Orçamento</h1>
  <div class="card form">
    <label>Cliente<input id="f-cliente" data-b="cliente" value="${esc(b.cliente)}" autocomplete="off"></label>
    <label>Telefone<input id="f-fone" data-b="fone" inputmode="tel" value="${esc(b.fone)}"></label>
    <label>Tipo de serviço<select id="f-tipo" data-b="tipo">${tipoOpts(b)}</select></label>
    <label>Descrição da obra<input id="f-obra" data-b="obra" value="${esc(b.obra)}" autocomplete="off"></label>
    <div class="row2"><label>Data<input id="f-data" type="date" data-b="data" value="${esc(b.data)}"></label>
    <label>Situação<select id="f-status" data-b="status">${Object.keys(ST).map(k=>`<option value="${k}"${b.status===k?' selected':''}>${ST[k]}</option>`).join('')}</select></label></div>
  </div>
  <div class="sec"><h2>Itens</h2><button class="btn sm" data-act="additem">+ Item</button></div>
  <div id="items">${itemsHTML(b)}</div>
  <h2>Preço final</h2>
  <div class="card form">
    <div class="row3">
      <label>Margem %<input id="f-margem" data-b="margem" data-n inputmode="decimal" value="${fin(b.margem)}"></label>
      <label>Impostos %<input id="f-impostos" data-b="impostos" data-n inputmode="decimal" value="${fin(b.impostos)}"></label>
      <label>Desconto R$<input id="f-desconto" data-b="desconto" data-n inputmode="decimal" value="${fin(b.desconto)}"></label>
    </div>
    <div id="tot" class="tot"></div>
  </div>
  <h2>Condições</h2>
  <div class="card form">
    <label>Validade da proposta (dias)<input id="f-validade" data-b="validade" data-n inputmode="numeric" value="${fin(b.validade)}"></label>
    <label>Forma de pagamento<textarea id="f-pagamento" data-b="pagamento">${esc(b.pagamento)}</textarea></label>
    <label>Observações<textarea id="f-obs" data-b="obs">${esc(b.obs)}</textarea></label>
  </div>
  <div class="actions">
    <button class="btn wide" data-act="pdf">Gerar PDF do orçamento</button>
    <button class="btn alt wide" data-act="text">Copiar texto para WhatsApp</button>
    <button class="btn alt" data-act="dup">Duplicar</button>
    <button class="btn bad" data-act="del">Excluir</button>
  </div>
  <p class="note">O PDF e o texto para o cliente incluem margem e impostos nos valores de cada item, sem mostrar seus custos.</p>`;
}
function vMat(){
  return `<div><h1>Materiais e serviços</h1><p class="sub">Tabela de preços usada para preencher os itens. Os valores abaixo são exemplos, ajuste aos seus.</p></div>
  <div class="list">${db.materials.length?db.materials.map(m=>`<button class="item" data-act="mat" data-id="${m.id}"><span class="d">${esc(m.nome)}</span><span class="m">por ${UN[m.un].s}</span><span class="t">${money(m.preco)}</span></button>`).join(''):'<div class="empty">Nenhum material cadastrado.</div>'}</div>
  <button class="fab" data-act="addmat">+ Novo</button>`;
}
function vCfg(){
  const s=db.settings;
  const lg=s.logo&&s.logo.d;
  return `<div><h1>Ajustes</h1><p class="sub">Dados da empresa e valores padrão para novos orçamentos.</p></div>
  ${storageOK?'':'<div class="warn">Este navegador não permite guardar dados. O que você digitar some ao fechar o app.</div>'}
  <h2>Empresa no PDF</h2>
  <div class="card form">
    <div class="logo">${lg?`<img src="${s.logo.d}" alt="Logo da empresa">`:'<span class="note">Nenhum logo enviado</span>'}</div>
    <label>Logo da empresa<input id="s-logo" type="file" accept="image/*"></label>
    ${lg?'<button class="btn alt" data-act="logoclear">Remover logo</button>':''}
    <label>Nome da empresa<input id="s-empresa" data-s="empresa" value="${esc(s.empresa)}"></label>
    <label>CNPJ ou CPF<input id="s-doc" data-s="doc" value="${esc(s.doc)}"></label>
    <div class="row2">
      <label>Telefone<input id="s-fone" data-s="fone" inputmode="tel" value="${esc(s.fone)}"></label>
      <label>E-mail<input id="s-email" data-s="email" inputmode="email" value="${esc(s.email)}"></label>
    </div>
    <label>Endereço<textarea id="s-endereco" data-s="endereco">${esc(s.endereco)}</textarea></label>
  </div>
  <h2>Tipos de serviço</h2>
  <div class="card form">
    <label>Um tipo por linha<textarea id="s-servicos" data-s="servicos" data-lines style="min-height:150px">${esc((s.servicos||[]).join('\n'))}</textarea></label>
    <p class="note">Esses tipos aparecem na lista Tipo de serviço de cada orçamento.</p>
  </div>
  <h2>Valores padrão</h2>
  <div class="card form">
    <div class="row3">
      <label>Margem %<input id="s-margem" data-s="margem" data-n inputmode="decimal" value="${fin(s.margem)}"></label>
      <label>Impostos %<input id="s-impostos" data-s="impostos" data-n inputmode="decimal" value="${fin(s.impostos)}"></label>
      <label>Validade (dias)<input id="s-validade" data-s="validade" data-n inputmode="numeric" value="${fin(s.validade)}"></label>
    </div>
    <label>Pagamento padrão<textarea id="s-pagamento" data-s="pagamento">${esc(s.pagamento)}</textarea></label>
  </div>
  <h2>Instalar no celular</h2>
  <div class="card form">
    ${isStandalone()?'<p class="note">O app já está instalado neste aparelho.</p>':(deferredPrompt?'<button class="btn" data-act="install">Instalar o app</button>':'')}
    <p class="note">Android: menu do navegador, depois Instalar app ou Adicionar à tela inicial. iPhone: botão Compartilhar do Safari, depois Adicionar à Tela de Início.</p>
  </div>
  <h2>Cópia de segurança</h2>
  <div class="card form">
    <p class="note">Os dados ficam só neste aparelho. Copie o backup de vez em quando e guarde numa conversa sua ou num bloco de notas.</p>
    <button class="btn" data-act="backup">Ver e copiar backup</button>
    <label>Restaurar de um backup<textarea id="s-restore" placeholder="Cole aqui o texto do backup"></textarea></label>
    <button class="btn alt" data-act="restore">Restaurar (substitui os dados atuais)</button>
  </div>`;
}
const ICON={
  list:'<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>',
  mat:'<svg viewBox="0 0 24 24"><path d="M3 8l9-4 9 4-9 4zM3 12l9 4 9-4M3 16l9 4 9-4"/></svg>',
  cfg:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
};
function render(){
  const v=view==='edit'?vEdit():view==='mat'?vMat():view==='cfg'?vCfg():vList();
  const tab=(view==='edit'||view==='list')?'list':view;
  const nav=[['list','Orçamentos'],['mat','Materiais'],['cfg','Ajustes']].map(a=>`<button data-act="tab" data-v="${a[0]}"${tab===a[0]?' aria-current="true"':''}>${ICON[a[0]]}${a[1]}</button>`).join('');
  $('#app').innerHTML=v+`<nav class="nav"><div>${nav}</div></nav>`;
  if(view==='edit')updateTotals();
}
function updateTotals(){
  const b=cur();if(!b||!$('#tot'))return;const c=calc(b);
  $('#tot').innerHTML=`<div><span>Custo dos itens</span><span>${money(c.sub)}</span></div>
  <div class="dim"><span>Margem (${qfmt(b.margem)}%)</span><span>${money(c.mg)}</span></div>
  <div class="dim"><span>Impostos (${qfmt(b.impostos)}%)</span><span>${money(c.imp)}</span></div>
  ${b.desconto?`<div class="dim"><span>Desconto</span><span>− ${money(b.desconto)}</span></div>`:''}
  <div class="big"><span>Total</span><span>${money(c.total)}</span></div>`;
}

/* ---------- sheets ---------- */
function sheet(html){
  closeSheet();const d=document.createElement('div');d.className='ov';d.id='ov';
  d.innerHTML='<div class="sh" role="dialog" aria-modal="true">'+html+'</div>';
  d.addEventListener('click',e=>{if(e.target===d)closeSheet()});document.body.appendChild(d);return d;
}
function closeSheet(){const o=$('#ov');if(o)o.remove()}
function toast(t){const o=document.createElement('div');o.className='toast';o.textContent=t;document.body.appendChild(o);setTimeout(()=>o.remove(),2200)}
function unitOpts(sel){return Object.keys(UN).map(k=>`<option value="${k}"${sel===k?' selected':''}>${UN[k].l}</option>`).join('')}

function itemSheet(i){
  const b=cur();const it=i>=0?b.itens[i]:{mat:'',desc:'',un:'kg',qtd:1,perda:0,preco:0};editIdx=i;
  const o=sheet(`<h3>${i>=0?'Editar item':'Novo item'}</h3>
  <label>Material ou serviço cadastrado<select id="it-mat"><option value="">Avulso (digitar abaixo)</option>${db.materials.map(m=>`<option value="${m.id}"${it.mat===m.id?' selected':''}>${esc(m.nome)}</option>`).join('')}</select></label>
  <label>Descrição<input id="it-desc" value="${esc(it.desc)}" autocomplete="off"></label>
  <label>Calcular por<select id="it-un">${unitOpts(it.un)}</select></label>
  <div class="row3">
    <label>Quantidade<input id="it-qtd" inputmode="decimal" value="${fin(it.qtd)}"></label>
    <label>Perda %<input id="it-perda" inputmode="decimal" value="${fin(it.perda)}"></label>
    <label>Preço unit.<input id="it-preco" inputmode="decimal" value="${fin(it.preco)}"></label>
  </div>
  <div class="tot"><div class="big"><span>Item</span><span id="it-tot"></span></div></div>
  <details><summary>Calcular peso do aço</summary>
    <div class="form">
      <label>Peça<select id="pw-t"><option value="chapa">Chapa</option><option value="tubo">Tubo quadrado ou retangular</option></select></label>
      <div id="pw-chapa" class="row3">
        <label>Comprimento (m)<input id="pw-c" inputmode="decimal"></label>
        <label>Largura (m)<input id="pw-l" inputmode="decimal"></label>
        <label>Espessura (mm)<input id="pw-e" inputmode="decimal"></label>
      </div>
      <div id="pw-tubo" class="row3" hidden>
        <label>Lado A (mm)<input id="pw-a" inputmode="decimal"></label>
        <label>Lado B (mm)<input id="pw-b" inputmode="decimal"></label>
        <label>Parede (mm)<input id="pw-te" inputmode="decimal"></label>
        <label>Comprimento (m)<input id="pw-tc" inputmode="decimal"></label>
      </div>
      <label>Quantidade de peças<input id="pw-n" inputmode="numeric" value="1"></label>
      <div>Peso total: <span class="res" id="pw-r">0 kg</span></div>
      <button class="btn alt" data-act="usepeso" type="button">Usar como quantidade em kg</button>
      <p class="note">Aço carbono com 7,85 kg por dm³. Chapa de 1 m² com 1 mm pesa 7,85 kg.</p>
    </div>
  </details>
  <div class="actions"><button class="btn" data-act="saveitem">Salvar</button><button class="btn alt" data-act="close">Cancelar</button>
  ${i>=0?'<button class="btn bad wide" data-act="delitem">Excluir item</button>':''}</div>`);
  const upd=()=>{const t=pn($('#it-qtd').value)*(1+pn($('#it-perda').value)/100)*pn($('#it-preco').value);$('#it-tot').textContent=money(t)};
  o.addEventListener('input',e=>{if(e.target.id&&e.target.id.indexOf('pw-')===0)pesoUpd();else upd()});
  $('#it-mat').addEventListener('change',()=>{const m=db.materials.find(x=>x.id===$('#it-mat').value);if(m){$('#it-desc').value=m.nome;$('#it-un').value=m.un;$('#it-preco').value=fin(m.preco)}upd()});
  $('#pw-t').addEventListener('change',()=>{const t=$('#pw-t').value;$('#pw-chapa').hidden=t!=='chapa';$('#pw-tubo').hidden=t!=='tubo';pesoUpd()});
  upd();
}
function peso(){
  const t=$('#pw-t').value,n=pn($('#pw-n').value)||1;let kg=0;
  if(t==='chapa')kg=pn($('#pw-c').value)*pn($('#pw-l').value)*pn($('#pw-e').value)*7.85;
  else{const a=pn($('#pw-a').value),bb=pn($('#pw-b').value),e=pn($('#pw-te').value),c=pn($('#pw-tc').value);kg=2*e*(a+bb-2*e)*7.85/1000*c}
  return Math.max(0,kg*n);
}
function pesoUpd(){$('#pw-r').textContent=qfmt(Math.round(peso()*100)/100)+' kg'}

function matSheet(id){
  const m=id?db.materials.find(x=>x.id===id):{nome:'',un:'kg',preco:0};editMat=id||null;
  sheet(`<h3>${id?'Editar material':'Novo material ou serviço'}</h3>
  <label>Nome<input id="mt-nome" value="${esc(m.nome)}" autocomplete="off"></label>
  <label>Cobrado por<select id="mt-un">${unitOpts(m.un)}</select></label>
  <label>Preço por unidade (R$)<input id="mt-preco" inputmode="decimal" value="${fin(m.preco)}"></label>
  <div class="actions"><button class="btn" data-act="savemat">Salvar</button><button class="btn alt" data-act="close">Cancelar</button>
  ${id?'<button class="btn bad wide" data-act="delmat">Excluir</button>':''}</div>`);
}

function clientText(b){
  const c=calc(b),s=db.settings;const L=[];
  L.push('*ORÇAMENTO '+b.num+'*');
  L.push(s.empresa+(s.fone?' · '+s.fone:''));L.push('');
  if(b.cliente)L.push('Cliente: '+b.cliente);
  if(b.tipo||b.obra)L.push('Serviço: '+[b.tipo,b.obra].filter(Boolean).join(' - '));
  L.push('Data: '+dbr(b.data));L.push('');
  b.itens.forEach((i,k)=>{L.push((k+1)+') '+i.desc+' ('+qfmt(i.qtd)+' '+UN[i.un].s+'): '+money(itTotal(i)*c.fator))});
  if(b.desconto){L.push('');L.push('Desconto: − '+money(b.desconto))}
  L.push('');L.push('*TOTAL: '+money(c.total)+'*');L.push('');
  if(b.pagamento)L.push('Pagamento: '+b.pagamento);
  if(b.validade)L.push('Validade da proposta: '+qfmt(b.validade)+' dias');
  if(b.obs)L.push('Obs.: '+b.obs);
  return L.join('\n');
}
function textSheet(title,text,hint){
  sheet(`<h3>${title}</h3><textarea id="tx" readonly style="min-height:220px;font-family:var(--f-mono);font-size:14px">${esc(text)}</textarea>
  ${hint?`<p class="note">${hint}</p>`:''}
  <div class="actions"><button class="btn" data-act="copytx">Copiar</button><button class="btn alt" data-act="close">Fechar</button></div>`);
}

/* ---------- actions ---------- */
const acts={
  tab(t){view=t.dataset.v;render();scrollTo(0,0)},
  new(){
    const s=db.settings;db.seq=(db.seq||0)+1;
    const b={id:uid(),num:'ORC-'+String(db.seq).padStart(3,'0'),cliente:'',fone:'',tipo:'',obra:'',data:today(),status:'rascunho',itens:[],margem:s.margem,impostos:s.impostos,desconto:0,validade:s.validade,pagamento:s.pagamento,obs:''};
    db.budgets.push(b);save();curId=b.id;view='edit';render();scrollTo(0,0);
  },
  open(t){curId=t.dataset.id;view='edit';render();scrollTo(0,0)},
  back(){view='list';render();scrollTo(0,0)},
  additem(){itemSheet(-1)},
  item(t){itemSheet(+t.dataset.i)},
  saveitem(){
    const b=cur();const it={mat:$('#it-mat').value,desc:$('#it-desc').value.trim(),un:$('#it-un').value,qtd:pn($('#it-qtd').value),perda:pn($('#it-perda').value),preco:pn($('#it-preco').value)};
    if(!it.desc){toast('Digite a descrição do item');return}
    if(editIdx>=0){it.id=b.itens[editIdx].id;b.itens[editIdx]=it}else{it.id=uid();b.itens.push(it)}
    save();closeSheet();$('#items').innerHTML=itemsHTML(b);updateTotals();
  },
  delitem(t){
    if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Toque de novo para excluir';return}
    const b=cur();b.itens.splice(editIdx,1);save();closeSheet();$('#items').innerHTML=itemsHTML(b);updateTotals();
  },
  usepeso(){const p=Math.round(peso()*100)/100;if(!p){toast('Preencha as medidas da peça');return}$('#it-un').value='kg';$('#it-qtd').value=fin(p);$('#it-qtd').dispatchEvent(new Event('input',{bubbles:true}));toast('Quantidade atualizada: '+qfmt(p)+' kg')},
  close(){closeSheet()},
  text(){textSheet('Texto do orçamento',clientText(cur()),'Toque em Copiar e cole na conversa do WhatsApp ou em um e-mail.')},
  copytx(){
    const ta=$('#tx');ta.select();
    const ok=()=>toast('Texto copiado');const no=()=>{ta.focus();ta.select();toast('Selecione o texto e copie manualmente')};
    try{navigator.clipboard.writeText(ta.value).then(ok,no)}catch(e){no()}
  },
  dup(){
    const b=cur();db.seq++;const n=JSON.parse(JSON.stringify(b));n.id=uid();n.num='ORC-'+String(db.seq).padStart(3,'0');n.status='rascunho';n.data=today();
    n.itens.forEach(i=>i.id=uid());db.budgets.push(n);save();curId=n.id;render();scrollTo(0,0);toast('Orçamento duplicado');
  },
  del(t){
    t.textContent='Toque de novo para excluir';t.dataset.act='delok';clearTimeout(confirmT);
    confirmT=setTimeout(()=>{if(t.isConnected){t.textContent='Excluir';t.dataset.act='del'}},4000);
  },
  delok(){db.budgets=db.budgets.filter(b=>b.id!==curId);save();view='list';render();scrollTo(0,0);toast('Orçamento excluído')},
  mat(t){matSheet(t.dataset.id)},
  addmat(){matSheet(null)},
  savemat(){
    const nome=$('#mt-nome').value.trim();if(!nome){toast('Digite o nome');return}
    const d={nome:nome,un:$('#mt-un').value,preco:pn($('#mt-preco').value)};
    if(editMat){Object.assign(db.materials.find(x=>x.id===editMat),d)}else db.materials.push(Object.assign({id:uid()},d));
    save();closeSheet();render();
  },
  delmat(t){
    if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Toque de novo para excluir';return}
    db.materials=db.materials.filter(x=>x.id!==editMat);save();closeSheet();render();
  },
  pdf(){
    const b=cur();let bytes;
    try{bytes=OrcaPDF.build(b,db.settings,Core)}catch(e){toast('Não foi possível gerar o PDF');return}
    const name=(b.num+' '+(b.cliente||'cliente')).replace(/[^\w -]+/g,'').trim().replace(/\s+/g,'-')+'.pdf';
    if(isNative()){nativePdf(bytes,name,b.num).catch(()=>toast('Não foi possível compartilhar o PDF'));return}
    const blob=new Blob([bytes],{type:'application/pdf'});
    try{
      const file=new File([blob],name,{type:'application/pdf'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:b.num}).catch(()=>{});return}
    }catch(e){}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),10000);toast('PDF baixado');
  },
  logoclear(){db.settings.logo=null;save();render()},
  install(){if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt.userChoice.finally(()=>{deferredPrompt=null;if(view==='cfg')render()})},
  backup(){textSheet('Backup dos dados',JSON.stringify(db),'Guarde este texto em lugar seguro. Para restaurar, cole em Ajustes.')},
  restore(){
    const v=$('#s-restore').value.trim();if(!v){toast('Cole o texto do backup primeiro');return}
    try{const d=JSON.parse(v);if(!d||!Array.isArray(d.budgets)||!Array.isArray(d.materials)||!d.settings)throw 0;d.settings=Object.assign(defSettings(),d.settings);db=d;save();render();toast('Dados restaurados')}
    catch(e){toast('Backup inválido')}
  }
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t&&acts[t.dataset.act])acts[t.dataset.act](t)});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.b){const b=cur();if(!b)return;b[t.dataset.b]=t.hasAttribute('data-n')?pn(t.value):t.value;save();if(t.hasAttribute('data-n'))updateTotals()}
  else if(t.dataset.s){db.settings[t.dataset.s]=t.hasAttribute('data-lines')?t.value.split('\n').map(x=>x.trim()).filter(Boolean):t.hasAttribute('data-n')?pn(t.value):t.value;save()}
});
document.addEventListener('change',e=>{
  if(e.target.id!=='s-logo'||!e.target.files||!e.target.files[0])return;
  const f=e.target.files[0],fr=new FileReader();
  fr.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const sc=Math.min(1,480/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc));
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
      x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
      db.settings.logo={d:c.toDataURL('image/jpeg',0.88),w:w,h:h};save();render();toast('Logo salvo');
    };
    img.onerror=()=>toast('Não foi possível ler essa imagem');
    img.src=fr.result;
  };
  fr.readAsDataURL(f);
});
let deferredPrompt=null;
function isNative(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
const isStandalone=()=>{try{return isNative()||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
async function nativePdf(bytes,name,title){
  const P=window.Capacitor&&Capacitor.Plugins;
  if(!P||!P.Filesystem||!P.Share)throw new Error('plugin');
  let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
  const r=await P.Filesystem.writeFile({path:name,data:btoa(bin),directory:'CACHE'});
  await P.Share.share({title:title,url:r.uri,dialogTitle:'Enviar orçamento'});
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(view==='cfg')render()});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;if(view==='cfg')render()});
if('serviceWorker' in navigator&&!isNative()){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}
render();
