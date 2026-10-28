const KEY='promech.v1';
const {UN,money,qfmt,calc,itTotal}=Core;
const PST={rascunho:'Rascunho',enviada:'Enviada',aprovada:'Aprovada',recusada:'Recusada'};
const RST={fazer:'A fazer',andamento:'Em andamento',emitido:'Emitido',pago:'Pago'};
const RTIPOS=['ART','Laudo','Inspeção','Projeto','Outro'];
const CATS=['ART','Laudos e inspeções','Projetos','Consultoria','Despesas','Outros'];
/* [id, categoria, nome, unidade, valor de exemplo em R$, detalhe para o cliente] */
const CATALOG=[
 ['a1','ART','ART de obra ou serviço','un',350,''],
 ['a2','ART','ART de cargo e função (responsabilidade técnica)','mês',450,''],
 ['a3','ART','ART de laudo técnico','un',300,''],
 ['l1','Laudos e inspeções','Laudo técnico de vistoria','visita',600,''],
 ['l2','Laudos e inspeções','Inspeção e laudo NR-13 (vaso de pressão)','un',900,'Inspeção de segurança conforme NR-13.'],
 ['l3','Laudos e inspeções','Inspeção e laudo NR-13 (caldeira)','un',1500,'Inspeção de segurança conforme NR-13.'],
 ['l4','Laudos e inspeções','Laudo de máquina e equipamento (NR-12)','un',800,'Apreciação de risco e adequação conforme NR-12.'],
 ['l5','Laudos e inspeções','Inspeção de ponte rolante, talha ou içamento','un',700,''],
 ['l6','Laudos e inspeções','Laudo de estrutura metálica','un',1200,''],
 ['l7','Laudos e inspeções','PMOC (climatização)','mês',400,'Plano de Manutenção, Operação e Controle.'],
 ['l8','Laudos e inspeções','Perícia ou parecer técnico','un',1800,''],
 ['p1','Projetos','Projeto mecânico','un',3500,''],
 ['p2','Projetos','Projeto de instalação de gás (GLP/GN)','un',2800,''],
 ['p3','Projetos','Projeto de tubulação industrial','un',4000,''],
 ['p4','Projetos','Projeto de ventilação e exaustão','un',3000,''],
 ['c1','Consultoria','Hora técnica de engenheiro','h',220,''],
 ['c2','Consultoria','Acompanhamento de obra ou serviço','visita',500,''],
 ['c3','Consultoria','Treinamento técnico','un',1500,''],
 ['d1','Despesas','Deslocamento (km rodado)','km',2.2,''],
 ['d2','Despesas','Diária de viagem','dia',350,''],
 ['d3','Despesas','Taxa de ART (CREA), repasse','un',0,'Preencha com o valor vigente da taxa.']
];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=n=>String(n==null?'':n).replace('.',',');
function pn(v){v=String(v==null?'':v).trim();if(!v)return 0;if(v.indexOf(',')>=0)v=v.replace(/\./g,'').replace(',','.');const x=parseFloat(v);return isFinite(x)?x:0}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function fmtDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const today=()=>fmtDate(new Date());
const dbr=iso=>iso?iso.split('-').reverse().join('/'):'';
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return fmtDate(d)}
function addMonths(iso,m){const d=new Date(iso+'T12:00:00');d.setMonth(d.getMonth()+m);return fmtDate(d)}
function daysTo(iso){return Math.round((new Date(iso+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000)}

let storageOK=true;
function defSettings(){return{empresa:'Promech Engenharia Mecânica',resp:'',crea:'',doc:'',fone:'',email:'',endereco:'Joinville - SC',logo:null,validade:15,pagamento:'50% na aprovação e 50% na entrega do documento',alerta:30}}
function seed(){
  const t=today();
  const catalog=CATALOG.map(r=>({id:r[0],cat:r[1],nome:r[2],un:r[3],preco:r[4],det:r[5]}));
  const ex={id:uid(),num:'PRO-001',cliente:'Indústria Exemplo Ltda',doc:'',fone:'',email:'',ref:'Laudo NR-13 e ART (exemplo)',data:t,status:'rascunho',
    itens:[
      {id:uid(),mat:'l2',desc:'Inspeção e laudo NR-13 (vaso de pressão)',det:'Inspeção de segurança conforme NR-13.',un:'un',qtd:2,preco:900},
      {id:uid(),mat:'a3',desc:'ART de laudo técnico',det:'',un:'un',qtd:2,preco:300},
      {id:uid(),mat:'d1',desc:'Deslocamento (km rodado)',det:'',un:'km',qtd:60,preco:2.2}
    ],desconto:0,validade:15,prazo:'5 dias úteis após a visita',pagamento:'50% na aprovação e 50% na entrega do documento',obs:''};
  const recs=[
    {id:uid(),propId:'',cliente:'Indústria Exemplo Ltda',tipo:'Inspeção',desc:'Vaso de pressão VP-01 (exemplo)',art:'',emissao:addDays(t,-340),vence:addDays(t,25),status:'emitido',valor:900,obs:''},
    {id:uid(),propId:'',cliente:'Metalúrgica Exemplo',tipo:'ART',desc:'Responsabilidade técnica mensal (exemplo)',art:'',emissao:'',vence:'',status:'andamento',valor:450,obs:''}
  ];
  return{v:1,seq:1,settings:defSettings(),catalog:catalog,proposals:[ex],records:recs,clients:[]};
}
function valid(d){return d&&Array.isArray(d.proposals)&&Array.isArray(d.records)&&Array.isArray(d.catalog)&&d.settings}
function fix(d){d.settings=Object.assign(defSettings(),d.settings);if(!Array.isArray(d.clients))d.clients=[];return d}
function load(){
  try{const t='__t';localStorage.setItem(t,'1');localStorage.removeItem(t)}catch(e){storageOK=false}
  try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(valid(d))return fix(d)}}catch(e){}
  return seed();
}
let db=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){storageOK=false}}
save();

