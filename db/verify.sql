-- Verifica che il database abbia tabelle e colonne che il codice usa davvero.
-- Un deploy con schema vecchio sembra sano finché non si usa la funzione nuova.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/verify.sql
--
-- Esce con errore (e stampa cosa manca) se trova differenze.

do $$
declare
  expected text[] := array[
    'users.password_hash',
    'users.session_version',
    'users.terms_accepted_at',
    'users.two_factor_secret',
    'users.gemini_key',
    'sites.owner_id',
    'sites.published',
    'sites.config',
    'sites.updated_at',
    'leads.site_id',
    'leads.read',
    'leads.consent_at',
    'leads.handled',
    'leads.notes',
    'leads.replied_at',
    'chat_messages.ask',
    'chat_messages.answers',
    'site_views.visitor_id',
    'site_events.label',
    'rate_limits.reset_at',
    'password_resets.token_hash',
    'site_versions.config',
    'ai_usage.prompt_tokens',
    'ai_usage.output_tokens',
    'error_logs.created_at'
  ];
  missing text[];
begin
  select coalesce(array_agg(item order by item), '{}') into missing
  from unnest(expected) as item
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = split_part(item, '.', 1)
      and column_name = split_part(item, '.', 2)
  );

  if array_length(missing, 1) > 0 then
    raise exception 'schema incompleto, manca: %', array_to_string(missing, ', ');
  end if;

  raise notice 'schema verificato: % controlli superati', array_length(expected, 1);
end $$;
