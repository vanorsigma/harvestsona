import type {
  Harvestsona,
  UserInfo,
  HarvestsonaFilename,
  PaginatedHarvestsonasResult,
  HarvestsonaImageURL,
} from "@harvestsona/shared";
import { D1Database } from "@cloudflare/workers-types";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  type HarvestsonaModerationRepository,
  type HarvestsonaRepository,
} from "@harvestsona/domain";
import type { Harvestsonas } from "./Harvestsonas";
import { toHarvestsona } from "./harvestsonaMappers";
import { getDb } from "../schema";
import { harvestsonas } from "../schema/harvestsona";

export class D1Harvestsonas
  implements
    Harvestsonas,
    HarvestsonaRepository,
    HarvestsonaModerationRepository
{
  protected db: ReturnType<typeof getDb>;

  constructor(
    rawDb: D1Database,
    protected readonly pageSize = 12,
  ) {
    this.db = getDb(rawDb);
  }

  async getHarvestsonas(
    page: number,
  ): Promise<PaginatedHarvestsonasResult | null> {
    try {
      const results = await this.db
        .select()
        .from(harvestsonas)
        .orderBy(asc(harvestsonas.userId))
        .limit(this.pageSize)
        .offset(page);

      return {
        harvestsonas: results.map((val) => toHarvestsona(val)),
        continuation:
          results.length === this.pageSize ? page + this.pageSize : null,
      } as PaginatedHarvestsonasResult;
    } catch (e) {
      console.error(
        "Error occurred while attempting to fetch all harvestsonas",
        e,
      );
      return null;
    }
  }

  async getHarvestsonasFilterByFuzzyUsername(
    search: string,
    page: number,
  ): Promise<PaginatedHarvestsonasResult | null> {
    try {
      const results = await this.db
        .select()
        .from(harvestsonas)
        .orderBy(asc(harvestsonas.username))
        .where(
          sql`LOWER(${harvestsonas.username}) LIKE LOWER(${`%${search.replaceAll("%|_|\\", (s) => `\\${s}`)}%`}) ESCAPE '\\'`,
        )
        .limit(this.pageSize)
        .offset(page);

      return {
        harvestsonas: results.map((val) => toHarvestsona(val)),
        continuation:
          results.length === this.pageSize ? page + this.pageSize : null,
      } as PaginatedHarvestsonasResult;
    } catch (e) {
      console.error(
        "Error occurred while attempting to fetch all harvestsonas",
        e,
      );
      return null;
    }
  }

  async requestUpdate(
    user: UserInfo,
    filename: HarvestsonaFilename,
    hash: string,
    timestamp: Date,
  ): Promise<boolean> {
    console.info(
      `[requestUpdate] mapping username=${user.username} (uid=${user.uid}) -> pendingFilename=${filename} hash=${hash}`,
    );
    try {
      await this.db
        .insert(harvestsonas)
        .values({
          userId: user.uid,
          username: user.username,
          currentFilename: null,
          pendingFilename: filename,
          pendingHash: hash,
          pendingFileTimestamp: timestamp,
        })
        .onConflictDoUpdate({
          target: harvestsonas.userId,
          set: {
            pendingFilename: filename,
            pendingHash: hash,
            pendingFileTimestamp: timestamp,
          },
        });
    } catch (e) {
      console.error(
        "Error occurred while attempting to insert imageURL into the database",
        e,
      );
      return false;
    }
    return true;
  }

  async createHarvestsona(
    user: UserInfo,
    filename: HarvestsonaFilename,
    hash: string,
    timestamp: Date,
  ): Promise<boolean> {
    console.info(
      `[createHarvestsona] mapping username=${user.username} (uid=${user.uid}) -> filename=${filename} hash=${hash}`,
    );
    try {
      await this.db
        .insert(harvestsonas)
        .values({
          userId: user.uid,
          username: user.username,
          currentFilename: filename,
          currentHash: hash,
          currentFileTimestamp: timestamp,
        })
        .onConflictDoUpdate({
          target: harvestsonas.userId,
          set: {
            currentFilename: filename,
            currentHash: hash,
            currentFileTimestamp: timestamp,
            pendingFilename: null,
            pendingHash: null,
            pendingFileTimestamp: null,
          },
        });
    } catch (e) {
      console.error("Error occurred while attempting to create harvestsona", e);
      return false;
    }
    return true;
  }

  async deleteUpdate(user: UserInfo): Promise<boolean> {
    try {
      await this.db
        .update(harvestsonas)
        .set({
          pendingFilename: null,
          pendingHash: null,
          pendingFileTimestamp: null,
        })
        .where(eq(harvestsonas.userId, user.uid));
    } catch (e) {
      console.error(
        "Error occured while deleting a user ID from the database",
        e,
      );
      return false;
    }
    return true;
  }

  async deleteUpdates(users: UserInfo[]): Promise<boolean> {
    try {
      await this.db
        .update(harvestsonas)
        .set({
          pendingFilename: null,
          pendingHash: null,
          pendingFileTimestamp: null,
        })
        .where(
          inArray(
            harvestsonas.userId,
            users.map((user) => user.uid),
          ),
        );
    } catch (e) {
      console.error(
        "Error occured while batch deleting user IDs from the database",
        e,
      );
      return false;
    }
    return true;
  }

  async pushUpdates(users: UserInfo[]): Promise<
    {
      user: UserInfo;
      filename: HarvestsonaImageURL;
      hash: string;
      timestamp: Date;
      previousFilename: HarvestsonaImageURL | null;
    }[]
  > {
    try {
      const userIds = users.map((user) => user.uid);

      // dirty read intentional
      const withPrev = await this.db
        .select({
          userId: harvestsonas.userId,
          username: harvestsonas.username,
          prevCurrentFilename: harvestsonas.currentFilename,
          pendingFilename: harvestsonas.pendingFilename,
          pendingHash: harvestsonas.pendingHash,
          pendingTimestamp: harvestsonas.pendingFileTimestamp,
        })
        .from(harvestsonas)
        .where(
          and(
            inArray(harvestsonas.userId, userIds),
            isNotNull(harvestsonas.pendingFilename),
            isNotNull(harvestsonas.pendingHash),
            isNotNull(harvestsonas.pendingFileTimestamp),
          ),
        );

      if (withPrev.length === 0) return [];

      const promoted = await this.db
        .update(harvestsonas)
        .set({
          currentFilename: harvestsonas.pendingFilename,
          currentHash: harvestsonas.pendingHash,
          currentFileTimestamp: harvestsonas.pendingFileTimestamp,
          pendingFilename: null,
          pendingHash: null,
          pendingFileTimestamp: null,
        })
        .where(
          and(
            inArray(harvestsonas.userId, userIds),
            isNotNull(harvestsonas.pendingFilename),
          ),
        )
        .returning({ userId: harvestsonas.userId });

      const promotedIds = new Set(promoted.map((p) => p.userId));

      const result = withPrev
        .filter((v) => promotedIds.has(v.userId))
        .map((v) => {
          console.info(
            `[pushUpdates] mapping username=${v.username} (uid=${v.userId}) -> filename=${v.pendingFilename} (prev=${v.prevCurrentFilename ?? "none"})`,
          );
          return {
            user: { uid: v.userId, username: v.username },
            filename: v.pendingFilename!,
            hash: v.pendingHash!,
            timestamp: v.pendingTimestamp!,
            previousFilename: v.prevCurrentFilename ?? null,
          };
        });
      return result;
    } catch (e) {
      console.error(
        "Error occured while pushing updates for multiple users to the database",
        e,
      );
      return [];
    }
  }

  async update(
    user: UserInfo,
    filename: HarvestsonaFilename,
    hash: string,
    timestamp: Date,
  ): Promise<boolean> {
    console.info(
      `[update] mapping username=${user.username} (uid=${user.uid}) -> currentFilename=${filename} hash=${hash}`,
    );
    try {
      await this.db
        .update(harvestsonas)
        .set({
          currentFilename: filename,
          currentHash: hash,
          currentFileTimestamp: timestamp,
          pendingFilename: null,
          pendingHash: null,
          pendingFileTimestamp: null,
        })
        .where(eq(harvestsonas.userId, user.uid));
    } catch (e) {
      console.error(
        "Error occured while trying to update for a single user",
        e,
      );
      return false;
    }

    return true;
  }

  async getHarvestsona(user: UserInfo): Promise<Harvestsona | null> {
    try {
      const data = await this.db
        .select()
        .from(harvestsonas)
        .where(eq(harvestsonas.userId, user.uid))
        .get();

      if (!data || !data.userId) return null;

      return toHarvestsona(data);
    } catch (e) {
      console.error("Error while getting Harvestsona", e);
      return null;
    }
  }
}
