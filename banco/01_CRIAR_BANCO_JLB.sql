-- JENNIFFER LOANDA BEAUTY | Banco próprio e independente
-- Compatível com Supabase/PostgreSQL. Execute SOMENTE em um projeto novo para este site.
-- Jamais execute no banco da Al Capone Barbearia.
-- Tabelas ficam no schema privado jlb e não são expostas pela Data API.
-- Rotas públicas são RPCs limitadas do schema public. Aplique proteção antispam antes de uso intensivo.

create extension if not exists btree_gist;
create schema if not exists jlb;
revoke all on schema jlb from public, anon, authenticated;

create table if not exists jlb.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true
);
create table if not exists jlb.servicos (
  id text primary key,
  nome text not null,
  duracao_minutos integer not null check (duracao_minutos between 15 and 480),
  preco_centavos integer null check (preco_centavos is null or preco_centavos >= 0),
  ativo boolean not null default true,
  ordem integer not null default 99
);
create table if not exists jlb.horarios_semanais (
  dia_semana integer primary key check (dia_semana between 0 and 6),
  inicio time not null default '09:00',
  fim time not null default '18:00',
  ativo boolean not null default false,
  constraint expediente_valido check (inicio < fim)
);
create table if not exists jlb.bloqueios (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  motivo text not null default '',
  criado_em timestamptz not null default now()
);
create table if not exists jlb.reservas (
  id uuid primary key default gen_random_uuid(),
  token_cliente uuid not null unique default gen_random_uuid(),
  profissional_id uuid not null references jlb.profissionais(id),
  servico_id text not null references jlb.servicos(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  cliente_email text,
  observacoes text,
  modalidade text not null check (modalidade in ('espaco','externo')),
  endereco_externo text,
  status text not null default 'confirmado' check (status in ('confirmado','pendente','cancelado','concluido')),
  criado_em timestamptz not null default now(),
  constraint fim_depois_inicio check (fim>inicio)
);
create table if not exists jlb.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adicionado_em timestamptz not null default now()
);

-- Defesa em profundidade; tabelas NÃO têm políticas de leitura pública.
alter table jlb.profissionais enable row level security;
alter table jlb.servicos enable row level security;
alter table jlb.horarios_semanais enable row level security;
alter table jlb.bloqueios enable row level security;
alter table jlb.reservas enable row level security;
alter table jlb.administradores enable row level security;
revoke all on all tables in schema jlb from public, anon, authenticated;

-- Conflitos de reservas confirmadas, inclusive se ocorrerem simultaneamente.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'jlb_sem_sobreposicao') then
    alter table jlb.reservas add constraint jlb_sem_sobreposicao exclude using gist (
      profissional_id with =,
      tstzrange(inicio,fim,'[)') with &&
    ) where (status='confirmado');
  end if;
end $$;

insert into jlb.profissionais(nome,ativo) values ('Jenniffer Loanda',true) on conflict(nome) do nothing;
-- IMPORTANTÍSSIMO: DURAÇÕES SÃO ESTIMATIVAS. CONFIRME E AJUSTE NO PAINEL.
-- Preços ficam NULL (sob consulta), nunca inventados.
insert into jlb.servicos(id,nome,duracao_minutos,preco_centavos,ordem) values
 ('maquiagem-social','Maquiagem social',75,null,1),
 ('maquiagem-noiva','Maquiagem para noiva',110,null,2),
 ('penteado-social','Penteado para eventos',75,null,3),
 ('penteado-noiva','Penteado para noiva',90,null,4),
 ('combo-social','Maquiagem + penteado',140,null,5),
 ('producao-noiva','Produção completa para noiva',180,null,6),
 ('aula-automaquiagem','Aula de automaquiagem',120,null,7),
 ('aula-penteados','Aula de penteados',120,null,8)
on conflict(id) do nothing;
-- Começa FECHADO por segurança: configure a agenda semanal no painel após testar.
insert into jlb.horarios_semanais(dia_semana,inicio,fim,ativo)
select d,'09:00'::time,'18:00'::time,false from generate_series(0,6) d
on conflict(dia_semana) do nothing;

