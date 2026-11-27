-- JENNIFFER LOANDA BEAUTY V1.1 | Execute apenas se o banco já foi configurado com a versão anterior.
-- Atualiza a consulta privada para retornar a duração real da reserva em minutos,
-- necessária para o botão "Adicionar ao calendário" na página Minha reserva.
-- Não altera reservas, horários, clientes ou a função de agendamento.

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
