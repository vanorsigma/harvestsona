import type { UserInfo, HarvestsonaFilename } from "@harvestsona/shared";

export interface HarvestsonaRepository {
  // Allows a user to request an update to their HarvestSona
  requestUpdate(
    userId: UserInfo,
    imageUrl: HarvestsonaFilename,
    hash: string,
    timestamp: Date,
  ): Promise<boolean>;

  // Delete wanted updates to the HarvestSona
  deleteUpdate(userId: UserInfo): Promise<boolean>;

  // Directly creates or overwrites a HarvestSona row with current fields filled
  // Used by initial sync to populate pre-seeded harvestSonas
  createHarvestsona(
    user: UserInfo,
    filename: HarvestsonaFilename,
    hash: string,
    timestamp: Date,
  ): Promise<boolean>;
}