-- Catálogo público: apenas dados comerciais, nenhum dado pessoal.
create or replace function public.jlb_catalogo()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
   'services',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome,'duration',duracao_minutos,'price_cents',preco_centavos,'active',ativo) order by ordem) from jlb.servicos where ativo),'[]'::jsonb),
   'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome)) from jlb.profissionais where ativo),'[]'::jsonb),
   'today',((now() at time zone 'America/Sao_Paulo')::date)::text,
   'max_days',45
 );
$$;

-- Disponibilidade pública: toda validação ocorre novamente ao inserir.
create or replace function public.jlb_disponibilidade(p_servico_id text,p_data date)
returns table(hora text) language plpgsql stable security definer set search_path = '' as $$
declare v_duration integer; v_prof uuid;
begin
 if p_data is null or p_data < (now() at time zone 'America/Sao_Paulo')::date
    or p_data > (now() at time zone 'America/Sao_Paulo')::date+45 then return; end if;
 select s.duracao_minutos into v_duration from jlb.servicos s where s.id=p_servico_id and s.ativo;
 select p.id into v_prof from jlb.profissionais p where p.ativo order by p.nome limit 1;
 if v_duration is null or v_prof is null then return; end if;
 if exists(select 1 from jlb.bloqueios b where b.data=p_data) then return; end if;
 return query
 select to_char(g.hora_local,'HH24:MI') as hora
 from jlb.horarios_semanais h
 cross join lateral generate_series(
   p_data+h.inicio,
   p_data+h.fim-make_interval(mins=>v_duration),
   interval '30 minutes'
 ) g(hora_local)
 where h.ativo and h.dia_semana=extract(dow from p_data)::integer
 and (g.hora_local at time zone 'America/Sao_Paulo') >= now()+interval '2 hours'
 and not exists (
   select 1 from jlb.reservas r where r.status='confirmado' and r.profissional_id=v_prof
   and tstzrange(r.inicio,r.fim,'[)') &&
       tstzrange(g.hora_local at time zone 'America/Sao_Paulo',
       (g.hora_local at time zone 'America/Sao_Paulo')+make_interval(mins=>v_duration),'[)')
 )
 order by 1;
end;
$$;

-- Inserção privada. Externo fica PENDENTE; no espaço confirma de imediato.
create or replace function public.jlb_agendar(
 p_servico_id text,p_data date,p_hora text,p_nome text,p_whatsapp text,
 p_email text default null,p_observacoes text default null,
 p_modalidade text default 'espaco',p_endereco text default null
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_duration integer;v_service text;v_prof uuid;v_prof_name text;
        v_inicio timestamptz;v_id uuid;v_token uuid;v_status text;
begin
 if p_nome is null or length(trim(p_nome))<3 or length(trim(p_nome))>100 then raise exception 'Informe o nome completo.';end if;
 if p_whatsapp is null or length(regexp_replace(p_whatsapp,'[^0-9]','','g')) not between 10 and 13 then raise exception 'WhatsApp com DDD inválido.';end if;
 if p_email is not null and (length(p_email)>150 or (p_email<>'' and p_email not like '%@%.%')) then raise exception 'E-mail inválido.';end if;
 if length(coalesce(p_observacoes,''))>400 or length(coalesce(p_endereco,''))>240 then raise exception 'Observação ou endereço muito longo.';end if;
 if p_modalidade not in ('espaco','externo') then raise exception 'Modalidade inválida.';end if;
 if p_modalidade='externo' and length(trim(coalesce(p_endereco,'')))<5 then raise exception 'Informe a localização do atendimento externo.';end if;
 if p_hora is null or p_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horário inválido.';end if;
 -- Um único expediente e profissional ativo. Lock impede disputas simultâneas.
 perform pg_advisory_xact_lock(hashtext('jlb_agendamento_jenniffer'));
 if not exists(select 1 from public.jlb_disponibilidade(p_servico_id,p_data) d where d.hora=p_hora) then
   raise exception 'Horário indisponível. Atualize a agenda e selecione outro.';
 end if;
 select s.duracao_minutos,s.nome into v_duration,v_service from jlb.servicos s where s.id=p_servico_id and s.ativo;
 select p.id,p.nome into v_prof,v_prof_name from jlb.profissionais p where p.ativo order by p.nome limit 1;
 if v_duration is null or v_prof is null then raise exception 'Serviço não está disponível.'; end if;
 v_inicio:=(p_data+p_hora::time) at time zone 'America/Sao_Paulo';
 v_status:=case when p_modalidade='externo' then 'pendente' else 'confirmado' end;
 insert into jlb.reservas(profissional_id,servico_id,inicio,fim,cliente_nome,cliente_whatsapp,cliente_email,observacoes,modalidade,endereco_externo,status)
 values(v_prof,p_servico_id,v_inicio,v_inicio+make_interval(mins=>v_duration),trim(p_nome),trim(p_whatsapp),nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_observacoes,'')),''),p_modalidade,nullif(trim(coalesce(p_endereco,'')),''),v_status)
 returning id,token_cliente into v_id,v_token;
 return jsonb_build_object('id',v_id,'token',v_token,'code',upper(left(replace(v_id::text,'-',''),8)),'status',v_status,'service',v_service,'professional',v_prof_name);
 exception when exclusion_violation then raise exception 'Horário acabou de ser reservado. Escolha outro.';
