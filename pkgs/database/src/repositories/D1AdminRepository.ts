import { D1Database } from "@cloudflare/workers-types";
import type { AdminRepository } from "@harvestsona/domain";
import type { AdminUser, Scope, UserInfo } from "@harvestsona/shared";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "../schema";
import { admin, user } from "../schema/schema";

export class D1AdminRepository implements AdminRepository {
  protected db: ReturnType<typeof getDb>;

  constructor(database: D1Database) {
    this.db = getDb(database);
  }

  async getAdmins(): Promise<AdminUser[] | null> {
    try {
      const appointerUser = alias(user, "appointer_user");
      const results = await this.db
        .select()
        .from(admin)
        .innerJoin(user, eq(admin.userId, user.id))
        .innerJoin(appointerUser, eq(admin.appointedBy, appointerUser.id))
        .orderBy(asc(admin.appointedAt));

      return results.map(
        (val) =>
          ({
            user: {
              uid: val.admin.userId,
              username: val.user.name,
            },
            profileImage: val.user.image,
            scopes: val.admin.scopes,
            appointedBy: {
              uid: val.appointer_user.id,
              username: val.appointer_user.name,
            },
            appointedAt: val.admin.appointedAt,
          }) as AdminUser,
      );
    } catch (e) {
      console.error("Failed to get admins.", e);
      return null;
    }
  }

  async isAdmin(user: UserInfo): Promise<boolean> {
    try {
      const result = await this.db
        .select()
        .from(admin)
        .where(eq(admin.userId, user.uid))
        .limit(1);

      return result.length > 0;
    } catch (e) {
      console.error(`Error checking if user ${user.uid} is admin.`, e);
      return false;
    }
  }

  async getScopes(user: UserInfo): Promise<Scope[] | null> {
    try {
      const result = await this.db
        .select()
        .from(admin)
        .where(eq(admin.userId, user.uid))
        .limit(1);

      if (result.length === 0) return null;
      return result[0].scopes;
    } catch (e) {
      console.error(`Error getting admin scopes for user ${user.uid}.`, e);
      return null;
    }
  }

  async hasScope(user: UserInfo, scopes: Scope[]): Promise<boolean> {
    try {
      const adminScopes = await this.getScopes(user);
      if (!adminScopes) return false;
      return scopes.every((scope) => adminScopes.includes(scope));
    } catch (e) {
      console.error(`Error checking scopes for user ${user.uid}.`, e);
      return false;
    }
  }

  async appointAdmin(
    appointer: UserInfo,
    targetUser: UserInfo,
    scopes: Scope[],
  ): Promise<boolean> {
    try {
      await this.db
        .insert(admin)
        .values({
          userId: targetUser.uid,
          scopes,
          appointedBy: appointer.uid,
        })
        .onConflictDoUpdate({
          target: admin.userId,
          set: {
            scopes: scopes,
            appointedBy: appointer.uid,
          },
        });

      return true;
    } catch (e) {
      console.error(`Error appointing admin ${targetUser.uid}.`, e);
      return false;
    }
  }

  async removeAdmin(remover: UserInfo, targetUser: UserInfo): Promise<boolean> {
    try {
      await this.db.delete(admin).where(eq(admin.userId, targetUser.uid));
      return true;
    } catch (e) {
      console.error(`Error removing admin ${targetUser.uid}.`, e);
      return false;
    }
  }

  async updateScopes(
    modifier: UserInfo,
    targetUser: UserInfo,
    scopes: Scope[],
  ): Promise<boolean> {
    try {
      await this.db
        .update(admin)
        .set({
          scopes,
          updatedAt: new Date(),
        })
        .where(eq(admin.userId, targetUser.uid));

      return true;
    } catch (e) {
      console.error(`Error updating admin scopes for ${targetUser.uid}.`, e);
      return false;
    }
  }
}
