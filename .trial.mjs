import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const htmlTrial = [
  "<style>:root{--accento:#8b5cf6}.hero{min-height:80vh;display:grid;place-content:center;gap:1.5rem;padding:4rem 1.5rem;text-align:center}.hero h1{font-size:clamp(2.4rem,8vw,5rem);line-height:1;margin:0}</style>",
  '<section class="hero"><h1>Studio Verifica</h1><p>Consulenza su misura, senza schemi preconfezionati.</p>',
  '<a href="https://wa.me/393331234567">Parliamone su WhatsApp</a></section>',
  "<script>window.__xss = 1; alert(1)</script>",
  '<img src="/icon.svg" onerror="alert(2)" alt="">',
].join("\n");

const config = {
  meta: {
    title: "Studio Verifica",
    description: "Studio di consulenza a Milano: percorsi su misura per professionisti e piccole imprese.",
  },
  theme: {
    bg_color: "#0b0b0f", text_color: "#f5f5f5", accent_color: "#8b5cf6",
    accent2: "#22d3ee", style: "aurora", font: "sans",
  },
  blocks: [{ id: "blk_hero", type: "hero", data: { title: "Studio Verifica" } }],
  html: htmlTrial,
};

await sql.query("delete from sites where slug = 'verifica-html-libero'");
await sql.query(
  "insert into sites (id, owner_id, slug, config, published) values ($1, null, $2, $3::jsonb, true)",
  ["site_verifica_html", "verifica-html-libero", JSON.stringify(config)],
);
console.log("pagina di prova creata");
