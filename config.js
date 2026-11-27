/* Jenniffer Loanda Beauty — configuração pública existente + roteamento seguro V1.3.
 * Apenas a publishable key pode ficar no navegador. NUNCA inserir service_role. */
window.JLB_CONFIG = Object.freeze({
  supabaseUrl: 'https://fgpzfanglxeotiqglwcz.supabase.co',
  supabasePublishableKey: 'sb_publishable_Xk3t-DbOoWEcqIMY4DNblw_4hnSwJtW',
  demoMode: false,
  instagram: 'https://www.instagram.com/jennifferloanda/',
  whatsapp: '',
  businessName: 'Jenniffer Loanda Beauty',
  city: 'Contagem, MG',
  bookingDaysAhead: 45,
  creator: 'https://wendellsoares.jor.br'
});
/* Intercepta a atribuição de window.JLB feita por shared.js. Portanto não é
 * necessário modificar shared.js ou admin.js. No backend, jlb_v13_call
 * valida cada operação antes de executar a RPC administrativa antiga. */
(function(){
  'use strict';
  let attached=false;
  Object.defineProperty(window,'JLB',{
    configurable:true,
    enumerable:true,
    get(){return undefined},
    set(api){
      if(!api || typeof api.rpc!=='function'){
        Object.defineProperty(window,'JLB',{value:api,writable:true,configurable:true,enumerable:true});
        return;
      }
      const original=api.rpc;
      api.rpc=function(name,payload={},admin=false){
        if(admin && name==='jlb_admin_status' && payload && payload.p_status==='cancelado'){
          return original('jlb_v19_cancelar_painel',{p_id:payload.p_id},true);
        }
        if(admin && /^jlb_admin_[a-z0-9_]+$/.test(name)){
          return original('jlb_v13_call',{p_name:name,p_args:payload},true);
        }
        if(!admin && name==='jlb_agendar'){
          const code=document.getElementById('jlbCupom')?.value?.trim().toUpperCase();
          if(code) return original('jlb_v14_agendar_cupom',{p_codigo:code,p_args:payload},false);
        }
        if(!admin && name==='jlb_cancelar'){
          return original('jlb_v14_cancelar_com_cupom',{p_token:payload.p_token},false);
        }
        return original(name,payload,admin);
      };
      attached=true;
      Object.defineProperty(window,'JLB',{value:api,writable:true,configurable:true,enumerable:true});
    }
  });
  window.JLB_V13_CHECK=()=>attached;
})();

/* Carrega o módulo V1.4 somente nas páginas necessárias. */
document.addEventListener('DOMContentLoaded',()=>{
  if(!document.getElementById('dashboard')&&!document.getElementById('clientForm'))return;
  const script=document.createElement('script');
  script.src='vip-cupons.js?v=20261127-1';
  script.defer=true;
  document.body.appendChild(script);
});

/* V1.5: painel Noivas e Eventos, isolado do fluxo de reservas. */
document.addEventListener('DOMContentLoaded',()=>{
  if(!document.getElementById('dashboard'))return;
  const script=document.createElement('script');
  script.src='noivas-eventos.js?v=20261127-1';
  script.async=false;
  document.body.appendChild(script);
});


/* V1.9: finalização editorial, política de privacidade e rodapés. */
document.addEventListener('DOMContentLoaded',()=>{
  const finalScript=document.createElement('script');
  finalScript.src='finalizacao.js?v=20261127-19';
  finalScript.async=false;
  document.body.appendChild(finalScript);
});
