import { type getDb, sync } from '@harvestsona/database';
import type { IServerDatabase, LogEntry, OpKind } from 'syncflare';
import { gt, max } from 'drizzle-orm';

export class SyncDatabase implements IServerDatabase {
  constructor(private db: ReturnType<typeof getDb>) {}

  async append(op: OpKind, path: string, hash: string, timestamp: number): Promise<LogEntry> {
    const [result] = await this.db
      .insert(sync)
      .values({
        hash,
        op,
        path,
        timestamp: new Date(timestamp)
      })
      .returning();
    return {
      hash: result.hash,
      id: result.seqNo,
      op: result.op,
      path: result.path,
      timestamp: result.timestamp.getTime()
    };
  }

  async range(after: number): Promise<LogEntry[]> {
    const results = await this.db.select().from(sync).where(gt(sync.seqNo, after));
    return results.map((val) => ({
      hash: val.hash,
      id: val.seqNo,
      op: val.op,
      path: val.path,
      timestamp: val.timestamp.getTime()
    }));
  }

  async latest(): Promise<number> {
    const [result] = await this.db.select({ maxValue: max(sync.seqNo) }).from(sync);
    return result.maxValue ?? -1;
  }
}
