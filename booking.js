(() => {
'use strict';
const { $, $$, esc, rpc, localDate, addDays, dateLabel, weekLabel, isoWeek }=window.JLB;
let catalog=null,step=1,offset=0,fetchId=0,processing=false;
let selected={service:null,mode:null,date:null,time:null};
const query=new URLSearchParams(location.search);
const msg=(txt)=>{const el=$('#bookingMessage');el.textContent=txt;el.hidden=!txt};
const monthLabel=(date)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
function stateService(){return catalog?.services.find(s=>s.id===selected.service)}
async function init(){
 try{catalog=await rpc('jlb_catalogo');if(!catalog?.services?.length)throw Error('Catálogo ainda não cadastrado.');renderServices();renderDates();const wanted=query.get('servico');if(wanted&&catalog.services.some(s=>s.id===wanted))selectService(wanted);if(query.get('modalidade')==='externo'&&stateService()?.allows_external!==false)selected.mode='externo';renderMode();updateNext()}
 catch(e){msg('A agenda não está disponível: '+e.message);$('#serviceOptions').innerHTML='<p class="empty-note">A agenda online está em configuração. Para consultar horários e serviços, fale diretamente com Jenniffer.</p><p><a class="btn btn-gold" href="https://www.instagram.com/jennifferloanda/" target="_blank" rel="noopener noreferrer">Consultar pelo Instagram ↗</a></p>'}
}
function renderServices(){
 $('#serviceOptions').innerHTML=catalog.services.filter(x=>x.active!==false).map(s=>{
  const category=({servico:'SERVIÇO',pacote:'COMBO / PACOTE',curso:'CURSO / AULA'})[s.category]||'SERVIÇO';
  const price=s.price_cents==null?'VALOR SOB CONSULTA':(s.price_type==='apartir'?'A PARTIR DE ':'')+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(s.price_cents/100);
  return `<button type="button" class="choice ${selected.service===s.id?'selected':''}" data-service="${esc(s.id)}" aria-pressed="${selected.service===s.id}"><span>${esc(s.name)}</span><small>${esc(category)} · ${Number(s.duration)} min</small>${s.description?`<small>${esc(s.description)}</small>`:''}<div class="choice-bottom"><span class="choice-tag">${esc(price)}</span><b>${selected.service===s.id?'✓':'↗'}</b></div></button>`
 }).join('');
 $$('[data-service]').forEach(btn=>btn.addEventListener('click',()=>selectService(btn.dataset.service)));
}
function selectService(id){selected.service=id;selected.time=null;if(stateService()?.allows_external===false&&selected.mode==='externo')selected.mode=null;renderServices();renderMode();updateNext()}
function renderMode(){const allowed=stateService()?.allows_external!==false;
 $$('[data-mode]').forEach(btn=>{const external=btn.dataset.mode==='externo';btn.disabled=external&&!allowed;const active=btn.dataset.mode===selected.mode;btn.classList.toggle('selected',active);btn.setAttribute('aria-pressed',String(active));if(external)btn.title=allowed?'':'Este serviço não permite atendimento externo'});
 const external=selected.mode==='externo';$('#addressBox').hidden=!external;$('#externalNotice').hidden=!external;
}
$$('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;selected.mode=btn.dataset.mode;renderMode();updateNext()}));
function renderDates(){if(!catalog)return;
 const today=catalog.today||localDate();const beginning=addDays(today,offset);$('#monthTitle').textContent=monthLabel(beginning);$('#datePrev').disabled=offset===0;$('#dateNext').disabled=offset+7>=(catalog.max_days||45);
 let html='';for(let i=0;i<7;i++){const date=addDays(beginning,i);const tooFar=date>addDays(today,(catalog.max_days||45));html+=`<button type="button" class="day-pill ${date===selected.date?'selected':''}" data-date="${date}" ${tooFar?'disabled':''} aria-pressed="${date===selected.date}"><small>${weekLabel(date)}</small><strong>${date.slice(-2)}</strong></button>`};$('#daysStrip').innerHTML=html;
 $$('[data-date]').forEach(btn=>btn.addEventListener('click',()=>{selected.date=btn.dataset.date;selected.time=null;renderDates();loadSlots();updateNext()}))
}
$('#datePrev').addEventListener('click',()=>{offset=Math.max(0,offset-7);selected.date=null;selected.time=null;renderDates();$('#slotArea').innerHTML='<p class="empty-note">Escolha uma data para consultar os horários.</p>';updateNext()});
$('#dateNext').addEventListener('click',()=>{offset+=7;selected.date=null;selected.time=null;renderDates();$('#slotArea').innerHTML='<p class="empty-note">Escolha uma data para consultar os horários.</p>';updateNext()});
async function loadSlots(){const seq=++fetchId;if(!selected.date||!selected.service)return;$('#availabilityMeta').textContent=dateLabel(selected.date);$('#slotArea').innerHTML='<p class="empty-note">Consultando disponibilidade...</p>';
 try{const slots=(await rpc('jlb_disponibilidade',{p_servico_id:selected.service,p_data:selected.date})).map(x=>x.hora);if(seq!==fetchId)return;if(!slots.length){$('#slotArea').innerHTML='<p class="empty-note">Não há horários disponíveis nesta data. Experimente outro dia.</p>';return}let out='';for(const [title,list] of [['MANHÃ',slots.filter(x=>x<'12:00')],['TARDE',slots.filter(x=>x>='12:00')]]){if(!list.length)continue;out+=`<div class="period-label">${title}</div><div class="time-buttons">${list.map(s=>`<button type="button" class="time-slot" data-time="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}</div>`};$('#slotArea').innerHTML=out;$$('[data-time]').forEach(btn=>btn.addEventListener('click',()=>{selected.time=btn.dataset.time;$$('[data-time]').forEach(b=>{const yes=b===btn;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))});updateNext()}));}catch(e){if(seq===fetchId)$('#slotArea').innerHTML=`<p class="empty-note">${esc(e.message)}</p>`}
}
function summary(){const serv=stateService();$('#summary').innerHTML=`<div class="summary-row"><span>Serviço</span><strong>${esc(serv.name)}</strong></div><div class="summary-row"><span>Local</span><strong>${selected.mode==='externo'?'Domicílio ou evento':'Espaço de atendimento'}</strong></div><div class="summary-row"><span>Data</span><strong>${dateLabel(selected.date)}</strong></div><div class="summary-row"><span>Horário</span><strong>${esc(selected.time)}</strong></div><div class="summary-row"><span>Duração estimada</span><strong>${serv.duration} min</strong></div><div class="summary-row"><span>Valor</span><strong>${serv.price_cents==null?'Sob consulta':(serv.price_type==='apartir'?'A partir de ':'')+(serv.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>`;
 $('#addressBox').hidden=selected.mode!=='externo';$('#externalNotice').hidden=selected.mode!=='externo';
}
function go(next){step=next;msg('');$$('.wizard-panel').forEach(p=>p.classList.toggle('active',Number(p.dataset.panel)===step));$$('.steps li').forEach(li=>{const n=Number(li.dataset.step);li.classList.toggle('active',n===Math.min(step,4));li.classList.toggle('done',n<Math.min(step,4))});$('#wizardFooter').hidden=step===5;$('#backBtn').hidden=step===1;if(step===2)renderMode();if(step===3){renderDates();if(selected.date)loadSlots()}if(step===4)summary();updateNext();window.scrollTo({top:Math.max(0,$('#bookingShell').getBoundingClientRect().top+window.scrollY-105),behavior:'smooth'})}
function updateNext(){const btn=$('#nextBtn');btn.textContent=step===4?'Concluir agendamento':'Continuar ↗';btn.disabled=processing||(step===1&&!selected.service)||(step===2&&!selected.mode)||(step===3&&!selected.time);$('#wizardHint').textContent=['','Escolha o serviço.','Escolha onde será o atendimento.','Escolha dia e horário.','Confira seus dados.'][step]||'';}
$('#nextBtn').addEventListener('click',()=>{if(step===4){submit();return}if(!$('#nextBtn').disabled)go(step+1)});$('#backBtn').addEventListener('click',()=>go(Math.max(1,step-1)));
$('#clientForm').addEventListener('submit',e=>{e.preventDefault();submit()});
async function submit(){if(processing)return;const name=$('#clientName').value.trim(),phone=$('#clientPhone').value.trim(),email=$('#clientEmail').value.trim(),address=$('#clientAddress').value.trim();if(name.length<3||phone.replace(/\D/g,'').length<10||!$('#consent').checked||(selected.mode==='externo'&&address.length<5)){msg('Informe seu nome, WhatsApp com DDD, endereço para atendimento externo (se aplicável) e autorize o uso dos dados.');return}if(email&& !$('#clientEmail').checkValidity()){msg('Confira o endereço de e-mail.');return}processing=true;updateNext();msg('');try{const payload=await rpc('jlb_agendar',{p_servico_id:selected.service,p_data:selected.date,p_hora:selected.time,p_nome:name,p_whatsapp:phone,p_email:email||null,p_observacoes:$('#clientNotes').value.trim()||null,p_modalidade:selected.mode,p_endereco:address||null});$('#successTitle').textContent=payload.status==='pendente'?'Solicitação recebida!':'Reserva registrada!';$('#successText').textContent=payload.status==='pendente'?'Seu atendimento externo depende da confirmação da Jenniffer.':'Seu horário foi reservado. Guarde o link privado abaixo para consultar ou cancelar.';$('#confirmationInfo').innerHTML=`<div class="summary-row"><span>Código</span><strong>${esc(payload.code)}</strong></div><div class="summary-row"><span>Serviço</span><strong>${esc(payload.service)}</strong></div><div class="summary-row"><span>Data e hora</span><strong>${dateLabel(selected.date)} • ${esc(selected.time)}</strong></div><div class="summary-row"><span>Situação</span><strong>${payload.status==='pendente'?'Aguardando confirmação':'Confirmada'}</strong></div>`;$('#manageLink').href='minha-reserva.html?token='+encodeURIComponent(payload.token);
      window.JLB_CALENDAR.mount($('#calendarActions'), payload.status==='confirmado' ? {
        date:selected.date, time:selected.time, duration:Number(stateService().duration),
        service:payload.service||stateService().name, code:payload.code,
        location:selected.mode, demo:window.JLB.demo
      } : null);
      go(5)}catch(e){msg(e.message);if(step===4)updateNext()}finally{processing=false;updateNext()}}
init();
})();