let view='prop',curId=null,editIdx=-1,editRec=null,editCat=null,filter='todos',confirmT=null;
const cur=()=>db.proposals.find(p=>p.id===curId);

/* ---------- auxiliares ---------- */
function venc(r){
  if(!r.vence)return null;const n=daysTo(r.vence),a=db.settings.alerta||30;
  if(n<0)return{c:'venc',t:'Vencido há '+(-n)+(n===-1?' dia':' dias')};
  if(n===0)return{c:'venc',t:'Vence hoje'};
  if(n<=a)return{c:'soon',t:'Vence em '+n+(n===1?' dia':' dias')};
  return{c:'ok',t:'Vence '+dbr(r.vence)};
}
const atencao=v=>!!v&&v.c!=='ok';
function clientsList(){return '<datalist id="cl-list">'+db.clients.map(c=>`<option value="${esc(c.nome)}"></option>`).join('')+'</datalist>'}
function upsertClient(p){
  const n=(p.cliente||'').trim();if(!n)return;
  const c=db.clients.find(x=>x.nome.toLowerCase()===n.toLowerCase());
  if(c){c.doc=p.doc||c.doc;c.fone=p.fone||c.fone;c.email=p.email||c.email}
  else db.clients.push({nome:n,doc:p.doc||'',fone:p.fone||'',email:p.email||''});
}
function catOpts(sel){
  const g={};db.catalog.forEach(m=>{const c=m.cat||'Outros';(g[c]=g[c]||[]).push(m)});
  const order=CATS.concat(Object.keys(g).filter(c=>CATS.indexOf(c)<0));
  return '<option value="">Avulso (digitar abaixo)</option>'+order.filter(c=>g[c]).map(c=>`<optgroup label="${esc(c)}">`+g[c].map(m=>`<option value="${m.id}"${sel===m.id?' selected':''}>${esc(m.nome)}</option>`).join('')+'</optgroup>').join('');
}
const unitOpts=sel=>UN.map(u=>`<option value="${u}"${sel===u?' selected':''}>${u}</option>`).join('');

