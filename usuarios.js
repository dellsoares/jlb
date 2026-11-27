/* Jenniffer Loanda Beauty V1.3 — perfis, exclusões protegidas e atribuições.
   A autorização verdadeira fica nas RPCs do banco, jamais só na interface. */
(()=>{'use strict';
const {$,esc,rpc,cfg,getToken,demo}=window.JLB;
if(demo)return;
const dashboard=$('#dashboard'),usersBox=$('#usuarios-admin'),usersNav=$('#usersNav');
const usersRows=$('#usersRows'),notice=$('#inviteResult'),inviteForm=$('#inviteUserForm');
const roles={master:'MASTER',administradora:'Administradora',recepcao:'Recepção',profissional:'Profissional'};
let users=[],myRole=null,professionals=[],assignments=[],lastToken='',checking=false;
function feedback(msg,error=false){notice.hidden=false;notice.textContent=msg;notice.classList.toggle('error',error);notice.classList.toggle('success',!error)}
function adminNotice(msg,error=false){const n=$('#adminMessage');n.textContent=msg;n.hidden=false;n.classList.toggle('error',error);n.classList.toggle('success',!error)}
function isMaster(){return myRole==='master'}
function canManage(){return myRole==='master'||myRole==='administradora'}
const roleSelect=$('#inviteRole');roleSelect.disabled=false;
roleSelect.innerHTML='<option value="administradora">Administradora</option><option value="recepcao">Recepção</option><option value="profissional">Profissional</option>';
const sectionIds=['agenda','servicos-admin','clientes-admin','pacotes-admin','mensagens-admin','bloqueios-admin','expediente-admin','usuarios-admin'];
function adaptDashboard(){
  const allow=myRole==='master'?sectionIds:myRole==='administradora'?sectionIds.filter(id=>id!=='usuarios-admin'):
    myRole==='recepcao'?['agenda','clientes-admin','mensagens-admin']:['agenda'];
  for(const id of sectionIds){
    const el=document.getElementById(id);
    if(el)el.hidden=!allow.includes(id);
    document.querySelectorAll(`a[href="#${id}"]`).forEach(a=>a.hidden=!allow.includes(id));
  }
  usersNav.hidden=!isMaster();usersBox.hidden=!isMaster();
  document.body.dataset.jlbPerfil=myRole||'sem-acesso';
  const manual=$('#manualForm');if(manual)manual.hidden=myRole==='profissional';
  const saveTemplate=$('#saveTemplate');if(saveTemplate)saveTemplate.hidden=!canManage();
  decorateRows();
}
async function refreshUsers(){
  users=await rpc('jlb_v13_usuarios',{},true);
  if(!Array.isArray(users))throw Error('Lista de acessos inválida.');
  usersRows.innerHTML=users.length?users.map(u=>{
    const protectedUser=u.perfil==='master';
    const selected=(u.perfil||'administradora');
    const opts=['administradora','recepcao','profissional'].map(role=>`<option value="${role}" ${selected===role?'selected':''}>${roles[role]}</option>`).join('');
    return `<tr>
      <td><strong>${esc(u.nome||'—')}</strong><span class="row-sub">${esc(u.email||'—')}</span></td>
      <td>${protectedUser?'<strong>MASTER</strong>':`<label class="row-sub">Perfil<select aria-label="Perfil de ${esc(u.nome||'usuário')}" data-user-role="${esc(u.id)}" ${u.excluido?'disabled':''}>${opts}</select></label>`}</td>
      <td><span class="status-chip ${u.ativo?'confirmado':'cancelado'}">${u.excluido?'Acesso excluído':u.ativo?'Ativo':'Desativado'}</span></td>
      <td>${protectedUser?'<span class="row-sub">Protegido</span>':u.excluido?'<span class="row-sub">Acesso revogado</span>':`<div class="table-actions"><button class="action-inline" type="button" data-toggle-user="${esc(u.id)}">${u.ativo?'Desativar':'Reativar'}</button><button class="action-inline" type="button" data-delete-user="${esc(u.id)}">Excluir</button></div>`}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="4">Nenhum acesso cadastrado.</td></tr>';
  usersRows.querySelectorAll('[data-user-role]').forEach(el=>el.addEventListener('change',async()=>{
    const u=users.find(x=>x.id===el.dataset.userRole);if(!u)return;
    if(!confirm(`Alterar o perfil de ${u.nome} para ${roles[el.value]}?`)){el.value=u.perfil;return}
    el.disabled=true;
    try{await rpc('jlb_v13_salvar_perfil',{p_user_id:u.id,p_perfil:el.value},true);await refreshUsers();feedback('Perfil atualizado no banco de dados.')}catch(e){feedback(e.message,true);el.disabled=false;el.value=u.perfil}
  }));
  usersRows.querySelectorAll('[data-toggle-user]').forEach(btn=>btn.addEventListener('click',async()=>{
    const u=users.find(x=>x.id===btn.dataset.toggleUser);if(!u)return;
    const active=!u.ativo;
    if(!confirm(`${active?'Reativar':'Desativar'} acesso de ${u.nome}?`))return;
    btn.disabled=true;
    try{await rpc('jlb_v13_alterar_acesso',{p_user_id:u.id,p_ativo:active},true);await refreshUsers();feedback('Situação atualizada e conferida no servidor.')}catch(e){feedback(e.message,true);btn.disabled=false}
  }));
  usersRows.querySelectorAll('[data-delete-user]').forEach(btn=>btn.addEventListener('click',async()=>{
    const u=users.find(x=>x.id===btn.dataset.deleteUser);if(!u)return;
    if(!confirm(`Excluir o acesso de ${u.nome}? A conta será bloqueada no sistema. O histórico será preservado para auditoria.`))return;
    btn.disabled=true;
    try{const res=await rpc('jlb_v13_excluir_usuario',{p_user_id:u.id},true);await refreshUsers();feedback(res==='acesso_revogado'?'Acesso revogado. O registro de auditoria foi preservado.':'Exclusão de acesso registrada.')}catch(e){feedback(e.message,true);btn.disabled=false}
  }));
}
inviteForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!isMaster()){feedback('Somente MASTER pode enviar convites.',true);return}
  const name=$('#inviteName').value.trim(),email=$('#inviteEmail').value.trim().toLowerCase(),profile=roleSelect.value;
  const button=$('#inviteButton');
  if(name.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['administradora','recepcao','profissional'].includes(profile)){
    feedback('Confira nome, e-mail e perfil.',true);return;
  }
  button.disabled=true;feedback('Criando convite...');
  try{
    /* A função V1.2.1 cria um usuário-base no Auth. O perfil real V1.3
       é concedido SOMENTE no servidor pelo MASTER. */
    const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/jlb-convidar-usuario',{
      method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey,'Authorization':'Bearer '+getToken()},
      body:JSON.stringify({nome:name,email}),cache:'no-store'
    });
    let result;try{result=await res.json()}catch{result={}};
    if(!res.ok)throw Error(result.error||result.detail||'Falha no convite.');
    await refreshUsers();
    const u=users.find(x=>(x.email||'').toLowerCase()===email);
    if(u){
      await rpc('jlb_v13_salvar_perfil',{p_user_id:u.id,p_perfil:profile},true);
      await refreshUsers();
      feedback(`Convite enviado. Perfil ${roles[profile]} registrado. O primeiro acesso é pelo e-mail.`);
    }else{
      feedback('Convite enviado. O registro ainda não apareceu na lista: atualize a aba Usuários e defina o perfil antes de liberar o acesso.',true);
    }
    inviteForm.reset();
  }catch(err){feedback(err.message,true)}finally{button.disabled=false}
});
async function refreshAssignments(){
  if(!canManage())return;
  try{
    [professionals,assignments]=await Promise.all([
      rpc('jlb_v13_profissionais',{},true),rpc('jlb_v13_atribuicoes',{},true)
    ]);
    document.querySelectorAll('[data-v13-assign]').forEach(el=>el.parentElement.remove());
    decorateRows();
  }catch(e){console.warn('Atribuições:',e.message)}
}
function decorateRows(){
  const rows=$('#clientRows');
  if(rows){rows.querySelectorAll('[data-edit-client]').forEach(edit=>{
    const cell=edit.parentElement;
    if(!canManage()||cell.querySelector('[data-delete-client]'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='action-inline';
    btn.textContent='Excluir';btn.dataset.deleteClient=edit.dataset.editClient;btn.style.marginLeft='10px';
    btn.addEventListener('click',async()=>{
      if(!confirm('Excluir esta cliente? Se houver histórico, o cadastro será arquivado para preservar as reservas e atender às obrigações legais.'))return;
      btn.disabled=true;
      try{const result=await rpc('jlb_v13_cliente_excluir',{p_id:btn.dataset.deleteClient},true);
        adminNotice(result==='excluido'?'Cliente excluída.':'Cliente arquivada; histórico preservado.');
        $('#reloadBtn').click();
      }catch(e){adminNotice(e.message,true);btn.disabled=false}
    });
    cell.appendChild(btn);
  })}
  const services=$('#serviceRows');if(services)services.querySelectorAll('[data-remove-service]').forEach(btn=>{
    if(btn.textContent!=='Excluir')btn.textContent='Excluir';
    btn.hidden=!canManage();
  });
  const bookingRows=$('#bookingRows');if(!bookingRows)return;
  bookingRows.querySelectorAll('tr').forEach(row=>{
    const status=row.querySelector('[data-booking-status]');if(!status)return;
    const reserveId=status.dataset.bookingStatus;
    if(myRole==='profissional'){
      row.querySelectorAll('[data-booking-status],[data-remarcar],[data-msg-booking],[data-package-reserva]').forEach(el=>el.hidden=true);
      return;
    }
    if(!canManage())return;
    const target=row.querySelector('td:nth-child(3)');
    if(!target||target.querySelector('[data-v13-assign]'))return;
    const list=document.createElement('label');list.className='row-sub';list.style.marginTop='8px';
    list.textContent='Profissional: ';
    const select=document.createElement('select');select.dataset.v13Assign=reserveId;
    select.setAttribute('aria-label','Profissional responsável pela reserva');
    const assigned=assignments.find(a=>String(a.reserva_id)===String(reserveId));
    select.innerHTML='<option value="">Sem atribuição</option>'+professionals.map(u=>
      `<option value="${esc(u.id)}" ${assigned&&assigned.profissional_id===u.id?'selected':''}>${esc(u.nome)}</option>`
    ).join('');
    select.addEventListener('change',async()=>{
      select.disabled=true;
      try{await rpc('jlb_v13_atribuir_reserva',{p_reserva_id:reserveId,p_profissional_id:select.value||null},true);
        adminNotice('Profissional da reserva atualizado.');await refreshAssignments();
      }catch(e){adminNotice(e.message,true);select.disabled=false}
    });
    list.appendChild(select);target.appendChild(list);
  });
}
let observerBusy=false;
const observerRows=new MutationObserver(()=>{
  if(observerBusy)return;
  observerBusy=true;try{decorateRows()}finally{observerBusy=false}
});
for(const selector of ['#clientRows','#serviceRows','#bookingRows']){
  const el=$(selector);if(el)observerRows.observe(el,{childList:true,subtree:true});
}
async function checkRole(){
  if(checking||!getToken())return;
  if(lastToken===getToken()&&myRole)return;
  checking=true;
  try{
    const me=await rpc('jlb_v13_perfil_atual',{},true);
    myRole=me?.perfil||null;
    if(!myRole)throw Error('Conta sem perfil V1.3. O MASTER deve conferir o acesso na aba Usuários.');
    lastToken=getToken();adaptDashboard();
    if(isMaster())await refreshUsers();
    await refreshAssignments();
  }catch(e){
    usersBox.hidden=true;usersNav.hidden=true;
    adminNotice(e.message,true);
  }finally{checking=false}
}
const observerDashboard=new MutationObserver(()=>{
  if(!dashboard.hidden)checkRole();
  else {usersBox.hidden=true;usersNav.hidden=true;myRole=null;lastToken=''}
});
observerDashboard.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)checkRole();
$('#logoutBtn').addEventListener('click',()=>{users=[];myRole=null;lastToken='';usersRows.textContent='';usersBox.hidden=true;usersNav.hidden=true});
})();
