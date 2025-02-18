<script lang="ts">
  import { onMount } from 'svelte';
  import { throttle } from 'throttle-debounce';
  import type { DrawingMode, Transform } from '@annotorious/annotorious';
  import { getKeypoints } from '@/util';
  import type { KeypointIndex, Point } from '@/types';

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let viewportScale: number;
  export let drawingMode: DrawingMode;
  export let transform: Transform;

  let container: SVGGElement;
  let context: CanvasRenderingContext2D | null;

  let keypoints: KeypointIndex;
  let snapped: Point;

  const updateKeypoints = throttle(500, (evt: PointerEvent) => {
    if (!context) return;

    const { width, height } = context.canvas;
    
    const data = context.getImageData(0, 0, width, height);
    getKeypoints(data).then(kp => { 
      console.log(kp);
      keypoints = kp
    });
  });

  const onPointerMove = (evt: Event) => {
    updateKeypoints(evt as PointerEvent);

    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent;
    const nearestKP = keypoints.neighbors(offsetX, offsetY, 1, 20);

    snapped = nearestKP.length > 0 ? nearestKP[0] : { x: offsetX, y: offsetY };
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    const siblings = Array.from(svg?.parentElement?.children || []);

    const canvas = siblings.find(n => n.nodeName.toUpperCase() === 'CANVAS') as HTMLCanvasElement;
    context = canvas.getContext('2d');
    
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