end;
$$;

create or replace function public.jlb_consultar(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('code',upper(left(replace(r.id::text,'-',''),8)),
    'service',s.nome,'professional',p.nome,
    'date',to_char(r.inicio at time zone 'America/Sao_Paulo','YYYY-MM-DD'),
    'time',to_char(r.inicio at time zone 'America/Sao_Paulo','HH24:MI'),
    'status',r.status,'location',r.modalidade,
    'duration',extract(epoch from (r.fim-r.inicio))/60,
    'can_cancel',(r.status in ('confirmado','pendente') and r.inicio>now()))
 from jlb.reservas r join jlb.servicos s on s.id=r.servico_id
 join jlb.profissionais p on p.id=r.profissional_id where r.token_cliente=p_token;
$$;

create or replace function public.jlb_cancelar(p_token uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
 update jlb.reservas r set status='cancelado'
 where r.token_cliente=p_token and r.status in ('confirmado','pendente') and r.inicio>now()
 returning r.id into v_id;
 return v_id is not null;
end;
$$;

-- Painel administrativo. SEM acesso para usuários comuns, mesmo autenticados.
create or replace function public.jlb_admin_painel()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores a where a.user_id=auth.uid())
 then raise exception 'Acesso não autorizado ao painel.';end if;
 return jsonb_build_object(
   'bookings',coalesce((select jsonb_agg(jsonb_build_object(
     'id',r.id,'code',upper(left(replace(r.id::text,'-',''),8)),
     'date',to_char(r.inicio at time zone 'America/Sao_Paulo','YYYY-MM-DD'),
     'time',to_char(r.inicio at time zone 'America/Sao_Paulo','HH24:MI'),
     'service',s.nome,'clientName',r.cliente_nome,'phone',r.cliente_whatsapp,
     'email',r.cliente_email,'notes',r.observacoes,'location',r.modalidade,
     'address',r.endereco_externo,'status',r.status) order by r.inicio desc)
     from (select * from jlb.reservas order by inicio desc limit 250) r
     join jlb.servicos s on s.id=r.servico_id),'[]'::jsonb),
   'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome,'duration',s.duracao_minutos,'active',s.ativo,'price_cents',s.preco_centavos) order by s.ordem) from jlb.servicos s),'[]'::jsonb),
   'hours',coalesce((select jsonb_agg(jsonb_build_object('dow',h.dia_semana,'start',to_char(h.inicio,'HH24:MI'),'end',to_char(h.fim,'HH24:MI'),'enabled',h.ativo) order by h.dia_semana) from jlb.horarios_semanais h),'[]'::jsonb),
   'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'date',b.data,'reason',b.motivo) order by b.data desc) from jlb.bloqueios b where b.data>=(now() at time zone 'America/Sao_Paulo')::date),'[]'::jsonb)
 );
end;
$$;

create or replace function public.jlb_admin_status(p_id uuid,p_status text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores where user_id=auth.uid()) then raise exception 'Acesso não autorizado.';end if;
 if p_status not in ('confirmado','pendente','cancelado','concluido') then raise exception 'Situação inválida.';end if;
 update jlb.reservas r set status=p_status where r.id=p_id returning r.id into v_id;
 return v_id is not null;
 exception when exclusion_violation then raise exception 'Não é possível confirmar: existe outra reserva nesse horário.';
end;
$$;

create or replace function public.jlb_admin_horario(p_dow integer,p_inicio time,p_fim time,p_ativo boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores where user_id=auth.uid()) then raise exception 'Acesso não autorizado.';end if;
 if p_dow not between 0 and 6 or p_inicio is null or p_fim is null or p_inicio>=p_fim then raise exception 'Expediente inválido.';end if;
 insert into jlb.horarios_semanais(dia_semana,inicio,fim,ativo) values(p_dow,p_inicio,p_fim,p_ativo)
 on conflict(dia_semana) do update set inicio=excluded.inicio,fim=excluded.fim,ativo=excluded.ativo;
 return true;
end;
$$;

create or replace function public.jlb_admin_servico(p_id text,p_duracao integer,p_ativo boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_id text;
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores where user_id=auth.uid()) then raise exception 'Acesso não autorizado.';end if;
 if p_duracao not between 15 and 480 then raise exception 'Duração inválida.';end if;
 update jlb.servicos set duracao_minutos=p_duracao,ativo=p_ativo where id=p_id returning id into v_id;
 return v_id is not null;
end;
$$;

create or replace function public.jlb_admin_bloquear(p_data date,p_motivo text default '')
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores where user_id=auth.uid()) then raise exception 'Acesso não autorizado.';end if;
 if p_data is null then raise exception 'Informe a data.';end if;
 if length(coalesce(p_motivo,''))>150 then raise exception 'Motivo muito longo.';end if;
 insert into jlb.bloqueios(data,motivo) values(p_data,coalesce(p_motivo,''))
 on conflict(data) do update set motivo=excluded.motivo;
 return true;
