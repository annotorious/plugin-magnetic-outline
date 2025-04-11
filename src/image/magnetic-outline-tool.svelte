<script lang="ts">
  import { onMount } from 'svelte';
  import type { DrawingMode, Transform } from '@annotorious/annotorious';
  import { getImageData, getKeypoints } from '@/util';
  import type { KeypointIndex, Point } from '@/types';

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let viewportScale: number;
  export let drawingMode: DrawingMode;
  export let transform: Transform;

  let container: SVGGElement;
  let keypoints: KeypointIndex;

  let cursor: Point;
  let isSnapped = false;

  const onPointerMove = (evt: Event) => {
    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent;
    const nearestKP = keypoints.neighbors(offsetX, offsetY, 1, 20);

    if (nearestKP.length > 0) {
      cursor = nearestKP[0];
      isSnapped = true;
    } else {
      cursor = { x: offsetX, y: offsetY };
      isSnapped = false;
    }
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    const siblings = Array.from(svg?.parentElement?.children || []);

    const image = siblings.find(n => n.nodeName.toUpperCase() === 'IMG') as HTMLImageElement;

    const data = getImageData(image);

    getKeypoints(data).then(kp => keypoints = kp);

    addEventListener('pointermove', onPointerMove);
  });
</script>

<g bind:this={container}>
  <!-- 
  <g class="debug">
    {#if Boolean(keypoints)}
      {#each keypoints.listAll() as keypoint}
        <circle 
          stroke="black"
          stroke-width={1}
          fill="#fff"
          cx={keypoint.x} 
          cy={keypoint.y}
          r={2} />
      {/each}
    {/if}
  </g>
  -->

  {#if Boolean(cursor)}
    <circle
      cx={cursor.x}
      cy={cursor.y}
      class:snapped={isSnapped}
      r={3} />
  {/if}
</g>

<style>
  circle {
    fill: #000;
    stroke: #fff;
    stroke-width: 0.75;
  }

  :global(.a9s-annotationlayer) {
    cursor: url('/crosshair.svg') 16 16, auto;
  }
</style>