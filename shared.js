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
  function services(){return lsget('services',demoCatalog.services).map(s=>({description:'',category:(s.id?.startsWith('aula-')?'curso':(s.id?.startsWith('combo-')||s.id==='producao-noiva'?'pacote':'servico')),price_type:s.price_cents==null?'consulta':'fixo',allows_external:true,...s}));}
  const phoneDigits=s=>String(s??'').replace(/\D/g,'');
  const hours=()=>lsget('hours',[1,2,3,4,5,6].map(d=>({dow:d,start:'09:00',end:'18:00',enabled:true})));
  const packages=()=>lsget('packages',[]);
  const defaultMessages=[
   {key:'confirmacao',title:'Confirmação',text:'Olá, {nome}! Sua reserva na Jenniffer Loanda Beauty está confirmada para {data} às {hora}, serviço: {servico}. Código: {codigo}. {link}'},
   {key:'lembrete',title:'Lembrete',text:'Olá, {nome}! Lembrando do seu atendimento de {servico} no dia {data} às {hora}. Qualquer dúvida, pode me chamar!'},
   {key:'remarcacao',title:'Remarcação',text:'Olá, {nome}! Seu horário de {servico} foi ajustado para {data} às {hora}. Se precisar, me chame por aqui.'},
   {key:'cancelamento',title:'Cancelamento',text:'Olá, {nome}. Seu agendamento de {servico} para {data} às {hora} foi cancelado. Podemos conversar sobre uma nova data.'},
   {key:'orientacoes',title:'Orientações antes do atendimento',text:'Olá, {nome}! Para sua produção de {servico} em {data}, podemos alinhar os detalhes e orientações de preparação por aqui.'},
   {key:'pos_evento',title:'Pós-evento',text:'Olá, {nome}! Espero que seu evento tenha sido especial. Obrigada pela confiança no meu trabalho!'},
   {key:'promocao',title:'Campanha personalizada',text:'Olá, {nome}! Tenho uma novidade especial da Jenniffer Loanda Beauty para compartilhar com você.'}
  ];
  function clients(){
    const result=lsget('clients',[]);const bookings=lsget('bookings',[]);
    for(const b of bookings){const phone=phoneDigits(b.phone);if(phone.length<10||result.some(c=>phoneDigits(c.phone)===phone))continue;result.push({id:crypto.randomUUID(),name:b.clientName,phone,email:b.email||null,birthday:null,notes:null,active:true})}
    lsset('clients',result);return result;
  }
  const toMins=s=>Number(s?.slice(0,2))*60+Number(s?.slice(3));
  function isOccupied(date,start,end,skip){return lsget('bookings',[]).some(b=>b.id!==skip&&b.status==='confirmado'&&b.date===date&&start<b.minsStart+b.duration&&end>b.minsStart)}
  function blocked(date,start,end){return lsget('blocks',[]).some(b=>b.date===date)||lsget('partialBlocks',[]).some(b=>b.date===date&&start<toMins(b.end)&&end>toMins(b.start))}
  function restorePackage(b){if(!b.packageId)return;const list=packages(),pkg=list.find(p=>p.id===b.packageId);if(pkg)pkg.used=Math.max(0,pkg.used-1);lsset('packages',list);b.packageId=null;}
  function saveBookings(b){lsset('bookings',b)}

  function slotsFor(date,serviceId){
    const day=isoWeek(date),h=hours().find(x=>Number(x.dow)===day);
    if(!date||!h?.enabled)return [];
    const startAt=toMins(h.start),endAt=toMins(h.end);
    const service=services().find(s=>s.id===serviceId&&s.active!==false);
    if(!service)return [];
    const dur=service.duration,result=[];
    for(let t=startAt;t+dur<=endAt;t+=30){
      const from=new Date(date+'T00:00:00-03:00').getTime()+t*60000;
      if(date===localDate()&&from<Date.now()+30*60000)continue;
      if(blocked(date,t,t+dur)||isOccupied(date,t,t+dur,null))continue;
      result.push(String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'));
    }return result;
  }
  function demoApi(name,p={}){
    if(name==='jlb_catalogo')return Promise.resolve({...demoCatalog,today:localDate(),services:services().filter(s=>s.active!==false)});
    if(name==='jlb_disponibilidade')return Promise.resolve(slotsFor(p.p_data,p.p_servico_id).map(hora=>({hora})));
    if(name==='jlb_agendar'){
      const service=services().find(s=>s.id===p.p_servico_id&&s.active!==false);
      if(!service)return Promise.reject(Error('Serviço indisponível.'));
      if(!p.p_nome||p.p_nome.trim().length<3||phoneDigits(p.p_whatsapp).length<10)return Promise.reject(Error('Confira nome e WhatsApp.'));
      if(!['espaco','externo'].includes(p.p_modalidade)||p.p_modalidade==='externo'&&(!service.allows_external||(p.p_endereco||'').trim().length<5))return Promise.reject(Error('Confira a modalidade e o local de atendimento.'));
      if(!slotsFor(p.p_data,p.p_servico_id).includes(p.p_hora))return Promise.reject(Error('O horário não está disponível.'));
      const token=crypto.randomUUID(),id=crypto.randomUUID(),start=toMins(p.p_hora);
      const status=p.p_modalidade==='externo'?'pendente':'confirmado';
      const booking={id,token,code:id.slice(0,8).toUpperCase(),service:service.name,serviceId:service.id,professional:'Jenniffer Loanda',date:p.p_data,time:p.p_hora,clientName:p.p_nome.trim(),phone:p.p_whatsapp,email:p.p_email||null,notes:p.p_observacoes||null,location:p.p_modalidade,address:p.p_endereco||'',status,duration:service.duration,minsStart:start,packageId:null};
      const list=lsget('bookings',[]);list.push(booking);saveBookings(list);
      clients();
      return Promise.resolve({id,token,code:booking.code,service:booking.service,professional:'Jenniffer Loanda',status});
    }
    if(name==='jlb_consultar'){
      const b=lsget('bookings',[]).find(x=>x.token===p.p_token);
      return Promise.resolve(b?{code:b.code,service:b.service,professional:b.professional,date:b.date,time:b.time,status:b.status,location:b.location,duration:b.duration,can_cancel:['confirmado','pendente'].includes(b.status)&&b.date>=localDate()}:null);
    }
    if(name==='jlb_cancelar'){
      const list=lsget('bookings',[]),b=list.find(x=>x.token===p.p_token);
      if(!b||!['confirmado','pendente'].includes(b.status))return Promise.resolve(false);
      b.status='cancelado';restorePackage(b);saveBookings(list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_painel'){
      const all=lsget('bookings',[]),c=clients();
      const clientRows=c.map(x=>({...x,bookings:all.filter(b=>phoneDigits(b.phone)===phoneDigits(x.phone)).length,
        lastVisit:all.filter(b=>phoneDigits(b.phone)===phoneDigits(x.phone)&&b.status==='concluido').sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||null}));
      const pkg=packages().map(x=>({...x,clientName:c.find(y=>y.id===x.clientId)?.name||'Cliente',clientPhone:c.find(y=>y.id===x.clientId)?.phone||'',service:services().find(y=>y.id===x.serviceId)?.name||null}));
      return Promise.resolve({bookings:all,services:services(),clients:clientRows,packages:pkg,
        hours:hours(),blocks:lsget('blocks',[]),partialBlocks:lsget('partialBlocks',[]),messages:lsget('messages',defaultMessages)});
    }
    if(name==='jlb_admin_status'){
      const list=lsget('bookings',[]),b=list.find(x=>x.id===p.p_id);if(!b)throw Error('Reserva não encontrada.');
      if(!['confirmado','pendente','cancelado','concluido'].includes(p.p_status))throw Error('Situação inválida.');
      if(p.p_status==='confirmado'&&b.status!=='confirmado'&&(isOccupied(b.date,b.minsStart,b.minsStart+b.duration,b.id)||blocked(b.date,b.minsStart,b.minsStart+b.duration)))throw Error('Conflito ou bloqueio no horário.');
      if(p.p_status==='cancelado'&&b.status!=='cancelado')restorePackage(b);
      b.status=p.p_status;saveBookings(list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_bloquear'){
      if(!p.p_data)throw Error('Data obrigatória.');const list=lsget('blocks',[]),old=list.find(b=>b.date===p.p_data);
      if(old)old.reason=p.p_motivo||'';else list.push({id:crypto.randomUUID(),date:p.p_data,reason:p.p_motivo||''});lsset('blocks',list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_desbloquear'){lsset('blocks',lsget('blocks',[]).filter(x=>x.id!==p.p_id));return Promise.resolve(true)}
    if(name==='jlb_admin_bloquear_parcial'){
      if(!p.p_data||!p.p_inicio||!p.p_fim||p.p_inicio>=p.p_fim)throw Error('Intervalo inválido.');
      const list=lsget('partialBlocks',[]),id=crypto.randomUUID();list.push({id,date:p.p_data,start:p.p_inicio,end:p.p_fim,reason:p.p_motivo||''});lsset('partialBlocks',list);return Promise.resolve(id);
    }
    if(name==='jlb_admin_desbloquear_parcial'){lsset('partialBlocks',lsget('partialBlocks',[]).filter(x=>x.id!==p.p_id));return Promise.resolve(true)}
    if(name==='jlb_admin_servico_salvar'){
      const n=String(p.p_nome||'').trim(),dur=Number(p.p_duracao);
      if(n.length<3||n.length>90||dur<15||dur>480||!['servico','pacote','curso'].includes(p.p_categoria)||!['consulta','fixo','apartir'].includes(p.p_preco_tipo))throw Error('Revise o serviço, categoria e duração.');
      if(p.p_preco_tipo!=='consulta'&&(!(p.p_preco_centavos>0)||p.p_preco_centavos>10000000))throw Error('Preço inválido.');
      const list=services(),id=p.p_id||'jlb-'+crypto.randomUUID().slice(0,15),obj={id,name:n,description:p.p_descricao||'',category:p.p_categoria,
        duration:dur,price_type:p.p_preco_tipo,price_cents:p.p_preco_tipo==='consulta'?null:p.p_preco_centavos,
        allows_external:!!p.p_externo,active:!!p.p_ativo};
      const at=list.findIndex(x=>x.id===id);if(at>=0)list[at]={...list[at],...obj};else list.push(obj);lsset('services',list);return Promise.resolve(id);
    }
    if(name==='jlb_admin_servico_excluir'){
      const list=services(),at=list.findIndex(x=>x.id===p.p_id);if(at<0)throw Error('Serviço não encontrado.');
      const used=lsget('bookings',[]).some(b=>b.serviceId===p.p_id)||packages().some(x=>x.serviceId===p.p_id);
      if(used){list[at].active=false;lsset('services',list);return Promise.resolve('desativado')}
      list.splice(at,1);lsset('services',list);return Promise.resolve('excluido');
    }
    if(name==='jlb_admin_servico'){
      const list=services(),item=list.find(x=>x.id===p.p_id);if(!item)throw Error('Serviço não encontrado.');
      item.duration=p.p_duracao;item.active=!!p.p_ativo;lsset('services',list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_cliente_salvar'){
      const phone=phoneDigits(p.p_whatsapp),n=String(p.p_nome||'').trim(),list=clients();
      if(phone.length<10||phone.length>13||n.length<3)throw Error('Nome ou telefone inválido.');
      if(list.some(x=>phoneDigits(x.phone)===phone&&x.id!==p.p_id))throw Error('WhatsApp já cadastrado.');
      const id=p.p_id||crypto.randomUUID(),obj={id,name:n,phone,email:p.p_email||null,birthday:p.p_aniversario||null,notes:p.p_observacoes||null,active:!!p.p_ativo};
      const at=list.findIndex(x=>x.id===id);if(at>=0)list[at]={...list[at],...obj};else list.push(obj);lsset('clients',list);return Promise.resolve(id);
    }
    if(name==='jlb_admin_remarcar'){
      const list=lsget('bookings',[]),b=list.find(x=>x.id===p.p_id);if(!b||['cancelado','concluido'].includes(b.status))throw Error('Reserva não permite remarcação.');
      const t=toMins(p.p_hora),end=t+b.duration,h=hours().find(x=>x.dow===isoWeek(p.p_data));
      if(!p.p_data||p.p_data<localDate()||!h?.enabled||t<toMins(h.start)||end>toMins(h.end))throw Error('Fora do expediente ou data inválida.');
      if(new Date(p.p_data+'T00:00:00-03:00').getTime()+t*60000 <=Date.now())throw Error('Horário no passado.');
      if(blocked(p.p_data,t,end)||isOccupied(p.p_data,t,end,b.id))throw Error('Data bloqueada ou ocupada.');
      b.date=p.p_data;b.time=p.p_hora;b.minsStart=t;saveBookings(list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_pacote_criar'){
      const c=clients().find(x=>x.id===p.p_cliente_id&&x.active);if(!c)throw Error('Cliente não encontrado.');
      const cr=Number(p.p_creditos);if(!Number.isInteger(cr)||cr<1||cr>100||!p.p_compra||!p.p_validade||p.p_compra>p.p_validade)throw Error('Confira créditos e validade.');
      const id=crypto.randomUUID(),list=packages();list.push({id,clientId:c.id,serviceId:p.p_servico_id||null,credits:cr,used:0,value_cents:p.p_valor_centavos??null,purchased:p.p_compra,expires:p.p_validade,notes:p.p_observacoes||'',active:true});lsset('packages',list);return Promise.resolve(id);
    }
    if(name==='jlb_admin_pacote_status'){
      const list=packages(),obj=list.find(x=>x.id===p.p_id);if(!obj)throw Error('Pacote não encontrado.');obj.active=!!p.p_ativo;lsset('packages',list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_pacote_aplicar'){
      const list=packages(),pkg=list.find(x=>x.id===p.p_id),bookings=lsget('bookings',[]),b=bookings.find(x=>x.id===p.p_reserva_id);
      if(!pkg||!pkg.active||pkg.expires<localDate()||pkg.used>=pkg.credits)throw Error('Pacote sem saldo, vencido ou pausado.');
      if(!b||!['confirmado','concluido'].includes(b.status)||b.packageId)throw Error('Reserva indisponível para crédito.');
      const c=clients().find(x=>x.id===pkg.clientId);if(!c||phoneDigits(c.phone)!==phoneDigits(b.phone)||(pkg.serviceId&&pkg.serviceId!==b.serviceId))throw Error('Pacote não corresponde à cliente ou ao serviço.');
      pkg.used++;b.packageId=pkg.id;lsset('packages',list);saveBookings(bookings);return Promise.resolve(true);
    }
    if(name==='jlb_admin_mensagem_salvar'){
      const list=lsget('messages',defaultMessages),x=list.find(m=>m.key===p.p_chave),body=String(p.p_texto||'').trim();
      if(!x||body.length<10||body.length>1200)throw Error('Modelo inválido.');x.text=body;lsset('messages',list);return Promise.resolve(true);
    }
    if(name==='jlb_admin_horario'){
      const list=hours(),obj={dow:Number(p.p_dow),start:p.p_inicio,end:p.p_fim,enabled:!!p.p_ativo},at=list.findIndex(x=>Number(x.dow)===obj.dow);
      if(obj.start>=obj.end)throw Error('Expediente inválido.');if(at>=0)list[at]=obj;else list.push(obj);lsset('hours',list);return Promise.resolve(true);
    }
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