/* ---------- telas ---------- */
function vProp(){
  const bs=db.proposals.slice().reverse();
  let env=0,apr=0;db.proposals.forEach(p=>{const t=calc(p).total;if(p.status==='enviada')env+=t;if(p.status==='aprovada')apr+=t});
  return `<div><h1>Propostas</h1><p class="sub">${esc(db.settings.empresa)}</p></div>
  <div class="stats"><div class="stat"><span>Enviadas</span><b>${money(env)}</b></div><div class="stat"><span>Aprovadas</span><b>${money(apr)}</b></div></div>
  <div class="list">${bs.length?bs.map(p=>`<button class="bud" data-act="openp" data-id="${p.id}">
    <span class="who">${esc(p.cliente||'Sem cliente')}</span><span class="val">${money(calc(p).total)}</span>
    <span class="what">${esc(p.num)} · ${dbr(p.data)}${p.ref?' · '+esc(p.ref):''}</span><span class="pill ${p.status}">${PST[p.status]}</span></button>`).join(''):
    '<div class="empty">Nenhuma proposta ainda. Toque em Nova para criar a primeira.</div>'}</div>
  <button class="fab" data-act="newp">+ Nova</button>`;
}
function itemsHTML(p){
  if(!p.itens.length)return '<div class="empty">Nenhum serviço. Toque em + Serviço para adicionar.</div>';
  return '<div class="list">'+p.itens.map((i,k)=>`<button class="item" data-act="item" data-i="${k}"><div class="dc"><span class="d">${esc(i.desc||'Serviço sem nome')}</span>
    <span class="m">${qfmt(i.qtd)} ${esc(i.un)} × ${money(i.preco)}</span>${i.det?`<span class="m x">${esc(i.det)}</span>`:''}</div><span class="t">${money(itTotal(i))}</span></button>`).join('')+'</div>';
}
function vPedit(){
  const p=cur();if(!p){view='prop';return vProp()}
  return `<div class="top"><button class="ghost" data-act="back">‹ Propostas</button><span class="num">${esc(p.num)}</span></div>
  <h1>Proposta</h1>
  <div class="card form">
    <label>Cliente<input id="f-cliente" data-b="cliente" list="cl-list" value="${esc(p.cliente)}" autocomplete="off"></label>${clientsList()}
    <div class="row2">
      <label>CNPJ ou CPF<input id="f-doc" data-b="doc" inputmode="numeric" value="${esc(p.doc)}"></label>
      <label>Telefone<input id="f-fone" data-b="fone" inputmode="tel" value="${esc(p.fone)}"></label>
    </div>
    <label>E-mail<input id="f-email" data-b="email" inputmode="email" value="${esc(p.email)}"></label>
    <label>Assunto<input id="f-ref" data-b="ref" value="${esc(p.ref)}" autocomplete="off" placeholder="Ex.: Laudo NR-13 da caldeira"></label>
    <div class="row2"><label>Data<input id="f-data" type="date" data-b="data" value="${esc(p.data)}"></label>
    <label>Situação<select id="f-status" data-b="status">${Object.keys(PST).map(k=>`<option value="${k}"${p.status===k?' selected':''}>${PST[k]}</option>`).join('')}</select></label></div>
  </div>
  <div class="sec"><h2>Serviços</h2><button class="btn sm" data-act="additem">+ Serviço</button></div>
  <div id="items">${itemsHTML(p)}</div>
  <h2>Valor</h2>
  <div class="card form">
    <label>Desconto (R$)<input id="f-desconto" data-b="desconto" data-n inputmode="decimal" value="${p.desconto?fin(p.desconto):''}"></label>
    <div id="tot" class="tot"></div>
  </div>
  <h2>Condições</h2>
  <div class="card form">
    <label>Prazo de execução<input id="f-prazo" data-b="prazo" value="${esc(p.prazo)}" placeholder="Ex.: 5 dias úteis após a visita"></label>
    <label>Validade da proposta (dias)<input id="f-validade" data-b="validade" data-n inputmode="numeric" value="${fin(p.validade)}"></label>
    <label>Forma de pagamento<textarea id="f-pagamento" data-b="pagamento">${esc(p.pagamento)}</textarea></label>
    <label>Observações<textarea id="f-obs" data-b="obs">${esc(p.obs)}</textarea></label>
  </div>
  <div class="actions">
    <button class="btn wide" data-act="pdf">Gerar PDF da proposta</button>
    <button class="btn alt wide" data-act="text">Copiar texto para WhatsApp</button>
    <button class="btn alt wide" data-act="mkctrl">Enviar serviços para o Controle</button>
    <button class="btn alt" data-act="dup">Duplicar</button>
    <button class="btn bad" data-act="del">Excluir</button>
  </div>
  <p class="note">Use Enviar serviços para o Controle depois que o cliente aprovar. Cada serviço vira um registro para acompanhar emissão, vencimento e pagamento.</p>`;
}
function updateTotals(){
  const p=cur();if(!p||!$('#tot'))return;const c=calc(p);
  $('#tot').innerHTML=`<div><span>Subtotal</span><span>${money(c.sub)}</span></div>
  ${p.desconto?`<div class="dim"><span>Desconto</span><span>− ${money(p.desconto)}</span></div>`:''}
  <div class="big"><span>Total</span><span>${money(c.total)}</span></div>`;
}
function vCtrl(){
  const rs=db.records.map((r,i)=>({r:r,i:i,v:venc(r)}));
  const abertos=rs.filter(x=>x.r.status==='fazer'||x.r.status==='andamento').length;
  const aten=rs.filter(x=>atencao(x.v)).length;
  const receber=db.records.filter(r=>r.status==='emitido').reduce((a,r)=>a+(r.valor||0),0);
  let list=rs;
  if(filter==='abertos')list=rs.filter(x=>x.r.status==='fazer'||x.r.status==='andamento');
  else if(filter==='atencao')list=rs.filter(x=>atencao(x.v));
  list=list.slice().sort((a,b)=>{const A=atencao(a.v),B=atencao(b.v);if(A!==B)return A?-1:1;if(A&&B)return daysTo(a.r.vence)-daysTo(b.r.vence);return b.i-a.i});
  const chip=(k,t)=>`<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${filter===k}">${t}</button>`;
  return `<div><h1>Controle</h1><p class="sub">ARTs, laudos, inspeções e projetos.</p></div>
  <div class="stats3"><div class="stat"><span>Abertos</span><b>${abertos}</b></div><div class="stat"><span>Vencendo</span><b>${aten}</b></div><div class="stat"><span>A receber</span><b>${money(receber)}</b></div></div>
  <div class="chips">${chip('todos','Todos')}${chip('abertos','Abertos')}${chip('atencao','Vencendo')}</div>
  <div class="list">${list.length?list.map(x=>{const r=x.r,v=x.v;return `<button class="rec${v&&v.c==='venc'?' alert':v&&v.c==='soon'?' soon':''}" data-act="rec" data-id="${r.id}">
    <span class="who">${esc(r.cliente||'Sem cliente')}</span><span class="val">${r.valor?money(r.valor):''}</span>
    <span class="what">${esc(r.tipo)}${r.desc?' · '+esc(r.desc):''}${r.art?' · nº '+esc(r.art):''}</span><span></span>
    <span class="tags"><span class="pill ${r.status}">${RST[r.status]}</span>${v?`<span class="pill ${v.c}">${v.t}</span>`:''}</span></button>`}).join(''):
    `<div class="empty">${filter==='todos'?'Nenhum registro ainda. Toque em Novo, ou envie os serviços de uma proposta aprovada.':'Nenhum registro neste filtro.'}</div>`}</div>
  <button class="fab" data-act="newrec">+ Novo</button>`;
}
function vCat(){
  const g={};db.catalog.forEach(m=>{const c=m.cat||'Outros';(g[c]=g[c]||[]).push(m)});
  const order=CATS.concat(Object.keys(g).filter(c=>CATS.indexOf(c)<0)).filter(c=>g[c]);
  return `<div><h1>Catálogo</h1><p class="sub">Serviços com valor fixo, usados para montar as propostas. Os valores são exemplos, ajuste aos seus.</p></div>
  ${order.length?order.map(c=>`<div class="sec"><h2>${esc(c)}</h2></div><div class="list">${g[c].map(m=>`<button class="item" data-act="cat" data-id="${m.id}"><span class="d">${esc(m.nome)}</span><span class="m">por ${esc(m.un)}</span><span class="t">${money(m.preco)}</span></button>`).join('')}</div>`).join(''):'<div class="empty">Nenhum serviço cadastrado.</div>'}
  <button class="fab" data-act="addcat">+ Novo</button>`;
}
function vCfg(){
  const s=db.settings,lg=s.logo&&s.logo.d;
  return `<div><h1>Ajustes</h1><p class="sub">Dados que saem no PDF e valores padrão.</p></div>
  ${storageOK?'':'<div class="warn">Este aparelho não permite guardar dados. O que você digitar some ao fechar o app.</div>'}
  <h2>Empresa no PDF</h2>
  <div class="card form">
    <div class="logo">${lg?`<img src="${s.logo.d}" alt="Logo">`:'<span class="note">Nenhum logo enviado</span>'}</div>
    <label>Logo<input id="s-logo" type="file" accept="image/*"></label>
    ${lg?'<button class="btn alt" data-act="logoclear">Remover logo</button>':''}
    <label>Nome da empresa<input id="s-empresa" data-s="empresa" value="${esc(s.empresa)}"></label>
    <label>Responsável técnico (como sai no PDF)<input id="s-resp" data-s="resp" value="${esc(s.resp)}" placeholder="Ex.: Eng. Mecânico Nome Sobrenome"></label>
    <div class="row2">
      <label>CREA<input id="s-crea" data-s="crea" value="${esc(s.crea)}"></label>
      <label>CNPJ<input id="s-doc" data-s="doc" value="${esc(s.doc)}"></label>
    </div>
    <div class="row2">
      <label>Telefone<input id="s-fone" data-s="fone" inputmode="tel" value="${esc(s.fone)}"></label>
      <label>E-mail<input id="s-email" data-s="email" inputmode="email" value="${esc(s.email)}"></label>
    </div>
    <label>Endereço<textarea id="s-endereco" data-s="endereco">${esc(s.endereco)}</textarea></label>
  </div>
  <h2>Valores padrão</h2>
  <div class="card form">
    <div class="row2">
      <label>Validade da proposta (dias)<input id="s-validade" data-s="validade" data-n inputmode="numeric" value="${fin(s.validade)}"></label>
      <label>Avisar vencimento com (dias)<input id="s-alerta" data-s="alerta" data-n inputmode="numeric" value="${fin(s.alerta)}"></label>
    </div>
    <label>Pagamento padrão<textarea id="s-pagamento" data-s="pagamento">${esc(s.pagamento)}</textarea></label>
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
  prop:'<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>',
  ctrl:'<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>',
  cat:'<svg viewBox="0 0 24 24"><path d="M3 8l9-4 9 4-9 4zM3 12l9 4 9-4M3 16l9 4 9-4"/></svg>',
  cfg:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
};
function render(){
  const v=view==='pedit'?vPedit():view==='ctrl'?vCtrl():view==='cat'?vCat():view==='cfg'?vCfg():vProp();
  const tab=view==='pedit'?'prop':view;
  const nav=[['prop','Propostas'],['ctrl','Controle'],['cat','Catálogo'],['cfg','Ajustes']].map(a=>`<button data-act="tab" data-v="${a[0]}"${tab===a[0]?' aria-current="true"':''}>${ICON[a[0]]}${a[1]}</button>`).join('');
  $('#app').innerHTML=v+`<nav class="nav"><div>${nav}</div></nav>`;
  if(view==='pedit')updateTotals();
}

/* ---------- folhas ---------- */
function sheet(html){
  closeSheet();const d=document.createElement('div');d.className='ov';d.id='ov';
  d.innerHTML='<div class="sh" role="dialog" aria-modal="true">'+html+'</div>';
  d.addEventListener('click',e=>{if(e.target===d)closeSheet()});document.body.appendChild(d);return d;
}
function closeSheet(){const o=$('#ov');if(o)o.remove()}
function toast(t){const o=document.createElement('div');o.className='toast';o.textContent=t;document.body.appendChild(o);setTimeout(()=>o.remove(),2200)}

function itemSheet(i){
  const p=cur();const it=i>=0?p.itens[i]:{mat:'',desc:'',det:'',un:'un',qtd:1,preco:0};editIdx=i;
  const o=sheet(`<h3>${i>=0?'Editar serviço':'Novo serviço'}</h3>
  <label>Serviço do catálogo<select id="it-mat">${catOpts(it.mat)}</select></label>
  <label>Descrição<input id="it-desc" value="${esc(it.desc)}" autocomplete="off"></label>
  <label>Detalhe para o cliente (opcional)<textarea id="it-det" placeholder="Ex.: equipamento, norma, local">${esc(it.det)}</textarea></label>
  <div class="row3">
    <label>Quantidade<input id="it-qtd" inputmode="decimal" value="${fin(it.qtd)}"></label>
    <label>Unidade<select id="it-un">${unitOpts(it.un)}</select></label>
    <label>Valor unit.<input id="it-preco" inputmode="decimal" value="${fin(it.preco)}"></label>
  </div>
  <div class="tot"><div class="big"><span>Total</span><span id="it-tot"></span></div></div>
  <div class="actions"><button class="btn" data-act="saveitem">Salvar</button><button class="btn alt" data-act="close">Cancelar</button>
  ${i>=0?'<button class="btn bad wide" data-act="delitem">Excluir serviço</button>':''}</div>`);
  const upd=()=>{$('#it-tot').textContent=money(pn($('#it-qtd').value)*pn($('#it-preco').value))};
  o.addEventListener('input',upd);
  $('#it-mat').addEventListener('change',()=>{const m=db.catalog.find(x=>x.id===$('#it-mat').value);if(m){$('#it-desc').value=m.nome;$('#it-det').value=m.det||'';$('#it-un').value=m.un;$('#it-preco').value=fin(m.preco)}upd()});
  upd();
}
function recSheet(id){
  const r=id?db.records.find(x=>x.id===id):{cliente:'',tipo:'ART',desc:'',art:'',emissao:today(),vence:'',status:'fazer',valor:0,obs:''};editRec=id||null;
  sheet(`<h3>${id?'Editar registro':'Novo registro'}</h3>
  <label>Cliente<input id="rc-cliente" list="cl-list" value="${esc(r.cliente)}" autocomplete="off"></label>${clientsList()}
  <div class="row2">
    <label>Tipo<select id="rc-tipo">${RTIPOS.map(t=>`<option${r.tipo===t?' selected':''}>${t}</option>`).join('')}</select></label>
    <label>Situação<select id="rc-status">${Object.keys(RST).map(k=>`<option value="${k}"${r.status===k?' selected':''}>${RST[k]}</option>`).join('')}</select></label>
  </div>
  <label>Descrição ou equipamento<input id="rc-desc" value="${esc(r.desc)}" autocomplete="off"></label>
  <label>Nº da ART ou do documento<input id="rc-art" value="${esc(r.art)}" autocomplete="off"></label>
  <div class="row2">
    <label>Emissão<input id="rc-emissao" type="date" value="${esc(r.emissao)}"></label>
    <label>Vencimento ou prazo<input id="rc-vence" type="date" value="${esc(r.vence)}"></label>
  </div>
  <div class="mini">
    <button class="btn alt" data-act="addmes" data-m="6" type="button">+6 meses</button>
    <button class="btn alt" data-act="addmes" data-m="12" type="button">+1 ano</button>
    <button class="btn alt" data-act="addmes" data-m="24" type="button">+2 anos</button>
  </div>
  <p class="note">Os botões somam à data de emissão (ou à data de hoje, se estiver vazia) e preenchem o vencimento.</p>
  <label>Valor (R$)<input id="rc-valor" inputmode="decimal" value="${r.valor?fin(r.valor):''}"></label>
  <label>Observações<textarea id="rc-obs">${esc(r.obs)}</textarea></label>
  <div class="actions"><button class="btn" data-act="saverec">Salvar</button><button class="btn alt" data-act="close">Cancelar</button>
  ${id?'<button class="btn bad wide" data-act="delrec">Excluir registro</button>':''}</div>`);
}
function catSheet(id){
  const m=id?db.catalog.find(x=>x.id===id):{nome:'',cat:'Outros',un:'un',preco:0,det:''};editCat=id||null;
  sheet(`<h3>${id?'Editar serviço':'Novo serviço do catálogo'}</h3>
  <label>Nome<input id="ct-nome" value="${esc(m.nome)}" autocomplete="off"></label>
  <label>Categoria<select id="ct-cat">${CATS.map(c=>`<option${(m.cat||'Outros')===c?' selected':''}>${esc(c)}</option>`).join('')}</select></label>
  <div class="row2">
    <label>Cobrado por<select id="ct-un">${unitOpts(m.un)}</select></label>
    <label>Valor (R$)<input id="ct-preco" inputmode="decimal" value="${fin(m.preco)}"></label>
  </div>
  <label>Detalhe padrão para o cliente<textarea id="ct-det">${esc(m.det)}</textarea></label>
  <div class="actions"><button class="btn" data-act="savecat">Salvar</button><button class="btn alt" data-act="close">Cancelar</button>
  ${id?'<button class="btn bad wide" data-act="delcat">Excluir</button>':''}</div>`);
}
function clientText(p){
  const c=calc(p),s=db.settings,L=[];
  L.push('*PROPOSTA '+p.num+'*');
  L.push(s.empresa+(s.fone?' · '+s.fone:''));
  if(s.resp)L.push(s.resp+(s.crea?' · CREA '+s.crea:''));
  L.push('');
  if(p.cliente)L.push('Cliente: '+p.cliente);
  if(p.ref)L.push('Assunto: '+p.ref);
  L.push('Data: '+dbr(p.data));L.push('');
  p.itens.forEach((i,k)=>{L.push((k+1)+') '+i.desc+' ('+qfmt(i.qtd)+' '+i.un+'): '+money(itTotal(i)));if(i.det)L.push('     '+i.det.replace(/\s*\n\s*/g,' ')) });
  if(p.desconto){L.push('');L.push('Desconto: − '+money(p.desconto))}
  L.push('');L.push('*TOTAL: '+money(c.total)+'*');L.push('');
  if(p.prazo)L.push('Prazo: '+p.prazo);
  if(p.pagamento)L.push('Pagamento: '+p.pagamento);
  if(p.validade)L.push('Validade da proposta: '+qfmt(p.validade)+' dias');
  if(p.obs)L.push('Obs.: '+p.obs);
  return L.join('\n');
}
function textSheet(title,text,hint){
  sheet(`<h3>${title}</h3><textarea id="tx" readonly style="min-height:220px;font-family:var(--f-mono);font-size:14px">${esc(text)}</textarea>
  ${hint?`<p class="note">${hint}</p>`:''}
  <div class="actions"><button class="btn" data-act="copytx">Copiar</button><button class="btn alt" data-act="close">Fechar</button></div>`);
}
function isNative(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
async function nativePdf(bytes,name,title){
  const P=window.Capacitor&&Capacitor.Plugins;
  if(!P||!P.Filesystem||!P.Share)throw new Error('plugin');
  let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
  const r=await P.Filesystem.writeFile({path:name,data:btoa(bin),directory:'CACHE'});
  await P.Share.share({title:title,url:r.uri,dialogTitle:'Enviar proposta'});
}
function recalc(){$('#items').innerHTML=itemsHTML(cur());updateTotals()}

/* ---------- ações ---------- */
const acts={
  tab(t){view=t.dataset.v;render();scrollTo(0,0)},
  filter(t){filter=t.dataset.f;render()},
  newp(){
    const s=db.settings;db.seq=(db.seq||0)+1;
    const p={id:uid(),num:'PRO-'+String(db.seq).padStart(3,'0'),cliente:'',doc:'',fone:'',email:'',ref:'',data:today(),status:'rascunho',itens:[],desconto:0,validade:s.validade,prazo:'',pagamento:s.pagamento,obs:''};
    db.proposals.push(p);save();curId=p.id;view='pedit';render();scrollTo(0,0);
  },
  openp(t){curId=t.dataset.id;view='pedit';render();scrollTo(0,0)},
  back(){view='prop';render();scrollTo(0,0)},
  additem(){itemSheet(-1)},
  item(t){itemSheet(+t.dataset.i)},
  saveitem(){
    const p=cur();const it={mat:$('#it-mat').value,desc:$('#it-desc').value.trim(),det:$('#it-det').value.trim(),un:$('#it-un').value,qtd:pn($('#it-qtd').value),preco:pn($('#it-preco').value)};
    if(!it.desc){toast('Digite a descrição do serviço');return}
    if(editIdx>=0){it.id=p.itens[editIdx].id;p.itens[editIdx]=it}else{it.id=uid();p.itens.push(it)}
    save();closeSheet();recalc();
  },
  delitem(t){
    if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Toque de novo para excluir';return}
    cur().itens.splice(editIdx,1);save();closeSheet();recalc();
  },
  close(){closeSheet()},
  pdf(){
    const p=cur();let bytes;
    try{bytes=PromechPDF.build(p,db.settings,Core)}catch(e){toast('Não foi possível gerar o PDF');return}
    const name=(p.num+' '+(p.cliente||'cliente')).replace(/[^\w -]+/g,'').trim().replace(/\s+/g,'-')+'.pdf';
    if(isNative()){nativePdf(bytes,name,p.num).catch(()=>toast('Não foi possível compartilhar o PDF'));return}
    const blob=new Blob([bytes],{type:'application/pdf'});
    try{
      const file=new File([blob],name,{type:'application/pdf'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:p.num}).catch(()=>{});return}
    }catch(e){}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),10000);toast('PDF baixado');
  },
  text(){textSheet('Texto da proposta',clientText(cur()),'Toque em Copiar e cole na conversa do WhatsApp ou em um e-mail.')},
  copytx(){
    const ta=$('#tx');ta.select();
    const ok=()=>toast('Texto copiado'),no=()=>{ta.focus();ta.select();toast('Selecione o texto e copie manualmente')};
    try{navigator.clipboard.writeText(ta.value).then(ok,no)}catch(e){no()}
  },
  dup(){
    const p=cur();db.seq++;const n=JSON.parse(JSON.stringify(p));n.id=uid();n.num='PRO-'+String(db.seq).padStart(3,'0');n.status='rascunho';n.data=today();
    n.itens.forEach(i=>i.id=uid());db.proposals.push(n);save();curId=n.id;render();scrollTo(0,0);toast('Proposta duplicada');
  },
  del(t){
    t.textContent='Toque de novo para excluir';t.dataset.act='delok';clearTimeout(confirmT);
    confirmT=setTimeout(()=>{if(t.isConnected){t.textContent='Excluir';t.dataset.act='del'}},4000);
  },
  delok(){db.proposals=db.proposals.filter(p=>p.id!==curId);save();view='prop';render();scrollTo(0,0);toast('Proposta excluída')},
  mkctrl(){
    const p=cur();
    if(db.records.some(r=>r.propId===p.id)){toast('Esta proposta já foi enviada ao Controle');return}
    const map={'ART':'ART','Laudos e inspeções':'Laudo','Projetos':'Projeto'};let n=0;
    p.itens.forEach(it=>{
      const m=db.catalog.find(x=>x.id===it.mat);if(m&&m.cat==='Despesas')return;
      db.records.push({id:uid(),propId:p.id,cliente:p.cliente,tipo:(m&&map[m.cat])||'Outro',desc:it.desc,art:'',emissao:'',vence:'',status:'fazer',valor:itTotal(it),obs:p.num});n++;
    });
    if(!n){toast('Nenhum serviço para enviar');return}
    if(p.status!=='aprovada')p.status='aprovada';
    save();toast(n+(n===1?' serviço enviado':' serviços enviados')+' ao Controle');render();
  },
  newrec(){recSheet(null)},
  rec(t){recSheet(t.dataset.id)},
  addmes(t){
    const base=$('#rc-emissao').value||today();$('#rc-vence').value=addMonths(base,+t.dataset.m);
    if(!$('#rc-emissao').value)$('#rc-emissao').value=base;
  },
  saverec(){
    const d={cliente:$('#rc-cliente').value.trim(),tipo:$('#rc-tipo').value,status:$('#rc-status').value,desc:$('#rc-desc').value.trim(),art:$('#rc-art').value.trim(),emissao:$('#rc-emissao').value,vence:$('#rc-vence').value,valor:pn($('#rc-valor').value),obs:$('#rc-obs').value.trim()};
    if(!d.cliente&&!d.desc){toast('Digite o cliente ou a descrição');return}
    if(editRec){Object.assign(db.records.find(x=>x.id===editRec),d)}else db.records.push(Object.assign({id:uid(),propId:''},d));
    if(d.cliente&&!db.clients.some(c=>c.nome.toLowerCase()===d.cliente.toLowerCase()))db.clients.push({nome:d.cliente,doc:'',fone:'',email:''});
    save();closeSheet();render();
  },
  delrec(t){
    if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Toque de novo para excluir';return}
    db.records=db.records.filter(x=>x.id!==editRec);save();closeSheet();render();
  },
  cat(t){catSheet(t.dataset.id)},
  addcat(){catSheet(null)},
  savecat(){
    const nome=$('#ct-nome').value.trim();if(!nome){toast('Digite o nome');return}
    const d={nome:nome,cat:$('#ct-cat').value,un:$('#ct-un').value,preco:pn($('#ct-preco').value),det:$('#ct-det').value.trim()};
    if(editCat){Object.assign(db.catalog.find(x=>x.id===editCat),d)}else db.catalog.push(Object.assign({id:uid()},d));
    save();closeSheet();render();
  },
  delcat(t){
    if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Toque de novo para excluir';return}
    db.catalog=db.catalog.filter(x=>x.id!==editCat);save();closeSheet();render();
  },
  logoclear(){db.settings.logo=null;save();render()},
  backup(){textSheet('Backup dos dados',JSON.stringify(db),'Guarde este texto em lugar seguro. Para restaurar, cole em Ajustes.')},
  restore(){
    const v=$('#s-restore').value.trim();if(!v){toast('Cole o texto do backup primeiro');return}
    try{const d=JSON.parse(v);if(!valid(d))throw 0;db=fix(d);save();render();toast('Dados restaurados')}
    catch(e){toast('Backup inválido')}
  }
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t&&acts[t.dataset.act])acts[t.dataset.act](t)});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.b){const p=cur();if(!p)return;p[t.dataset.b]=t.hasAttribute('data-n')?pn(t.value):t.value;save();if(t.hasAttribute('data-n'))updateTotals()}
  else if(t.dataset.s){db.settings[t.dataset.s]=t.hasAttribute('data-n')?pn(t.value):t.value;save()}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&['cliente','doc','fone','email'].indexOf(t.dataset.b)>=0){
    const p=cur();if(!p)return;
    if(t.dataset.b==='cliente'){
      const c=db.clients.find(x=>x.nome.toLowerCase()===String(p.cliente).trim().toLowerCase());
      if(c)['doc','fone','email'].forEach(k=>{if(!p[k]&&c[k]){p[k]=c[k];const el=$('#f-'+k);if(el)el.value=c[k]}});
    }
    upsertClient(p);save();return;
  }
  if(t.id!=='s-logo'||!t.files||!t.files[0])return;
  const fr=new FileReader();
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
  fr.readAsDataURL(t.files[0]);
});
render();
