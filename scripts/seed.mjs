// One-off seed script: creates fake users + classical piano video posts.
// Run with: node scripts/seed.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only, never commit).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// minimal .env.local loader (no dotenv dependency)
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "clara.schumann.seed@example.com", username: "ClaraSchumannFan" },
  { email: "vhorowitz.seed@example.com", username: "HorowitzDevotee" },
  { email: "yuja.wang.seed@example.com", username: "YujaWangStan" },
  { email: "vikingur.seed@example.com", username: "VikingurVibes" },
  { email: "lang.lang.seed@example.com", username: "LangLangLover" },
  { email: "martha.arg.seed@example.com", username: "MarthaArgerichFan" },
];

// Real, well-known classical piano performance videos on YouTube.
const VIDEOS = [
  {
    title: "Rachmaninoff Piano Concerto No. 2 — Yuja Wang",
    content: "One of the most electrifying performances of the 2nd concerto I've ever seen. That third movement build is unreal.",
    videoId: "9E6b3swbnWg",
  },
  {
    title: "Chopin Ballade No. 1 in G minor — Krystian Zimerman",
    content: "The coda in this recording still gives me chills every single time. Zimerman's control is insane.",
    videoId: "9pOM6THL-uc",
  },
  {
    title: "Beethoven 'Moonlight' Sonata — Víkingur Ólafsson",
    content: "Ólafsson's phrasing in the first movement is so restrained and haunting. Great reference recording for practice.",
    videoId: "OiXsUB1_l7Y",
  },
  {
    title: "Liszt La Campanella — Lang Lang",
    content: "The right-hand leaps here are terrifying to even watch. Great etude for anyone working on octave jumps.",
    videoId: "sxCF19174Ug",
  },
  {
    title: "Debussy Clair de Lune — Valentina Lisitsa",
    content: "Perfect voicing example — listen to how the melody floats above the arpeggios without ever getting heavy.",
    videoId: "CvFH_6DNRCY",
  },
  {
    title: "Bach/Busoni Chaconne in D minor — Martha Argerich",
    content: "Argerich's dynamic range in this transcription is a masterclass on its own. Study this one closely.",
    videoId: "d3TgBmMDQnE",
  },
];

const RANDOM_PASSWORD = "Seed-User-Practice-2026!";

async function ensureUser(email, username) {
  // check if this seed user already exists (idempotent re-runs)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    console.log(`✓ ${username} already exists, skipping creation`);
    return existingProfile.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: RANDOM_PASSWORD,
    email_confirm: true, // skip email confirmation entirely
    user_metadata: { username },
  });

  if (error) {
    console.error(`Failed to create ${username}:`, error.message);
    return null;
  }

  const userId = data.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, username });

  if (profileError) {
    console.error(`Failed to create profile for ${username}:`, profileError.message);
    return null;
  }

  console.log(`✓ Created user ${username}`);
  return userId;
}

async function createPost(authorId, video) {
  const { error } = await supabase.from("posts").insert({
    author_id: authorId,
    title: video.title,
    content: video.content,
    type: "video",
    video_url: `https://www.youtube.com/embed/${video.videoId}`,
  });

  if (error) {
    console.error(`Failed to create post "${video.title}":`, error.message);
  } else {
    console.log(`  ✓ Posted "${video.title}"`);
  }
}

async function main() {
  const userIds = [];
  for (const u of USERS) {
    const id = await ensureUser(u.email, u.username);
    if (id) userIds.push(id);
  }

  if (userIds.length === 0) {
    console.error("No users available, aborting post creation.");
    process.exit(1);
  }

  for (let i = 0; i < VIDEOS.length; i++) {
    const authorId = userIds[i % userIds.length];
    await createPost(authorId, VIDEOS[i]);
  }

  console.log("\nDone seeding users and posts.");
}

main();
