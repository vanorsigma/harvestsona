import {
  DefaultHarvestsonaPath,
  type Harvestsona,
  type PaginatedHarvestsonasResult,
  type UserInfo,
} from "@harvestsona/shared";
import { D1Harvestsonas } from "./D1Harvestsonas";
import { toHarvestsona } from "./harvestsonaMappers";
import { asc, sql } from "drizzle-orm";
import { harvestsonas } from "../schema/harvestsona";

/**
 * An inefficient class that merges false data into the local dev server.
 * Do not use in production.
 */
export class D1HarvestsonasWithDevAccounts extends D1Harvestsonas {
  private falseHarvestsonas: Harvestsona[] = [
    ...Array.from({ length: 100 }, (_, idx) => {
      const fake = {
        user: {
          uid: `123${idx}`,
          username: `Bwaa${idx}`,
        },
        harvestsonaImage: DefaultHarvestsonaPath,
        pendingHarvestsonaImage: DefaultHarvestsonaPath,
        harvestsonaHash: null,
        pendingHarvestsonaHash: null,
        harvestsonaUploadedTs: null,
        pendingHarvestsonaUploadedTs: null,
        currentTs: new Date(1781215282000),
        updatedTs: new Date(1781215282000),
      };
      console.info(
        `[devAccounts] fake mapping username=${fake.user.username} -> image=${fake.harvestsonaImage}`,
      );
      return fake;
    }),
    {
      user: {
        uid: '4561',
        username: `verylongusernamethatwillcauseyoulotsofpainandsuffering`,
      },
        harvestsonaImage: DefaultHarvestsonaPath,
        pendingHarvestsonaImage: DefaultHarvestsonaPath,
        harvestsonaHash: null,
        pendingHarvestsonaHash: null,
        harvestsonaUploadedTs: null,
        pendingHarvestsonaUploadedTs: null,
        currentTs: new Date(1781215282000),
        updatedTs: new Date(1781215282000),
    }
  ];

  async getHarvestsonas(
    page: number,
  ): Promise<PaginatedHarvestsonasResult | null> {
    // not very efficient
    const realRows = await this.db
      .select()
      .from(harvestsonas)
      .orderBy(asc(harvestsonas.userId));

    const real = realRows.map((row) => toHarvestsona(row));
    const merged = [...real, ...this.falseHarvestsonas];

    return {
      harvestsonas: merged.slice(page, page + this.pageSize),
      continuation:
        page + this.pageSize < merged.length ? page + this.pageSize : null,
    };
  }

  async getHarvestsona(user: UserInfo): Promise<Harvestsona | null> {
    const inFalseHarvestsona = this.falseHarvestsonas.find(
      (targetUser) => user.uid === targetUser.user.uid,
    );
    return inFalseHarvestsona
      ? inFalseHarvestsona
      : await super.getHarvestsona(user);
  }

  async getHarvestsonasFilterByFuzzyUsername(
    search: string,
    page: number,
  ): Promise<PaginatedHarvestsonasResult | null> {
    const searchLower = search.toLowerCase();
    const realRows = await this.db
      .select()
      .from(harvestsonas)
      .orderBy(asc(harvestsonas.username))
      .where(sql`LOWER(${harvestsonas.username}) LIKE LOWER(${`%${search}%`})`);

    const real = realRows.map((row) => toHarvestsona(row));
    const fake = this.falseHarvestsonas.filter((u) =>
      u.user.username.toLowerCase().includes(searchLower),
    );
    const merged = [...real, ...fake];

    return {
      harvestsonas: merged.slice(page, page + this.pageSize),
      continuation:
        page + this.pageSize < merged.length ? page + this.pageSize : null,
    };
  }
}
