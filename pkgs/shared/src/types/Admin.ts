import type { Scope } from "../constants/scopes.ts";
import type {
  HarvestsonaFilename,
  ProfileImageURL,
  UserInfo,
} from "./redefs.ts";

export interface NormalUser {
  user: UserInfo;
  profileImage: ProfileImageURL;
}

export type AdminUser = NormalUser & {
  scopes: Scope[];
  appointedBy: UserInfo;
  appointedAt: Date;
};

export interface PendingApproval {
  user: UserInfo;
  profileImage: ProfileImageURL;
  currentFilename: HarvestsonaFilename;
  pendingFilename: HarvestsonaFilename;
  currentHash: string | null;
  pendingHash: string | null;
  currentFileTimestamp: Date | null;
  pendingFileTimestamp: Date | null;
}

export interface AdminAllUserView {
  user: UserInfo;
  profileImage: ProfileImageURL;
  currentFilename: HarvestsonaFilename;
  /// `false` is the default — users without a `banned` row are not banned.
  banned: boolean;
  /// `null` when the user has never been banned.
  bannedAt: Date | null;
  /// Empty string when the user has never been banned.
  bannedReason: string;
}
