<script lang="ts">
  import type { HarvestsonaImageURL } from '@harvestsona/shared';

  let { harvestsonaURL, title, alttext } = $props<{
    harvestsonaURL: HarvestsonaImageURL;
    title: string;
    alttext: string;
  }>();
</script>

<div class="harvestsona-section">
  <div class="section-header">
    <h2>{title}</h2>
  </div>

  <div class="harvestsona-frame">
    <img class="harvestsona-image" src={harvestsonaURL} alt={alttext} />
  </div>
</div>

<style>
  .harvestsona-frame {
    display: flex;
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    justify-content: center;

    width: 100%;
  }

  .harvestsona-frame img {
    max-width: 360px;
  }

  .harvestsona-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.08), transparent 40%);
  }

  .harvestsona-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
</style>
