import type { HarvestsonaImageURL, UserInfo } from "./redefs";

export interface Harvestsona {
  user: UserInfo;
  harvestsonaImage: HarvestsonaImageURL | null;
  pendingHarvestsonaImage: HarvestsonaImageURL | null;
  harvestsonaHash: string | null;
  pendingHarvestsonaHash: string | null;
  harvestsonaUploadedTs: Date | null;
  pendingHarvestsonaUploadedTs: Date | null;
  currentTs: Date | null;
  updatedTs: Date | null;
}

export interface PaginatedHarvestsonasResult {
  harvestsonas: Harvestsona[];
  continuation: number | null;
}
