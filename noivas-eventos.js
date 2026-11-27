/* Jenniffer Loanda Beauty V1.5 — Noivas e Eventos | Modulo isolado do painel */
(()=>{'use strict';
const api=window.JLB, dashboard=document.getElementById('dashboard');
if(!api || api.demo || !dashboard)return;
const {rpc,esc}=api;
const $=(id)=>document.getElementById(id);
const nav=dashboard.querySelector('.admin-section-nav');
if(!nav)return;
const labels={consulta:'Consulta',orcamento:'Orçamento',confirmado:'Confirmado',concluido:'Concluído',cancelado:'Cancelado'};
let events=[], bookings=[], role='', loading=false;

const style=document.createElement('style');
style.textContent=`
  #noivas-eventos-admin .jlb-v15-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0}
  #noivas-eventos-admin .jlb-v15-fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600}
  #noivas-eventos-admin input,#noivas-eventos-admin select,#noivas-eventos-admin textarea{width:100%;min-width:0;border:1px solid #ded4c9;border-radius:9px;padding:12px;background:#fff;color:#211b18;font:inherit}
  #noivas-eventos-admin .full{grid-column:1/-1}
  #noivas-eventos-admin .span2{grid-column:span 2}
  #noivas-eventos-admin .jlb-v15-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0}
  #noivas-eventos-admin .jlb-v15-grid-toolbar{display:flex;justify-content:space-between;flex-wrap:wrap;align-items:center;gap:12px;margin:22px 0 12px}
  #noivas-eventos-admin .jlb-v15-grid-toolbar input{max-width:300px}
  #noivas-eventos-admin .jlb-v15-sm{display:block;font-size:12px;color:#6e6359;line-height:1.5;margin-top:4px}
  #noivas-eventos-admin .jlb-v15-empty{padding:18px 8px;color:#6e6359}
  @media(max-width:820px){#noivas-eventos-admin .jlb-v15-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:520px){#noivas-eventos-admin .jlb-v15-fields{grid-template-columns:1fr}#noivas-eventos-admin .span2{grid-column:auto}}
`;
document.head.appendChild(style);

const link=document.createElement('a');link.href='#noivas-eventos-admin';link.textContent='Noivas e Eventos';link.hidden=true;nav.appendChild(link);
const section=document.createElement('section');section.className='admin-card';section.id='noivas-eventos-admin';section.hidden=true;
section.innerHTML=`
  <div class="section-label">10 · PRODUÇÕES ESPECIAIS</div>
  <h2>Noivas e Eventos</h2>
  <p class="admin-note">Gerencie cerimônias, prazos de preparação, equipe e deslocamento. O registro aqui <strong>não bloqueia horário automaticamente</strong>: utilize a agenda normal para reservar o atendimento.</p>
  <form id="jlbV15Form" class="panel-form">
    <input type="hidden" id="jlbV15Id">
    <div class="jlb-v15-fields">
      <label>Tipo de produção *<select id="jlbV15Tipo" required><option value="noiva">Noiva</option><option value="evento">Evento</option><option value="outro">Outra produção</option></select></label>
      <label>Nome da cliente *<input id="jlbV15Cliente" maxlength="100" required placeholder="Nome completo"></label>
      <label>WhatsApp com DDD *<input id="jlbV15Whatsapp" type="tel" maxlength="20" required placeholder="(31) 99999-9999"></label>
      <label>Data da cerimônia/evento *<input id="jlbV15Data" type="date" required></label>
      <label>Horário do evento<input id="jlbV15HoraEvento" type="time"></label>
      <label>Deve estar pronta até<input id="jlbV15HoraLimite" type="time"></label>
      <label class="span2">Local da cerimônia / evento<input id="jlbV15Local" maxlength="180" placeholder="Nome do local"></label>
      <label>Quantidade de pessoas *<input id="jlbV15Pessoas" type="number" min="1" max="100" value="1" required></label>
      <label class="full">Endereço / informações de deslocamento<input id="jlbV15Endereco" maxlength="280" placeholder="Rua, número, bairro, cidade"></label>
      <label>Tempo de preparação (min) *<input id="jlbV15Preparacao" type="number" min="0" max="1440" value="120" required></label>
      <label>Tempo de deslocamento (min) *<input id="jlbV15Deslocamento" type="number" min="0" max="1440" value="0" required></label>
      <label>Situação<select id="jlbV15Status"><option value="consulta">Consulta</option><option value="orcamento">Orçamento</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></label>
      <label class="full">Profissionais / equipe<input id="jlbV15Equipe" maxlength="400" placeholder="Nomes ou quantidade de pessoas da equipe"></label>
      <label class="full">Reserva existente (opcional)<select id="jlbV15Reserva"><option value="">Sem vínculo</option></select><span class="jlb-v15-sm">Vincular não cria ou altera uma reserva. Agende o horário separadamente.</span></label>
      <label class="full">Observações internas<textarea id="jlbV15Obs" maxlength="1800" rows="3" placeholder="Necessidades, cronograma, fornecedores e condições combinadas"></textarea></label>
    </div>
    <div class="jlb-v15-actions"><button type="submit" class="mini-btn" id="jlbV15Save">Cadastrar evento</button><button type="button" class="mini-btn subtle" id="jlbV15Reset">Limpar formulário</button></div>
    <p class="notice" id="jlbV15Notice" role="status" hidden></p>
  </form>
  <div class="jlb-v15-grid-toolbar"><h3>Produções cadastradas</h3><input id="jlbV15Search" type="search" placeholder="Pesquisar cliente, telefone ou local" aria-label="Pesquisar eventos"></div>
  <div class="table-wrap"><table class="admin-table"><thead><tr><th>Data e cliente</th><th>Evento / local</th><th>Equipe / prazo</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="jlbV15Rows"><tr><td colspan="5">Carregando...</td></tr></tbody></table></div>
`;
dashboard.appendChild(section);
function showMessage(msg,bad=false){const el=$('jlbV15Notice');el.textContent=msg;el.hidden=false;el.classList.toggle('error',bad);el.classList.toggle('success',!bad)}
function datePt(d){if(!d)return '—';const a=d.split('-');return `${a[2]}/${a[1]}/${a[0]}`}
function hm(d){return d?String(d).slice(0,5):'—'}
function opt(id,text,sel){return `<option value="${esc(id)}" ${String(sel)===String(id)?'selected':''}>${esc(text)}</option>`}
function resetForm(){ $('jlbV15Form').reset();$('jlbV15Id').value='';$('jlbV15Save').textContent='Cadastrar evento';$('jlbV15Pessoas').value='1';$('jlbV15Preparacao').value='120';$('jlbV15Deslocamento').value='0';$('jlbV15Notice').hidden=true; }
function loadReserveOptions(selected=''){
  const sel=$('jlbV15Reserva'); const available=bookings.filter(b=>b.status!=='cancelado');
  sel.innerHTML='<option value="">Sem vínculo</option>'+available.map(b=>opt(b.id,`${datePt(b.date)} · ${b.clientName||'Cliente'} · ${b.service||'Serviço'}`,selected)).join('');
  if(selected&&!available.some(b=>String(b.id)===String(selected))) {
    sel.innerHTML+=opt(selected,'Reserva vinculada (não listada)',selected);
  }
}
function render(){
 const q=$('jlbV15Search').value.toLocaleLowerCase('pt-BR').trim();
 const shown=events.filter(e=>!q||[e.cliente_nome,e.whatsapp,e.local_evento,e.tipo,e.status].join(' ').toLocaleLowerCase('pt-BR').includes(q));
 $('jlbV15Rows').innerHTML=shown.length?shown.map(e=>`
  <tr><td><strong>${esc(datePt(e.data_evento))}</strong><span class="row-sub">${esc(e.cliente_nome)}</span><span class="row-sub">${esc(e.whatsapp)}</span></td>
  <td><strong>${esc(e.tipo==='noiva'?'Noiva':e.tipo==='evento'?'Evento':'Outra produção')}</strong><span class="row-sub">${esc(e.local_evento||'Local a definir')}</span><span class="row-sub">${esc(hm(e.hora_evento))} · ${esc(e.quantidade_pessoas)} pessoa(s)</span></td>
  <td>${esc(e.equipe||'A definir')}<span class="row-sub">${esc(e.preparacao_minutos)} min de preparo · ${esc(e.deslocamento_minutos)} min de deslocamento</span><span class="row-sub">Pronta até ${esc(hm(e.hora_limite))}</span></td>
  <td><span class="status-chip ${e.status==='confirmado'?'confirmado':e.status==='cancelado'?'cancelado':'pendente'}">${esc(labels[e.status]||e.status)}</span></td>
  <td><div class="table-actions"><button class="action-inline" type="button" data-v15-edit="${esc(e.id)}">Editar</button>${role!=='recepcao'?`<button class="action-inline" type="button" data-v15-delete="${esc(e.id)}">Excluir</button>`:''}</div></td></tr>`).join(''):'<tr><td colspan="5" class="jlb-v15-empty">Nenhuma produção encontrada.</td></tr>';
 $('jlbV15Rows').querySelectorAll('[data-v15-edit]').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.v15Edit)));
 $('jlbV15Rows').querySelectorAll('[data-v15-delete]').forEach(b=>b.addEventListener('click',()=>remove(b.dataset.v15Delete)));
}
function edit(id){
 const e=events.find(x=>x.id===id);if(!e)return;
 for(const [field,value] of Object.entries({
  jlbV15Id:e.id,jlbV15Tipo:e.tipo,jlbV15Cliente:e.cliente_nome,
  jlbV15Whatsapp:e.whatsapp,jlbV15Data:e.data_evento,
  jlbV15HoraEvento:hm(e.hora_evento)==='—'?'':hm(e.hora_evento),
  jlbV15HoraLimite:hm(e.hora_limite)==='—'?'':hm(e.hora_limite),
  jlbV15Local:e.local_evento,jlbV15Endereco:e.endereco,
  jlbV15Pessoas:e.quantidade_pessoas,jlbV15Equipe:e.equipe,
  jlbV15Preparacao:e.preparacao_minutos,jlbV15Deslocamento:e.deslocamento_minutos,
  jlbV15Status:e.status,jlbV15Obs:e.observacoes
 })) $(field).value=value??'';
 loadReserveOptions(e.reserva_id||'');
 $('jlbV15Save').textContent='Salvar alterações';
 section.scrollIntoView({behavior:'smooth',block:'start'});
}
async function remove(id){
 if(!events.find(e=>e.id===id)||!confirm('Excluir o registro deste evento? A reserva vinculada NÃO será apagada.'))return;
 try{await rpc('jlb_v15_excluir_evento',{p_id:id},true);await reload();showMessage('Evento excluído. A agenda permanece intacta.')}catch(e){showMessage(e.message,true)}
}
async function reload(){const result=await rpc('jlb_v15_listar_eventos',{},true);if(!Array.isArray(result))throw Error('Lista de eventos inválida.');events=result;render()}
async function init(){
 if(loading||dashboard.hidden)return;
 loading=true;
 try{
  const me=await rpc('jlb_v13_perfil_atual',{},true);
  role=me?.perfil||'';
  if(!['master','administradora','recepcao'].includes(role)){section.hidden=true;link.hidden=true;return;}
  section.hidden=false;link.hidden=false;
  await reload();
  try{const panel=await rpc('jlb_admin_painel',{},true);bookings=Array.isArray(panel?.bookings)?panel.bookings:[];}catch(e){bookings=[];console.warn('Reservas não carregadas para vínculo:',e.message)}
  loadReserveOptions($('jlbV15Reserva').value);
 }catch(e){section.hidden=true;link.hidden=true;console.warn('Noivas e Eventos:',e.message)}
 finally{loading=false}
}
$('jlbV15Form').addEventListener('submit',async e=>{
 e.preventDefault();const name=$('jlbV15Cliente').value.trim(),phone=$('jlbV15Whatsapp').value.replace(/\D/g,'');
 if(name.length<3||phone.length<10||!$('jlbV15Data').value){showMessage('Preencha nome, WhatsApp e data.',true);return}
 const button=$('jlbV15Save');button.disabled=true;
 const payload={
  p_id:$('jlbV15Id').value||null,p_tipo:$('jlbV15Tipo').value,p_cliente_nome:name,
  p_whatsapp:phone,p_data_evento:$('jlbV15Data').value,
  p_hora_evento:$('jlbV15HoraEvento').value||null,p_hora_limite:$('jlbV15HoraLimite').value||null,
  p_local_evento:$('jlbV15Local').value.trim(),p_endereco:$('jlbV15Endereco').value.trim(),
  p_quantidade_pessoas:Number($('jlbV15Pessoas').value),p_equipe:$('jlbV15Equipe').value.trim(),
  p_preparacao_minutos:Number($('jlbV15Preparacao').value),
  p_deslocamento_minutos:Number($('jlbV15Deslocamento').value),
  p_reserva_id:$('jlbV15Reserva').value||null,p_status:$('jlbV15Status').value,
  p_observacoes:$('jlbV15Obs').value.trim()
 };
 try{await rpc('jlb_v15_salvar_evento',payload,true);resetForm();await reload();showMessage('Produção salva. Lembre-se de reservar o horário na Agenda.');}
 catch(error){showMessage(error.message,true)}finally{button.disabled=false}
});
$('jlbV15Reset').addEventListener('click',()=>{resetForm();loadReserveOptions()});
$('jlbV15Search').addEventListener('input',render);
const observer=new MutationObserver(()=>{
 if(dashboard.hidden){section.hidden=true;link.hidden=true;events=[];bookings=[];role='';}
 else init();
});
observer.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)init();
})();
