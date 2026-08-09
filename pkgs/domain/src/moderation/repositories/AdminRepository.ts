import type { AdminUser, Scope, UserInfo } from "@harvestsona/shared";

export interface AdminRepository {
  getAdmins(): Promise<AdminUser[] | null>;

  isAdmin(user: UserInfo): Promise<boolean>;

  getScopes(user: UserInfo): Promise<Scope[] | null>;

  hasScope(user: UserInfo, scopes: Scope[]): Promise<boolean>;

  appointAdmin(
    appointer: UserInfo,
    targetUser: UserInfo,
    scopes: Scope[],
  ): Promise<boolean>;

  removeAdmin(remover: UserInfo, targetUser: UserInfo): Promise<boolean>;

  updateScopes(
    modifier: UserInfo,
    targetUser: UserInfo,
    scopes: Scope[],
  ): Promise<boolean>;
}
