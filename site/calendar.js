/* Jenniffer Loanda Beauty · lembrete de calendário, sem envio de dados privados de reserva. */
window.JLB_CALENDAR = (() => {
  'use strict';
  const ZONE='America/Sao_Paulo';
  const pad=n=>String(n).padStart(2,'0');
  const validator=e=>Boolean(e && /^\d{4}-\d\d-\d\d$/.test(e.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time) && Number.isInteger(e.duration) && e.duration>=1 && e.duration<=1440 && e.service);

  // Converte o horário local de Contagem em UTC, respeitando o fuso e regras da data escolhida.
  function localToUtc(date,time){
    const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
    const target=Date.UTC(year,month-1,day,hour,minute);
    let utc=target;
    const formatter=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    for(let i=0;i<3;i++){
      const parts=Object.fromEntries(formatter.formatToParts(new Date(utc)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
      const zonedMs=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
      utc += target-zonedMs;
    }
    return new Date(utc);
  }
  function isoCalendar(date){return date.toISOString().slice(0,19).replace(/[-:]/g,'')+'Z'}
  function eventValues(e){
    if(!validator(e))throw new Error('Informações incompletas para criar o lembrete.');
    const start=localToUtc(e.date,e.time);
    const end=new Date(start.getTime()+e.duration*60000);
    const summary=`${e.service} — Jenniffer Loanda Beauty`;
    const description=`Reserva ${e.code||''} com Jenniffer Loanda Beauty. Duração: ${e.duration} minutos. Para dúvidas, alterações ou confirmação do local, consulte @jennifferloanda no Instagram. O evento no calendário não é atualizado automaticamente.`;
    const place=e.location==='externo'?'Local do evento (a confirmar)':'Contagem, MG — endereço a confirmar';
    return {start,end,summary,description,place};
  }
  function googleUrl(e){
    const v=eventValues(e);
    const params=new URLSearchParams({action:'TEMPLATE',text:v.summary,dates:isoCalendar(v.start)+'/'+isoCalendar(v.end),ctz:ZONE,details:v.description,location:v.place});
    return 'https://calendar.google.com/calendar/render?'+params.toString();
  }
  function escapedICS(value){return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
  function icsContent(e){
    const v=eventValues(e),uid=String(e.code||e.date+'-'+e.time).replace(/[^A-Za-z0-9-]/g,'');
    const lines=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Jenniffer Loanda Beauty//Agendamentos//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'BEGIN:VEVENT',`UID:JLB-${uid}@jennifferloanda.invalid`,`DTSTAMP:${isoCalendar(new Date())}`,
      `DTSTART:${isoCalendar(v.start)}`,`DTEND:${isoCalendar(v.end)}`,
      `SUMMARY:${escapedICS(v.summary)}`,`DESCRIPTION:${escapedICS(v.description)}`,`LOCATION:${escapedICS(v.place)}`,
      'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'
    ];
    // RFC 5545: quebras CRLF; dobra linhas longas por octets, não por caracteres.
    const folded=[];
    for(const line of lines){
      let current='',bytes=0;
      for(const character of line){
        const length=new TextEncoder().encode(character).length;
        if(bytes+length>75){folded.push(current);current=' ';bytes=1;}
        current+=character;bytes+=length;
      }
      folded.push(current);
    }
    return folded.join('\r\n')+'\r\n';
  }
  function downloadIcs(e){
    const filename=`Jenniffer-Loanda-${e.date}-${e.time.replace(':','')}.ics`;
    const blob=new Blob([icsContent(e)],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.hidden=true;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function mount(container,e){
    if(!container)return;
    if(!validator(e)){container.innerHTML='';container.hidden=true;return;}
    container.innerHTML='<h3>Leve seu horário para a agenda</h3><p>Adicione este atendimento à sua agenda para não esquecer o compromisso.</p><div class="calendar-links"><a data-calendar-google target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda ↗</a><button data-calendar-device type="button">Adicionar ao calendário do celular ↓</button></div><span class="calendar-note"></span>';
    const google=container.querySelector('[data-calendar-google]');
    google.href=googleUrl(e);
    container.querySelector('[data-calendar-device]').addEventListener('click',()=>downloadIcs(e));
    container.querySelector('.calendar-note').textContent=e.demo?'Demonstração: este lembrete não representa uma reserva real. O Google Agenda solicita que você salve o evento; no celular, abra o arquivo .ics.':'O Google Agenda solicita que você salve o evento. No celular, abra o arquivo .ics. Se a reserva mudar ou for cancelada, atualize seu calendário manualmente.';
    container.hidden=false;
  }
  return {mount,googleUrl,icsContent,localToUtc};
})();
