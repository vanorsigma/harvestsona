import { Database } from "bun:sqlite";
import { readdirSync } from "fs";
import { join, resolve } from "path";

const scriptsDir = import.meta.dir;
if (!scriptsDir) {
  console.error("Could not determine scripts directory");
  process.exit(1);
}
const projectRoot = resolve(scriptsDir, "..");

const args = process.argv.slice(2);
let dbPath: string | undefined;

if (args.length > 0 && !args[0].startsWith("--")) {
  dbPath = args[0];
}

if (!dbPath) {
  const d1Dir = join(
    projectRoot,
    "apps/enduser/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  let files: string[];
  try {
    files = readdirSync(d1Dir)
      .filter((f) => f.endsWith(".sqlite"))
      .filter((f) => !f.includes("metadata"));
  } catch {
    console.error("Cannot access D1 directory:", d1Dir);
    console.error("Make sure the enduser app has been started locally with `bun run dev`");
    process.exit(1);
  }
  if (files.length === 0) {
    console.error("No D1 sqlite files found in", d1Dir);
    console.error("Make sure the enduser app has been started locally with `bun run dev`");
    process.exit(1);
  }
  if (files.length > 1) {
    console.error("Multiple sqlite files found; specify one via argument:");
    for (const f of files) {
      console.error("  bun run scripts/insert-db.ts", join(d1Dir, f));
    }
    process.exit(1);
  }
  dbPath = join(d1Dir, files[0]);
}

console.log("Opening database:", dbPath);

const db = new Database(dbPath);
db.run("PRAGMA foreign_keys = ON");

const sourceRows = db
  .query(
    "SELECT * FROM harvestsonas WHERE currentFilename IS NOT NULL ORDER BY RANDOM() LIMIT 1",
  )
  .all() as Record<string, unknown>[];

if (sourceRows.length === 0) {
  console.error("No harvestsonas with currentFilename found in the database");
  process.exit(1);
}

const source = sourceRows[0];
console.log("Source: user_id=%s username=%s filename=%s", source.user_id, source.username, source.currentFilename);

const rand = Math.floor(Math.random() * 100000);
const fakeUser = `fakeuser${rand}`;
const fakeId = `fake-${crypto.randomUUID()}`;
const fakeEmail = `${fakeUser}@example.com`;
const nowSec = Math.floor(Date.now() / 1000);
const nowMs = Date.now();

const insertUser = db.prepare(
  "INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, 0, NULL, ?, ?)",
);
const insertHarvestsona = db.prepare(
  "INSERT INTO harvestsonas (user_id, username, currentFilename, currentHash, currentFileTimestamp, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
const insertSync = db.prepare(
  "INSERT INTO sync (op, path, hash, timestamp) VALUES (?, ?, ?, ?)",
);

const tx = db.transaction(() => {
  insertUser.run(fakeId, fakeUser, fakeEmail, nowMs, nowMs);
  insertHarvestsona.run(
    fakeId,
    fakeUser,
    source.currentFilename,
    source.currentHash ?? "",
    source.currentFileTimestamp ?? nowSec,
    nowSec,
    nowSec,
  );
  const syncResult = insertSync.run(
    "CREATE",
    source.currentFilename,
    source.currentHash ?? "",
    nowSec,
  );
  return syncResult.lastInsertRowid;
});

let seqNo: number | bigint;
try {
  seqNo = tx() as number | bigint;
} catch (e) {
  console.error("Transaction failed:", e);
  process.exit(1);
}

console.log("\nSuccess!");
console.log("  New user id:     %s", fakeId);
console.log("  New username:    %s", fakeUser);
console.log("  Copied filename: %s", source.currentFilename);
console.log("  Sync seq_no:     %s", seqNo);

db.close();
