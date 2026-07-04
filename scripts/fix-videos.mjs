// Fixes the seeded posts: swaps in verified real YouTube video IDs
// (the originals were guessed from memory and mostly didn't exist).
// Run with: node scripts/fix-videos.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// oldTitle matches what the seed script originally inserted
const FIXES = [
  {
    oldTitle: "Rachmaninoff Piano Concerto No. 2 — Yuja Wang",
    newTitle: "Rachmaninoff Piano Concerto No. 2 — Yuja Wang",
    videoId: "NsqXCO0ADwM",
  },
  {
    oldTitle: "Chopin Ballade No. 1 in G minor — Krystian Zimerman",
    newTitle: "Chopin Ballade No. 1 in G minor — Krystian Zimerman",
    videoId: "BSFNl4roGlI",
  },
  {
    oldTitle: "Beethoven 'Moonlight' Sonata — Víkingur Ólafsson",
    newTitle: "Beethoven Piano Sonata Op. 109 — Víkingur Ólafsson",
    content:
      "Not the Moonlight, but his Op. 109 recording is just as worth studying — the way he shapes the opening Vivace is gorgeous.",
    videoId: "DJs9AYlvSiM",
  },
  {
    oldTitle: "Liszt La Campanella — Lang Lang",
    newTitle: "Liszt La Campanella — Lang Lang",
    videoId: "cIxGUAnj46U",
  },
  {
    oldTitle: "Debussy Clair de Lune — Valentina Lisitsa",
    newTitle: "Debussy Clair de Lune — Valentina Seferinova",
    content:
      "Perfect voicing example — listen to how the melody floats above the arpeggios without ever getting heavy.",
    videoId: "1OfIJwOGifA",
  },
  {
    oldTitle: "Bach/Busoni Chaconne in D minor — Martha Argerich",
    newTitle: "Bach Partita No. 2 in C minor, BWV 826 — Martha Argerich (1979)",
    content:
      "Couldn't verify a real Argerich Busoni Chaconne recording, so swapping in her legendary 1979 Partita No. 2 instead — the Capriccio at the end is a great practice reference.",
    videoId: "PhfDefAUU7w",
  },
];

async function main() {
  for (const fix of FIXES) {
    const { data: existing, error: findError } = await supabase
      .from("posts")
      .select("id")
      .eq("title", fix.oldTitle)
      .maybeSingle();

    if (findError || !existing) {
      console.error(`Could not find post "${fix.oldTitle}" — skipping`);
      continue;
    }

    const update = {
      title: fix.newTitle,
      video_url: `https://www.youtube.com/embed/${fix.videoId}`,
    };
    if (fix.content) update.content = fix.content;

    const { error: updateError } = await supabase
      .from("posts")
      .update(update)
      .eq("id", existing.id);

    if (updateError) {
      console.error(`Failed to update "${fix.oldTitle}":`, updateError.message);
    } else {
      console.log(`✓ Fixed "${fix.newTitle}" -> ${fix.videoId}`);
    }
  }

  console.log("\nDone fixing video posts.");
}

main();
