import type {
  Harvestsona,
  PaginatedHarvestsonasResult,
  UserInfo,
} from "@harvestsona/shared";

export interface Harvestsonas {
  /// Gets a single Harvestsona.
  getHarvestsona(user: UserInfo): Promise<Harvestsona | null>;

  /// Gets all of the Harvestsona objects, paginated
  getHarvestsonas(page: number): Promise<PaginatedHarvestsonasResult | null>;

  /// Filtering
  getHarvestsonasFilterByFuzzyUsername(
    search: string,
    page: number,
  ): Promise<PaginatedHarvestsonasResult | null>;
}
