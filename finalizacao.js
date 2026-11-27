/* Jenniffer Loanda Beauty — finalização V1.9; sem alterar a identidade visual. */
(()=>{'use strict';
  const page=location.pathname.split('/').pop()||'index.html';
  const footer=document.querySelector('.footer .footer-bottom') || document.querySelector('footer.footer');
  if(footer && !footer.querySelector('[data-jlb-privacy-link]')){
    const a=document.createElement('a');
    a.href='privacidade.html';
    a.textContent='Política de privacidade';
    a.dataset.jlbPrivacyLink='';
    a.style.cssText='font-size:12px;text-decoration:underline;text-underline-offset:3px;';
    footer.appendChild(a);
  }
  const consent=document.querySelector('#clientForm label.consent span');
  if(consent&&!consent.querySelector('a[href="privacidade.html"]')){
    const a=document.createElement('a');
    a.href='privacidade.html';
    a.target='_blank';a.rel='noopener noreferrer';
    a.textContent='Leia a Política de Privacidade';
    a.style.cssText='text-decoration:underline;font-weight:600;';
    consent.appendChild(document.createTextNode(' '));
    consent.appendChild(a);
  }
  if(page==='admin.html'){
    document.title='Painel administrativo | Jenniffer Loanda Beauty';
    const eyebrow=document.querySelector('.app-hero .eyebrow');
    if(eyebrow && /V1\.2\.1/.test(eyebrow.textContent)) eyebrow.textContent='GESTÃO PRIVADA · V1.9';
    const note=document.querySelector('#usuarios-admin > p.admin-note');
    if(note)note.textContent='O MASTER administra os convites e perfis. Permissões de Recepção e Profissional são validadas também no Supabase.';
    const foot=document.querySelector('.footer .footer-bottom > span');
    if(foot && /V1\.2\.1/.test(foot.textContent)) foot.textContent=foot.textContent.replace('V1.2.1','V1.9');
  }
  document.querySelectorAll('[data-year]').forEach(el=>{el.textContent=String(new Date().getFullYear())});
})();
