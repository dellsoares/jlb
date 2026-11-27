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
        if(admin && /^jlb_admin_[a-z0-9_]+$/.test(name)){
          return original('jlb_v13_call',{p_name:name,p_args:payload},true);
        }
        return original(name,payload,admin);
      };
      attached=true;
      Object.defineProperty(window,'JLB',{value:api,writable:true,configurable:true,enumerable:true});
    }
  });
  window.JLB_V13_CHECK=()=>attached;
})();
