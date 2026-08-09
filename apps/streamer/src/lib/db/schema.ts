import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const fileEntries = sqliteTable('file_entries', {
  path: text('path').primaryKey(),
  hash: text('hash').notNull(),
  mtime: real('mtime').notNull(),
  logNumber: integer('log_number').notNull()
});

export const clientState = sqliteTable('client_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});
