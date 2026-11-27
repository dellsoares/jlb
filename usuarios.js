/* Jenniffer Loanda Beauty V1.2.1 | Gestão de convites — somente MASTER */
(()=>{'use strict';
const {$,esc,rpc,cfg,getToken,demo}=window.JLB;
if(demo)return;
let users=[];
const holder=$('#usuarios-admin'),nav=$('#usersNav'),tbody=$('#usersRows'),notice=$('#inviteResult');
function showMessage(s,bad=false){notice.hidden=false;notice.textContent=s;notice.classList.toggle('error',bad);notice.classList.toggle('success',!bad)}
async function refresh(){
  const list=await rpc('jlb_master_usuarios',{},true);
  if(!Array.isArray(list))throw Error('Lista de acessos inválida.');
  users=list;holder.hidden=false;nav.hidden=false;
  tbody.innerHTML=users.length?users.map(u=>`<tr>
     <td><strong>${esc(u.nome)}</strong><span class="row-sub">${esc(u.email)}</span></td>
     <td>${u.perfil==='master'?'MASTER':'Administradora'}</td>
     <td><span class="status-chip ${u.ativo?'confirmado':'cancelado'}">${u.ativo?'Ativo':'Desativado'}</span></td>
     <td>${u.perfil==='master'?'<span class="row-sub">Protegido</span>':`<button class="action-inline" type="button" data-toggle-user="${esc(u.id)}">${u.ativo?'Desativar':'Reativar'}</button>`}</td></tr>`).join(''):'<tr><td colspan="4">Nenhum usuário encontrado.</td></tr>';
  tbody.querySelectorAll('[data-toggle-user]').forEach(btn=>btn.addEventListener('click',async()=>{
    const u=users.find(x=>x.id===btn.dataset.toggleUser);if(!u)return;
    const active=!u.ativo;if(!confirm(`${active?'Reativar':'Desativar'} acesso de ${u.nome}?`))return;
    btn.disabled=true;try{await rpc('jlb_master_alterar_acesso',{p_user_id:u.id,p_ativo:active},true);await refresh();showMessage('Permissão atualizada.')}catch(e){showMessage(e.message,true);btn.disabled=false}
  }));
}
async function checkRole(){
  if(!getToken())return;try{await refresh()}catch(e){holder.hidden=true;nav.hidden=true;
  // Erro de MASTER é esperado para administradoras; não mostrar lista.
  if(!/MASTER|permiss|autoriz/i.test(e.message))console.warn('Gestão de usuários:',e.message);
  }
}
$('#inviteUserForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const name=$('#inviteName').value.trim(),email=$('#inviteEmail').value.trim().toLowerCase(),button=$('#inviteButton');
  if(name.length<3||!/^\S+@\S+\.\S+$/.test(email)){showMessage('Confira nome e e-mail.',true);return}
  button.disabled=true;showMessage('Enviando convite...');
  try{
    const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/jlb-convidar-usuario',{
      method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey,'Authorization':'Bearer '+getToken()},
      body:JSON.stringify({nome:name,email}),cache:'no-store'
    });
    const payload=await response.json();
    if(!response.ok)throw Error(payload.error||payload.detail||'Falha ao enviar convite.');
    showMessage(payload.message||'Convite enviado.');$('#inviteUserForm').reset();await refresh();
  }catch(err){showMessage(err.message,true)}finally{button.disabled=false}
});
// aguarda load() do painel após login sem modificar as funções existentes.
const dashboard=$('#dashboard');
const observer=new MutationObserver(()=>{if(!dashboard.hidden){checkRole()}});
observer.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)checkRole();
$('#logoutBtn').addEventListener('click',()=>{holder.hidden=true;nav.hidden=true;tbody.textContent='';users=[]});
})();
