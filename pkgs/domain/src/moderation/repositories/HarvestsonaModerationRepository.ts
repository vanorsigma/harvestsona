import type { HarvestsonaImageURL, UserInfo } from "@harvestsona/shared";

export interface HarvestsonaModerationRepository {
  // Push updates to the HarvestSona through
  pushUpdates(userIds: UserInfo[]): Promise<
    {
      user: UserInfo;
      filename: HarvestsonaImageURL;
      hash: string;
      timestamp: Date;
      previousFilename: HarvestsonaImageURL | null;
    }[]
  >;

  // Forces the user to adopt the imageUrl HarvestSona
  update(
    userId: UserInfo,
    imageUrl: HarvestsonaImageURL,
    hash: string,
    timestamp: Date,
  ): Promise<boolean>;

  // Delete all updates to the HarvestSona for particular users
  deleteUpdates(userIds: UserInfo[]): Promise<boolean>;
}
