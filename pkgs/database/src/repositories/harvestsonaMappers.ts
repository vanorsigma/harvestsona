import type { Harvestsona } from "@harvestsona/shared";
import { harvestsonas } from "../schema/harvestsona";

export type HarvestsonaRow = typeof harvestsonas.$inferSelect;

export function toHarvestsona(row: HarvestsonaRow): Harvestsona {
  console.info(
    `[toHarvestsona] mapping username=${row.username} -> currentFilename=${row.currentFilename ?? "none"} pendingFilename=${row.pendingFilename ?? "none"}`,
  );
  return {
    user: {
      uid: row.userId,
      username: row.username,
    },
    harvestsonaImage: row.currentFilename,
    pendingHarvestsonaImage: row.pendingFilename,
    harvestsonaHash: row.currentHash,
    pendingHarvestsonaHash: row.pendingHash,
    harvestsonaUploadedTs: row.currentFileTimestamp,
    pendingHarvestsonaUploadedTs: row.pendingFileTimestamp,
    currentTs: row.timestampCurrent,
    updatedTs: row.timestampUpdated,
  };
}
