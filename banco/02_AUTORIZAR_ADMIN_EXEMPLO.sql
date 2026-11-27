-- PASSO 2, SOMENTE APÓS CRIAR O USUÁRIO PELO DASHBOARD SUPABASE:
-- Authentication > Users > Add user. Confirme o email e habilite senha.
-- Substitua EMAIL_DA_ADMIN@EXEMPLO.COM pelo e-mail real da profissional.
-- Não execute com o endereço de exemplo, ele não terá correspondência.

insert into jlb.administradores(user_id)
select id from auth.users where email = 'EMAIL_DA_ADMIN@EXEMPLO.COM'
on conflict (user_id) do nothing;

-- A consulta deve retornar 1 linha com o email correto.
select a.user_id, u.email
from jlb.administradores a join auth.users u on u.id=a.user_id;
