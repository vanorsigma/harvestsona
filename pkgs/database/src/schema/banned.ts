import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema.ts";

export const banned = sqliteTable("banned", {
  id: text("uid")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  banned: integer("banned", { mode: "boolean" }).default(false).notNull(),
  bannedAt: integer("banned_at", { mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
  bannedReason: text("banned_reason"),
});
