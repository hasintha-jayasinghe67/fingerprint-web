-- Run once in the Supabase SQL editor, after the edge function is deployed.
-- Fires expire-leave-excuses at 00:00 Asia/Colombo (18:30 UTC).
-- Sri Lanka does not observe daylight saving.
--
-- Store these two secrets in Vault first (Database → Vault). Do not
-- commit the secret key. create_secret fails if the name already
-- exists; the block below updates an existing secret and creates a
-- missing one.
--
--   do $$
--   begin
--     if exists (select 1 from vault.secrets where name = 'project_url') then
--       perform vault.update_secret(
--         (select id from vault.secrets where name = 'project_url'),
--         'https://PROJECT_REF.supabase.co'
--       );
--     else
--       perform vault.create_secret('https://PROJECT_REF.supabase.co', 'project_url');
--     end if;
--
--     if exists (select 1 from vault.secrets where name = 'secret_key') then
--       perform vault.update_secret(
--         (select id from vault.secrets where name = 'secret_key'),
--         'YOUR_SUPABASE_SECRET_KEY'
--       );
--     else
--       perform vault.create_secret('YOUR_SUPABASE_SECRET_KEY', 'secret_key');
--     end if;
--   end $$;
--
-- The secret key is the service_role key. The function rejects any
-- other caller.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing bigint;
begin
  select jobid into existing
  from cron.job
  where jobname = 'expire-leave-excuses';
  if existing is not null then
    perform cron.unschedule(existing);
  end if;
end $$;

select cron.schedule(
  'expire-leave-excuses',
  '30 18 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
            || '/functions/v1/expire-leave-excuses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
