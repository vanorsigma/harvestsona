export async function handleGetHarvestsonas(locals: App.Locals, url: URL) {
  const query = url.searchParams.get('q');
  const offset = Number(url.searchParams.get('offset'));
  const safeOffset = isNaN(offset) ? 0 : offset;

  console.info(`[getHarvestsonas] query=${query ?? 'none'} offset=${safeOffset}`);

  const harvestsonas = query
    ? await locals.repositories?.harvestsonas?.getHarvestsonasFilterByFuzzyUsername(
        query,
        safeOffset
      )
    : await locals.repositories?.harvestsonas?.getHarvestsonas(safeOffset);

  if (harvestsonas) {
    for (const hs of harvestsonas.harvestsonas) {
      console.info(
        `[getHarvestsonas] username=${hs.user.username} -> image=${hs.harvestsonaImage ?? 'none'}`
      );
    }
    console.info(
      `[getHarvestsonas] returning ${harvestsonas.harvestsonas.length} harvestsonas, continuation=${harvestsonas.continuation}`
    );
  }

  return {
    harvestsonas: harvestsonas ? harvestsonas.harvestsonas : [],
    continuation: harvestsonas ? harvestsonas.continuation : null
  };
}
