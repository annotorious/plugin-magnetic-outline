<script lang="ts">
  import { onMount } from 'svelte';
  import { throttle } from 'throttle-debounce';
  import type { DrawingMode, Transform } from '@annotorious/annotorious';
  import { getKeypoints, getViewer } from '@/util';
  import type { KeypointIndex, Point } from '@/types';
    import OpenSeadragon from 'openseadragon';

  const viewer = getViewer();

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

    // Canvas size is set by OpenSeadragon and will be 2x physical size
    const { width, height } = context.canvas;
    
    // Keypoints will be in the Canvas's coordinate space
    const data = context.getImageData(0, 0, width, height);
    getKeypoints(data).then(kp => keypoints = kp);
  });

  const mapSnapped = (snapped: Point) => {
    if (!snapped) return;

    const { x, y } = snapped;
    return viewer.viewport.viewerElementToImageCoordinates(new OpenSeadragon.Point(x / 2, y / 2));
  }

  $: mappedSnapped = mapSnapped(snapped);

  const onPointerMove = (evt: Event) => {
    updateKeypoints(evt as PointerEvent);

    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent; 
    const nearestKP = keypoints.neighbors(offsetX * 2, offsetY * 2, 1, 20);

    snapped = nearestKP.length > 0 ? nearestKP[0] : { x: offsetX * 2, y: offsetY * 2};
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
  {#if mappedSnapped}
    <circle
      fill="#ff0000"
      cx={mappedSnapped.x}
      cy={mappedSnapped.y}
      r={2 / viewportScale} />
  {/if}
</g>

<style>
  :global(.a9s-annotationlayer.a9s-osd-drawinglayer.drawing) {
    cursor: none;
  }

  circle {
    cursor: none;
  }
</style>