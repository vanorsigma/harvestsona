import type {
  AdminAllUserView,
  NormalUser,
  PendingApproval,
  UserInfo,
} from "@harvestsona/shared";

export interface UserManagementRepository<FilterType> {
  // Gets all of the users (filtered by a filter function)
  getAllUsers(filters?: FilterType[]): Promise<AdminAllUserView[] | null>;

  // Gets a user by ID
  getUser(idx: string): Promise<NormalUser | null>;

  // Gets a user by name (username). Returns uid, username, and current harvestsona filename if any.
  getUserByName(name: string): Promise<{ uid: string; username: string; currentFilename: string | null } | null>;

  // Is banned
  isBanned(idx: string): Promise<boolean>;

  // Bans a user
  banUser(
    adminUser: UserInfo,
    targetUser: UserInfo,
    reason: string,
  ): Promise<boolean>;

  // Unbans a user
  unbanUser(adminUser: UserInfo, targetUser: UserInfo): Promise<boolean>;

  // Gets all HarvestSonas currently pending approval
  getPendingApprovals(): Promise<PendingApproval[] | null>;

  // DELETES (completely) a user
  deleteUser(targetUser: UserInfo): Promise<boolean>;
}
