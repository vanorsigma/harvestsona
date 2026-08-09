import { eq } from 'drizzle-orm';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import { type FileEntry, type IClientDatabase } from 'syncflare';
import * as schema from '../db/schema';
import { debug } from '@tauri-apps/plugin-log';

type Schema = typeof schema;

export class ClientDatabase implements IClientDatabase {
  private db!: SqliteRemoteDatabase<Schema>;

  async open(path: string): Promise<void> {
    const sqlite = await Database.load(`sqlite:${path}`);

    this.db = drizzle(
      async (sql, params, method) => {
        if (method === 'run') {
          await sqlite.execute(sql, params);
          return { rows: [] };
        }
        const rawRows = await sqlite.select<any[]>(sql, params);
        const rowsAsValues = rawRows.map((row) => Object.values(row));

        if (method === 'get') {
          return { rows: rowsAsValues[0] || [] };
        }

        return { rows: rowsAsValues };
      },
      { schema }
    );

    await this.db.run(
      `CREATE TABLE IF NOT EXISTS file_entries (
        path TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        mtime REAL NOT NULL,
        log_number INTEGER NOT NULL
      )`
    );
    await this.db.run(
      `CREATE TABLE IF NOT EXISTS client_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    );
  }

  async getEntry(path: string): Promise<FileEntry | null> {
    const rows = await this.db
      .select()
      .from(schema.fileEntries)
      .where(eq(schema.fileEntries.path, path));
    const row = rows[0];
    if (!row) return null;
    debug(`getEntry row is: ${JSON.stringify(row)}`);
    return {
      path: row.path,
      hash: () => Promise.resolve(row.hash),
      mtime: row.mtime,
      logNumber: row.logNumber
    };
  }

  async upsertEntry(entry: FileEntry): Promise<void> {
    const hash = await entry.hash();
    await this.db
      .insert(schema.fileEntries)
      .values({ path: entry.path, hash, mtime: entry.mtime, logNumber: entry.logNumber })
      .onConflictDoUpdate({
        target: schema.fileEntries.path,
        set: { hash, mtime: entry.mtime, logNumber: entry.logNumber }
      });
  }

  async removeEntry(path: string): Promise<void> {
    await this.db.delete(schema.fileEntries).where(eq(schema.fileEntries.path, path));
  }

  async allEntries(): Promise<FileEntry[]> {
    const rows = await this.db.select().from(schema.fileEntries);
    debug(`allEntries row is ${JSON.stringify(rows)}`);
    return rows.map((row) => ({
      path: row.path,
      hash: () => Promise.resolve(row.hash),
      mtime: row.mtime,
      logNumber: row.logNumber
    }));
  }

  async getLogNumber(): Promise<number> {
    const rows = await this.db
      .select()
      .from(schema.clientState)
      .where(eq(schema.clientState.key, 'logNumber'));
    return rows[0] ? Number(rows[0].value ?? 0) : 0;
  }

  async setLogNumber(n: number): Promise<void> {
    const current = await this.getLogNumber();
    if (n <= current) return;
    await this.db
      .insert(schema.clientState)
      .values({ key: 'logNumber', value: String(n) })
      .onConflictDoUpdate({
        target: schema.clientState.key,
        set: { value: String(n) }
      });
  }
}
