import { D1Database } from "@cloudflare/workers-types";
import type {
  AdminRepository,
  UserManagementRepository,
} from "@harvestsona/domain";
import type {
  AdminAllUserView,
  NormalUser,
  PendingApproval,
  UserInfo,
} from "@harvestsona/shared";
import { asc, eq, SQL, and, isNotNull } from "drizzle-orm";
import { getDb } from "../schema";
import { harvestsonas, banned, user } from "../schema/schema";

type FilterType = SQL<unknown>;

export class D1UserManagementRepository implements UserManagementRepository<FilterType> {
  protected db: ReturnType<typeof getDb>;

  constructor(
    database: D1Database,
    protected readonly adminRepo: AdminRepository,
  ) {
    this.db = getDb(database);
  }

  async getAllUsers(
    filters?: FilterType[],
  ): Promise<AdminAllUserView[] | null> {
    try {
      const query = this.db
        .select()
        .from(user)
        .leftJoin(harvestsonas, eq(user.id, harvestsonas.userId))
        .leftJoin(banned, eq(user.id, banned.id))
        .orderBy(asc(user.id));

      const results = await (filters ? query.where(and(...filters)) : query);
      return results.map((val) => {
        const mapped = {
          user: {
            uid: val.user.id,
            username: val.user.name,
          },
          profileImage: val.user.image,
          currentFilename: val.harvestsonas?.currentFilename ?? "",
          banned: val.banned?.banned ?? false,
          bannedAt: val.banned?.bannedAt ?? null,
          bannedReason: val.banned?.bannedReason ?? "",
        } as AdminAllUserView;
        console.info(
          `[getAllUsers] mapping username=${mapped.user.username} -> profileImage=${mapped.profileImage ?? "none"} currentFilename=${mapped.currentFilename}`,
        );
        return mapped;
      });
    } catch (e) {
      console.error("Failed to get the list of all users.", e);
      return null;
    }
  }

  async getUserByName(
    name: string,
  ): Promise<{
    uid: string;
    username: string;
    currentFilename: string | null;
  } | null> {
    try {
      const result = await this.db
        .select()
        .from(user)
        .leftJoin(harvestsonas, eq(user.id, harvestsonas.userId))
        .where(eq(user.name, name))
        .get();
      if (!result) return null;

      const mapped = {
        uid: result.user.id,
        username: result.user.name,
        currentFilename: result.harvestsonas?.currentFilename ?? null,
      };
      console.info(
        `[getUserByName] mapping username=${mapped.username} -> currentFilename=${mapped.currentFilename ?? "none"}`,
      );
      return mapped;
    } catch (e) {
      console.error(`Failed to get user for name: ${name}`);
      return null;
    }
  }

  async getUser(userId: string): Promise<NormalUser | null> {
    try {
      const result = await this.db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .get();
      if (!result) return null;

      return {
        user: {
          uid: result?.id,
          username: result?.name,
        },
        profileImage: result?.image ?? "",
      };
    } catch (e) {
      console.error(`Failed to get user for ID: ${userId}`);
      return null;
    }
  }

  async isBanned(idx: string): Promise<boolean> {
    try {
      const result = await this.db
        .select()
        .from(banned)
        .where(eq(banned.id, idx))
        .limit(1);
      return result.length > 0 && result[0].banned;
    } catch (e) {
      console.error(`Error checking if user ${idx} is banned.`, e);
      return false;
    }
  }

  async banUser(
    adminUser: UserInfo,
    targetUser: UserInfo,
    reason: string,
  ): Promise<boolean> {
    if (await this.adminRepo.isAdmin(targetUser)) {
      console.log(
        `Admin ${adminUser.username} attempted to ban another admin, ${targetUser.username}`,
      );
      return false;
    }

    try {
      void (await this.db
        .insert(banned)
        .values({
          id: targetUser.uid,
          banned: true,
          bannedAt: new Date(),
          bannedReason: `Banned by ${adminUser.username} for ${reason}`,
        })
        .onConflictDoUpdate({
          target: banned.id,
          set: {
            banned: true,
            bannedAt: new Date(),
            bannedReason: `Banned by ${adminUser.username} for ${reason}`,
          },
        }));

      return true;
    } catch (e) {
      console.error(`Error while trying to ban ${targetUser.uid}`, e);
      return false;
    }
  }

  async unbanUser(adminUser: UserInfo, targetUser: UserInfo): Promise<boolean> {
    try {
      void (await this.db.delete(banned).where(eq(banned.id, targetUser.uid)));
      return true;
    } catch (e) {
      console.error(`Error while trying to unban ${targetUser.uid}`, e);
      return false;
    }
  }

  async getPendingApprovals(): Promise<PendingApproval[] | null> {
    try {
      const query = await this.db
        .select()
        .from(harvestsonas)
        .where(isNotNull(harvestsonas.pendingFilename))
        .innerJoin(user, eq(user.id, harvestsonas.userId));

      return query.map((val) => {
        const approval = {
          user: {
            uid: val.harvestsonas.userId,
            username: val.harvestsonas.username,
          },
          profileImage: val.user.image,
          currentFilename: val.harvestsonas.currentFilename,
          pendingFilename: val.harvestsonas.pendingFilename,
          currentHash: val.harvestsonas.currentHash,
          pendingHash: val.harvestsonas.pendingHash,
          currentFileTimestamp: val.harvestsonas.currentFileTimestamp,
          pendingFileTimestamp: val.harvestsonas.pendingFileTimestamp,
        } as PendingApproval;
        console.info(
          `[getPendingApprovals] mapping username=${approval.user.username} -> currentFilename=${approval.currentFilename ?? "none"} pendingFilename=${approval.pendingFilename ?? "none"}`,
        );
        return approval;
      });
    } catch (e) {
      console.error("Error while trying to obtain all approval pendings", e);
      return null;
    }
  }

  async deleteUser(targetUser: UserInfo): Promise<boolean> {
    try {
      void (await this.db.delete(user).where(eq(user.id, targetUser.uid)));
      return true;
    } catch (e) {
      console.error(`Error while trying to delete user ${targetUser.uid}`, e);
      return false;
    }
  }
}
