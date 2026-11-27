window.JLB = (() => {
  const cfg=window.JLB_CONFIG || {};
  const connected=Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey);
  const demo=!connected&&cfg.demoMode===true;
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const addDays=(iso,days)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const dateLabel=(iso)=>new Date(iso+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'});
  const weekLabel=(iso)=>new Date(iso+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'short',timeZone:'UTC'}).replace('.','').toUpperCase();
  const isoWeek=(iso)=>new Date(iso+'T12:00:00Z').getUTCDay();
  const demoCatalog={
    today:localDate(),max_days:45,
    services:[
      {id:'maquiagem-social',name:'Maquiagem social',duration:75,active:true,price_cents:null},
      {id:'maquiagem-noiva',name:'Maquiagem para noiva',duration:110,active:true,price_cents:null},
      {id:'penteado-social',name:'Penteado para eventos',duration:75,active:true,price_cents:null},
      {id:'penteado-noiva',name:'Penteado para noiva',duration:90,active:true,price_cents:null},
      {id:'combo-social',name:'Maquiagem + penteado',duration:140,active:true,price_cents:null},
      {id:'producao-noiva',name:'Produção completa para noiva',duration:180,active:true,price_cents:null},
      {id:'aula-automaquiagem',name:'Aula de automaquiagem',duration:120,active:true,price_cents:null},
      {id:'aula-penteados',name:'Aula de penteados',duration:120,active:true,price_cents:null}
    ], professionals:[{id:'jenniffer',name:'Jenniffer Loanda'}]
  };
  function lsget(k,defaultValue){try{return JSON.parse(localStorage.getItem('jlb_demo_'+k))??defaultValue}catch{return defaultValue}}
  function lsset(k,v){localStorage.setItem('jlb_demo_'+k,JSON.stringify(v))}
  function services(){return lsget('services',demoCatalog.services)};
  function slotsFor(date,serviceId){
    const day=isoWeek(date);const hours=lsget('hours',[1,2,3,4,5,6].map(d=>({dow:d,start:'09:00',end:'18:00',enabled:true})));
    const h=hours.find(x=>x.dow===day);if(!h?.enabled)return [];
    const startAt=Number(h.start.slice(0,2))*60+Number(h.start.slice(3));
    const endAt=Number(h.end.slice(0,2))*60+Number(h.end.slice(3));
    const service=services().find(s=>s.id===serviceId),dur=service?.duration||90;
    const blocks=lsget('blocks',[]);const all=lsget('bookings',[]);
    const result=[];for(let t=startAt;t+dur<=endAt;t+=30){
      const from=new Date(date+'T00:00:00-03:00').getTime()+t*60000;
      const to=from+dur*60000;
      if(date===localDate() && from<Date.now()+30*60000)continue;
      if(blocks.some(b=>b.date===date))continue;
      if(all.some(b=>b.status==='confirmado'&&b.date===date&&from<new Date(b.date+'T00:00:00-03:00').getTime()+b.minsStart*60000+b.duration*60000&&to>new Date(b.date+'T00:00:00-03:00').getTime()+b.minsStart*60000))continue;
      result.push(String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'));
    }return result;
  }
  function demoApi(name,p={}){
    if(name==='jlb_catalogo')return Promise.resolve({...demoCatalog,today:localDate(),services:services()});
    if(name==='jlb_disponibilidade')return Promise.resolve(slotsFor(p.p_data,p.p_servico_id).map(hora=>({hora})));
    if(name==='jlb_agendar'){
      if(!p.p_nome||p.p_nome.trim().length<3||p.p_whatsapp.replace(/\D/g,'').length<10)return Promise.reject(Error('Confira nome e WhatsApp.'));
      const valid=slotsFor(p.p_data,p.p_servico_id).includes(p.p_hora);if(!valid)return Promise.reject(Error('O horário não está disponível.'));
      const token=crypto.randomUUID(),id=crypto.randomUUID(),serv=services().find(s=>s.id===p.p_servico_id);
      const start=Number(p.p_hora.slice(0,2))*60+Number(p.p_hora.slice(3));
      const status=p.p_modalidade==='externo'?'pendente':'confirmado';
      const booking={id,token,code:id.slice(0,8).toUpperCase(),service:serv.name,serviceId:serv.id,professional:'Jenniffer Loanda',date:p.p_data,time:p.p_hora,clientName:p.p_nome,phone:p.p_whatsapp,email:p.p_email,notes:p.p_observacoes,location:p.p_modalidade,address:p.p_endereco||'',status,duration:serv.duration,minsStart:start};
      const list=lsget('bookings',[]);list.push(booking);lsset('bookings',list);
      return Promise.resolve({id,token,code:booking.code,service:booking.service,professional:'Jenniffer Loanda',status});
    }
    if(name==='jlb_consultar'){const b=lsget('bookings',[]).find(x=>x.token===p.p_token);return Promise.resolve(b?{code:b.code,service:b.service,professional:b.professional,date:b.date,time:b.time,status:b.status,location:b.location,duration:b.duration,can_cancel:['confirmado','pendente'].includes(b.status)&&b.date>=localDate()}:null)}
    if(name==='jlb_cancelar'){const list=lsget('bookings',[]),b=list.find(x=>x.token===p.p_token);if(!b||!['confirmado','pendente'].includes(b.status))return Promise.resolve(false);b.status='cancelado';lsset('bookings',list);return Promise.resolve(true)}
    if(name==='jlb_admin_painel'){return Promise.resolve({bookings:lsget('bookings',[]),services:services(),hours:lsget('hours',[1,2,3,4,5,6].map(d=>({dow:d,start:'09:00',end:'18:00',enabled:true}))),blocks:lsget('blocks',[])})}
    if(name==='jlb_admin_status'){const list=lsget('bookings',[]);const b=list.find(x=>x.id===p.p_id);if(!b)throw Error('Reserva não encontrada');b.status=p.p_status;lsset('bookings',list);return Promise.resolve(true)}
    if(name==='jlb_admin_bloquear'){const list=lsget('blocks',[]);list.push({id:crypto.randomUUID(),date:p.p_data,reason:p.p_motivo||'Indisponível'});lsset('blocks',list);return Promise.resolve(true)}
    if(name==='jlb_admin_desbloquear'){lsset('blocks',lsget('blocks',[]).filter(x=>x.id!==p.p_id));return Promise.resolve(true)}
    if(name==='jlb_admin_servico'){const list=services(),s=list.find(x=>x.id===p.p_id);if(!s)throw Error('Serviço não encontrado');s.duration=p.p_duracao;s.active=p.p_ativo;lsset('services',list);return Promise.resolve(true)}
    if(name==='jlb_admin_horario'){const hours=lsget('hours',[1,2,3,4,5,6].map(d=>({dow:d,start:'09:00',end:'18:00',enabled:true})));const update={dow:p.p_dow,start:p.p_inicio,end:p.p_fim,enabled:p.p_ativo};const index=hours.findIndex(x=>x.dow===update.dow);if(index>=0)hours[index]=update;else hours.push(update);lsset('hours',hours);return Promise.resolve(true)}
    return Promise.reject(Error('Operação desconhecida no modo demonstração'));
  }
  let authToken=sessionStorage.getItem('jlb_admin_access')||'';
  async function rpc(name,data={},admin=false){
    if(demo)return demoApi(name,data);
    if(!connected)throw Error('A agenda ainda não foi ativada. Entre em contato pelo Instagram.');
    const url=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/rpc/'+name;
    const response=await fetch(url,{method:'POST',headers:{'apikey':cfg.supabasePublishableKey,'Content-Type':'application/json','Accept':'application/json',...(admin?{'Authorization':'Bearer '+authToken}:{})},body:JSON.stringify(data),cache:'no-store'});
    let payload;try{payload=await response.json()}catch{payload=null};if(!response.ok)throw Error(payload?.message||payload?.hint||'Não foi possível completar a operação.');return payload;
  }
  async function login(email,password){if(demo)return true;if(!connected)throw Error('Banco ainda não configurado');const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':cfg.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await response.json();if(!response.ok)throw Error(d?.error_description||d?.msg||'Login inválido');authToken=d.access_token;sessionStorage.setItem('jlb_admin_access',authToken);return true}
  const logout=()=>{authToken='';sessionStorage.removeItem('jlb_admin_access')};
  document.addEventListener('DOMContentLoaded',()=>{ $$('.menu-toggle').forEach(btn=>btn.addEventListener('click',()=>{const nav=$('#mainNav');if(!nav)return;nav.classList.toggle('open');btn.setAttribute('aria-expanded',String(nav.classList.contains('open')))})); $$('.nav a').forEach(a=>a.addEventListener('click',()=>{$('#mainNav')?.classList.remove('open')}));$$('[data-year]').forEach(x=>x.textContent=new Date().getFullYear());const demoBanner=$('#demoBanner');if(demoBanner){demoBanner.hidden=!demo;demoBanner.textContent='MODO DE DEMONSTRAÇÃO: reservas e alterações ficam apenas neste navegador. Nenhuma reserva real é enviada ou confirmada.'}});
  return {cfg,connected,demo,$,$$,esc,localDate,addDays,dateLabel,weekLabel,isoWeek,rpc,login,logout,getToken:()=>authToken,services};
})();
