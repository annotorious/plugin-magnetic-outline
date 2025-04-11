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
  let snapped: Point;

  const onPointerMove = (evt: Event) => {
    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent;
    const nearestKP = keypoints.neighbors(offsetX, offsetY, 1, 20);

    snapped = nearestKP.length > 0 ? nearestKP[0] : { x: offsetX, y: offsetY };
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

<g 
  bind:this={container}
  class="a9s-annotation">
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

  {#if Boolean(snapped)}
    <circle
      cx={snapped.x}
      cy={snapped.y}
      r={2} />
  {/if}
</g>