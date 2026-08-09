import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema.ts";

export const harvestsonas = sqliteTable("harvestsonas", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  currentFilename: text("currentFilename"),
  pendingFilename: text("pendingFilename"),
  currentHash: text("currentHash"),
  pendingHash: text("pendingHash"),
  currentFileTimestamp: integer("currentFileTimestamp", { mode: "timestamp" }),
  pendingFileTimestamp: integer("pendingFileTimestamp", { mode: "timestamp" }),
  timestampCurrent: integer("created", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  timestampUpdated: integer("updated", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
