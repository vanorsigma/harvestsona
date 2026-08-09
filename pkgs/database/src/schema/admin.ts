import { type Scope } from "@harvestsona/shared";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema.ts";

export const admin = sqliteTable("admin", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  scopes: text("scopes", { mode: "json" }).$type<Scope[]>().notNull(),
  appointedBy: text("appointed_by").references(() => user.id),
  appointedAt: integer("appointed_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
