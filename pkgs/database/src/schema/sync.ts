import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { OpKind } from "syncflare";

export const sync = sqliteTable("sync", {
  seqNo: integer("seq_no").primaryKey({ autoIncrement: true }).notNull(),
  op: text("op").$type<OpKind>().notNull(),
  path: text("path").notNull(),
  hash: text("hash").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
