import { neon } from "@neondatabase/serverless";

/**
 * Pulizia dei dati oltre i tempi di conservazione dichiarati nell'informativa.
 * Va eseguita periodicamente (cron Vercel o job notturno):
 *   node --env-file=.env.local scripts/prune.mjs
 */
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL non configurata.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const [errors, views, events, resets, aiTokens, leads, emailChanges] = await Promise.all([
  // Log applicativi: l'informativa dichiara 90 giorni.
  sql`delete from error_logs where created_at < now() - interval '90 days' returning id`,
  // Analytics: 365 giorni bastano per le serie mostrate (30 giorni).
  sql`delete from site_views where created_at < now() - interval '365 days' returning id`,
  sql`delete from site_events where created_at < now() - interval '365 days' returning id`,
  // Token di reset: già inutilizzabili, si tengono 7 giorni per diagnostica.
  sql`delete from password_resets where expires_at < now() - interval '7 days' returning token_hash`,
  // Consumo AI: cresce di una riga per richiesta, oltre l'anno non serve più.
  sql`delete from ai_usage where created_at < now() - interval '365 days' returning id`,
  // Contatti: l'informativa dichiara 24 mesi dall'ultimo scambio. La data di
  // risposta, se presente, è l'ultimo contatto effettivo con la persona.
  sql`
    delete from leads
    where coalesce(replied_at, created_at) < now() - interval '24 months'
    returning id
  `,
  // Token di cambio email: già inutilizzabili, si tengono 7 giorni per diagnostica.
  sql`delete from email_changes where expires_at < now() - interval '7 days' returning token_hash`,
]);

await sql`delete from rate_limits where reset_at < now() - interval '1 day'`;

console.log(
  [
    `error_logs: ${errors.length}`,
    `site_views: ${views.length}`,
    `site_events: ${events.length}`,
    `password_resets: ${resets.length}`,
    `ai_usage: ${aiTokens.length}`,
    `leads: ${leads.length}`,
    `email_changes: ${emailChanges.length}`,
    "rate_limits: puliti",
  ].join(" · "),
);