end;
$$;

create or replace function public.jlb_admin_desbloquear(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from jlb.administradores where user_id=auth.uid()) then raise exception 'Acesso não autorizado.';end if;
 delete from jlb.bloqueios where id=p_id returning id into v_id;
 return v_id is not null;
end;
$$;

-- Funções são PUBLIC por padrão no PostgreSQL: restringir imediatamente.
revoke all on function public.jlb_catalogo() from public, anon, authenticated;
revoke all on function public.jlb_disponibilidade(text,date) from public, anon, authenticated;
revoke all on function public.jlb_agendar(text,date,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.jlb_consultar(uuid) from public, anon, authenticated;
revoke all on function public.jlb_cancelar(uuid) from public, anon, authenticated;
revoke all on function public.jlb_admin_painel() from public, anon, authenticated;
revoke all on function public.jlb_admin_status(uuid,text) from public, anon, authenticated;
revoke all on function public.jlb_admin_horario(integer,time,time,boolean) from public, anon, authenticated;
revoke all on function public.jlb_admin_servico(text,integer,boolean) from public, anon, authenticated;
revoke all on function public.jlb_admin_bloquear(date,text) from public, anon, authenticated;
revoke all on function public.jlb_admin_desbloquear(uuid) from public, anon, authenticated;
grant execute on function public.jlb_catalogo() to anon, authenticated;
grant execute on function public.jlb_disponibilidade(text,date) to anon, authenticated;
grant execute on function public.jlb_agendar(text,date,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.jlb_consultar(uuid) to anon, authenticated;
grant execute on function public.jlb_cancelar(uuid) to anon, authenticated;
grant execute on function public.jlb_admin_painel() to authenticated;
grant execute on function public.jlb_admin_status(uuid,text) to authenticated;
grant execute on function public.jlb_admin_horario(integer,time,time,boolean) to authenticated;
grant execute on function public.jlb_admin_servico(text,integer,boolean) to authenticated;
grant execute on function public.jlb_admin_bloquear(date,text) to authenticated;
grant execute on function public.jlb_admin_desbloquear(uuid) to authenticated;

select 'Banco Jenniffer Loanda criado. Os horários permanecem FECHADOS até o painel ser configurado.' as resultado;
