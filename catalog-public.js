/* Catálogo dinâmico V1.2: alterações do painel refletem na vitrine, sem redesenhar o hero. */
(async()=>{'use strict';
const root=document.querySelector('#liveCatalog'),list=document.querySelector('#liveCatalogItems');if(!root||!list)return;
const {rpc,esc}=window.JLB;
try{const data=await rpc('jlb_catalogo');const services=(data.services||[]).filter(s=>s.active!==false);
 if(!services.length)return;
 const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 list.innerHTML=services.map(s=>`<a class="live-catalog-item" href="agendar.html?servico=${encodeURIComponent(s.id)}"><span><small>${esc(({servico:'SERVIÇO',pacote:'COMBO / PACOTE',curso:'CURSO / AULA'})[s.category]||'SERVIÇO')}</small><strong>${esc(s.name)}</strong></span><span><small>${Number(s.duration)} MIN</small><b>${esc(s.price_cents==null?'Sob consulta':(s.price_type==='apartir'?'A partir de ':'')+brl(s.price_cents))} ↗</b></span></a>`).join('');
 // Se um serviço em destaque foi desativado, desabilita também seu atalho estático.
 for(const a of document.querySelectorAll('.service-card a[href*="servico="]')){
  const id=new URL(a.href,location.href).searchParams.get('servico');
  if(!services.some(s=>s.id===id)){a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.textContent='Temporariamente indisponível';}
 }
 root.hidden=false;
}catch{/* Mantém a apresentação estática e a navegação se a API não estiver disponível. */}
})();
