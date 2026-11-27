/* Jenniffer Loanda Beauty V1.4 — complementar, sem alterar painel V1.3 */
(()=>{'use strict';
const api=window.JLB;if(!api||api.demo)return;
const {rpc,esc}=api;
const $=s=>document.querySelector(s);
const ownDate=()=>api.localDate();
function message(id,txt,bad=false){const el=$('#'+id);if(!el)return;el.textContent=txt;el.hidden=false;el.classList.toggle('error',bad);el.classList.toggle('success',!bad)}

if(document.getElementById('clientForm')){
 const couponStyle=document.createElement('style');
 couponStyle.textContent='.jlb-coupon-entry{display:flex;gap:8px;align-items:center}.jlb-coupon-entry input{flex:1;min-width:100px;border-radius:9px}.jlb-coupon-entry button{white-space:nowrap;border-radius:9px}.field.full #jlbPublicCupomInfo{margin:8px 0 0;font-size:12px}';
 document.head.appendChild(couponStyle);
 const grid=$('#clientForm .form-grid');if(!grid)return;
 const field=document.createElement('div');field.className='field full';field.innerHTML=`<label for="jlbCupom">Cupom promocional (opcional)</label><div class="jlb-coupon-entry"><input id="jlbCupom" maxlength="30" autocomplete="off" placeholder="Digite o código do cupom"><button type="button" class="mini-btn" id="jlbValidarCupom">Validar</button></div><p id="jlbPublicCupomInfo" class="small-note" role="status">O desconto é validado e registrado ao concluir o agendamento; nenhum pagamento é realizado neste site.</p>`;
 grid.appendChild(field);
 const code=$('#jlbCupom');code.addEventListener('input',()=>{code.value=code.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'');$('#jlbPublicCupomInfo').textContent='Cupom informado; valide com seu WhatsApp antes de concluir.'});
 $('#jlbValidarCupom').addEventListener('click',async()=>{
  const button=$('#jlbValidarCupom');if(!code.value.trim()){message('jlbPublicCupomInfo','Informe um cupom.',true);return}
  button.disabled=true;try{const r=await rpc('jlb_v14_validar_cupom',{p_codigo:code.value.trim(),p_telefone:$('#clientPhone').value});
   const discount=r.valido?` (${r.tipo==='percentual'?r.valor+'%':(r.valor/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})})`:'';
   message('jlbPublicCupomInfo',(r.mensagem||'Cupom verificado')+discount,!r.valido);
  }catch(e){message('jlbPublicCupomInfo',e.message,true)}finally{button.disabled=false}
 });
 const success=$('#confirmationInfo');if(success){const ob=new MutationObserver(()=>{
   if(success.children.length && code.value.trim() && !$('#jlbPromoConfirmado')){
     const label=document.createElement('p');label.id='jlbPromoConfirmado';label.className='small-note';label.textContent='Cupom '+code.value.trim()+' registrado com sua reserva. Desconto sujeito ao preço do serviço e à confirmação do atendimento.';
     success.after(label);ob.disconnect();
   }
 });ob.observe(success,{childList:true});}
 return;
}

const dashboard=$('#dashboard');if(!dashboard||!$('#loginForm'))return;
const nav=dashboard.querySelector('.admin-section-nav');
const section=document.createElement('section');section.className='admin-card';section.id='vip-cupons-admin';section.hidden=true;
section.innerHTML=`
  <div class="section-label">09 · RELACIONAMENTO E PROMOÇÕES</div><h2>Clientes VIP e cupons</h2>
  <p class="admin-note">Benefícios VIP e descontos cadastrados pela equipe autorizada. Os cupons são validados pelo banco e podem ser limitados por cliente.</p>
  <div class="jlb-v14-grid">
   <div><h3>Cliente VIP</h3><form id="jlbVipForm" class="panel-form">
    <div class="form-grid"><label>Cliente<select id="jlbVipCliente" required></select></label>
    <label>Categoria<select id="jlbVipCategoria"><option value="vip">VIP</option><option value="especial">Especial</option><option value="premium">Premium</option></select></label>
    <label class="full">Benefícios e observações<textarea id="jlbVipBeneficios" maxlength="600" rows="3" placeholder="Descreva benefícios aprovados"></textarea></label></div>
    <label class="jlb-v14-ck"><input type="checkbox" id="jlbVipAtivo" checked> Cadastro ativo</label>
    <div class="panel-actions"><button type="submit" class="mini-btn">Salvar VIP</button><button type="button" class="mini-btn subtle" id="jlbVipLimpar">Limpar</button></div>
   </form><p class="notice" id="jlbVipMsg" role="status" hidden></p></div>
   <div><h3>Cupom promocional</h3><form id="jlbCupomForm" class="panel-form">
    <div class="form-grid"><label>Código<input id="jlbCupomCodigo" maxlength="30" placeholder="EX: BELEZA10" required></label>
     <label>Tipo<select id="jlbCupomTipo"><option value="percentual">Porcentagem (%)</option><option value="fixo">Valor fixo (R$)</option></select></label>
     <label>Desconto<input id="jlbCupomValor" inputmode="decimal" placeholder="Ex.: 10 ou 25,00" required></label>
     <label>Validade<input id="jlbCupomValidade" type="date" required></label>
     <label>Usos totais<input id="jlbCupomLimite" type="number" min="1" max="10000" value="100" required></label>
     <label>Usos por WhatsApp<input id="jlbCupomPorCliente" type="number" min="1" max="100" value="1" required></label>
     <label class="full">Cupom exclusivo (opcional)<select id="jlbCupomCliente"></select></label>
    </div><label class="jlb-v14-ck"><input type="checkbox" id="jlbCupomAtivo" checked> Cupom ativo</label>
    <div class="panel-actions"><button type="submit" class="mini-btn">Salvar cupom</button><button type="button" class="mini-btn subtle" id="jlbCupomLimpar">Limpar</button></div>
   </form><p class="notice" id="jlbCupomMsg" role="status" hidden></p></div>
  </div>
  <h3>Clientes VIP</h3><div class="table-wrap"><table class="admin-table"><thead><tr><th>Cliente</th><th>Categoria</th><th>Benefícios</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="jlbVipsRows"></tbody></table></div>
  <h3>Cupons cadastrados</h3><div class="table-wrap"><table class="admin-table"><thead><tr><th>Código</th><th>Desconto</th><th>Validade</th><th>Usos</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="jlbCuponsRows"></tbody></table></div>
  <p class="small-note">Não existe pagamento online. Desconto é registrado na reserva e o valor final deve ser confirmado pela profissional. Excluir cupom utilizado apenas o desativa para preservar o histórico.</p>`;
dashboard.appendChild(section);
if(nav){const link=document.createElement('a');link.href='#vip-cupons-admin';link.id='jlbVipNav';link.textContent='VIP e cupons';link.hidden=true;nav.appendChild(link)}
const style=document.createElement('style');style.textContent=`
#vip-cupons-admin .jlb-v14-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:20px 0}
#vip-cupons-admin .jlb-v14-grid>div{min-width:0}
#vip-cupons-admin .jlb-v14-ck{display:flex;align-items:center;gap:9px;margin:12px 0}
#vip-cupons-admin .admin-table{margin-bottom:20px}
#vip-cupons-admin input,#vip-cupons-admin select,#vip-cupons-admin textarea{border-radius:9px}
.jlb-coupon-entry{display:flex;gap:8px;align-items:center}.jlb-coupon-entry input{flex:1;min-width:100px;border-radius:9px}.jlb-coupon-entry button{white-space:nowrap;border-radius:9px}
@media(max-width:840px){#vip-cupons-admin .jlb-v14-grid{grid-template-columns:1fr}}
`;document.head.appendChild(style);
let clients=[],vips=[],coupons=[];let loading=false,role='';
const clientName=id=>(clients.find(c=>String(c.id)===String(id))||{}).name||'Cliente do histórico';
const val=id=>$(id).value;
const labelCoupon=c=>c.tipo==='percentual'?c.valor+'%':(c.valor/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function vipClear(){$('#jlbVipForm').reset();$('#jlbVipAtivo').checked=true}
function cupClear(){$('#jlbCupomForm').reset();$('#jlbCupomLimite').value=100;$('#jlbCupomPorCliente').value=1;$('#jlbCupomAtivo').checked=true;$('#jlbCupomValidade').min=ownDate()}
$('#jlbVipLimpar').addEventListener('click',vipClear);$('#jlbCupomLimpar').addEventListener('click',cupClear);
function render(){
 const options='<option value="">Selecione</option>'+clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone||'')}</option>`).join('');
 const vipCurrent=val('#jlbVipCliente'),cpCurrent=val('#jlbCupomCliente');
 $('#jlbVipCliente').innerHTML=options;$('#jlbVipCliente').value=vipCurrent;
 $('#jlbCupomCliente').innerHTML='<option value="">Qualquer cliente</option>'+options.replace('<option value="">Selecione</option>','');$('#jlbCupomCliente').value=cpCurrent;
 $('#jlbVipsRows').innerHTML=vips.length?vips.map(v=>`<tr><td>${esc(clientName(v.cliente_id))}</td><td>${esc(v.categoria)}</td><td>${esc(v.beneficios||'—')}</td><td>${v.ativo?'Ativo':'Inativo'}</td><td><div class="table-actions"><button class="action-inline" data-vip-edit="${esc(v.cliente_id)}">Editar</button><button class="action-inline" data-vip-delete="${esc(v.cliente_id)}">Excluir</button></div></td></tr>`).join(''):'<tr><td colspan="5">Nenhuma cliente VIP cadastrada.</td></tr>';
 $('#jlbCuponsRows').innerHTML=coupons.length?coupons.map(c=>`<tr><td><strong>${esc(c.codigo)}</strong>${c.cliente_id?`<span class="row-sub">Exclusivo: ${esc(clientName(c.cliente_id))}</span>`:''}</td><td>${esc(labelCoupon(c))}</td><td>${esc(c.validade)}</td><td>${c.usos} / ${c.limite_total}</td><td>${c.ativo?'Ativo':'Inativo'}</td><td><div class="table-actions"><button class="action-inline" data-cup-edit="${esc(c.codigo)}">Editar</button><button class="action-inline" data-cup-delete="${esc(c.codigo)}">Excluir</button></div></td></tr>`).join(''):'<tr><td colspan="6">Nenhum cupom cadastrado.</td></tr>';
}
async function refresh(){
 if(loading)return;loading=true;try{
 const [panel,v,c]=await Promise.all([rpc('jlb_admin_painel',{},true),rpc('jlb_v14_lista_vips',{},true),rpc('jlb_v14_lista_cupons',{},true)]);
 clients=Array.isArray(panel.clients)?panel.clients:[];vips=Array.isArray(v)?v:[];coupons=Array.isArray(c)?c:[];render();
 }catch(e){message('jlbVipMsg',e.message,true)}finally{loading=false}
}
async function check(){
 if(dashboard.hidden||!api.getToken())return;
 try{const p=await rpc('jlb_v13_perfil_atual',{},true);role=p?.perfil||''}catch{role=''}
 const allowed=role==='master'||role==='administradora';section.hidden=!allowed;
 if($('#jlbVipNav'))$('#jlbVipNav').hidden=!allowed;
 if(allowed)await refresh();
}
const obs=new MutationObserver(()=>{if(!dashboard.hidden)check();else {section.hidden=true;if($('#jlbVipNav'))$('#jlbVipNav').hidden=true}});
obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)check();
$('#jlbVipForm').addEventListener('submit',async e=>{
 e.preventDefault();try{await rpc('jlb_v14_salvar_vip',{p_cliente_id:val('#jlbVipCliente'),p_categoria:val('#jlbVipCategoria'),p_beneficios:val('#jlbVipBeneficios'),p_ativo:$('#jlbVipAtivo').checked},true);
 message('jlbVipMsg','VIP atualizado.');vipClear();await refresh()}catch(err){message('jlbVipMsg',err.message,true)}
});
$('#jlbCupomForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
 const tipo=val('#jlbCupomTipo');const raw=val('#jlbCupomValor').trim();const amount=tipo==='fixo'?Math.round(Number(raw.replace(/\./g,'').replace(',','.'))*100):Number(raw);
 if(!Number.isInteger(amount)||amount<1)throw Error('Valor de desconto inválido');
 const args={p_codigo:val('#jlbCupomCodigo'),p_tipo:tipo,p_valor:amount,p_validade:val('#jlbCupomValidade'),p_limite_total:Number(val('#jlbCupomLimite')),p_limite_cliente:Number(val('#jlbCupomPorCliente')),p_cliente_id:val('#jlbCupomCliente')||null,p_ativo:$('#jlbCupomAtivo').checked};
 await rpc('jlb_v14_salvar_cupom',args,true);message('jlbCupomMsg','Cupom salvo.');cupClear();await refresh();
 }catch(err){message('jlbCupomMsg',err.message,true)}
});
section.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 const vid=b.dataset.vipEdit,vd=b.dataset.vipDelete,ce=b.dataset.cupEdit,cd=b.dataset.cupDelete;
 if(vid){const v=vips.find(x=>x.cliente_id===vid);if(!v)return;$('#jlbVipCliente').value=v.cliente_id;$('#jlbVipCategoria').value=v.categoria;$('#jlbVipBeneficios').value=v.beneficios;$('#jlbVipAtivo').checked=v.ativo;$('#jlbVipForm').scrollIntoView({behavior:'smooth'});}
 if(ce){const c=coupons.find(x=>x.codigo===ce);if(!c)return;$('#jlbCupomCodigo').value=c.codigo;$('#jlbCupomTipo').value=c.tipo;$('#jlbCupomValor').value=c.tipo==='fixo'?(c.valor/100).toFixed(2).replace('.',','):c.valor;$('#jlbCupomValidade').value=c.validade;$('#jlbCupomLimite').value=c.limite_total;$('#jlbCupomPorCliente').value=c.limite_cliente;$('#jlbCupomCliente').value=c.cliente_id||'';$('#jlbCupomAtivo').checked=c.ativo;$('#jlbCupomForm').scrollIntoView({behavior:'smooth'});}
 if(vd||cd){if(!confirm(`Excluir ${vd?'o cadastro VIP':'o cupom'}? ${cd?'Se houver uso, será desativado para preservar o histórico.':''}`))return;
 b.disabled=true;try{if(vd)await rpc('jlb_v14_excluir_vip',{p_cliente_id:vd},true);else await rpc('jlb_v14_excluir_cupom',{p_codigo:cd},true);
  message(vd?'jlbVipMsg':'jlbCupomMsg','Exclusão concluída.');await refresh();
 }catch(err){message(vd?'jlbVipMsg':'jlbCupomMsg',err.message,true)}finally{b.disabled=false}}
});
})();
