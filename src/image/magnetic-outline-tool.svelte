<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { boundsFromPoints, distance, ShapeType } from '@annotorious/annotorious';
  import type { DrawingMode, Polygon, Transform } from '@annotorious/annotorious';
  import { getImageData, getKeypoints } from '@/util';
  import type { KeypointIndex, Point } from '@/types';

  const dispatch = createEventDispatcher<{ create: Polygon }>();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let viewportScale: number;
  // svelte-ignore unused-export-let
  export let drawingMode: DrawingMode;
  export let transform: Transform;

  let container: SVGGElement;
  let keypoints: KeypointIndex;

  let cursor: Point | undefined;
  let isSnapped = false;

  $: cursorRadius = 3 / viewportScale;

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  let points: Point[] = [];
  let isClosable: boolean = false;

  const CLOSE_DISTANCE = 20;

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = evt;
    lastPointerDown = { timeStamp, offsetX, offsetY };
  }

  const onPointerMove = (evt: Event) => {
    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent;
    const point = transform.elementToImage(offsetX, offsetY);

    const nearestKP = keypoints.neighbors(point[0], point[1], 1, 20);

    if (nearestKP.length > 0) {
      cursor = nearestKP[0];
      isSnapped = true;
    } else {
      cursor = point;
      isSnapped = false;
    }

    if (points.length >  2) {
      const d = distance(point, points[0]) * viewportScale;
      isClosable = d < CLOSE_DISTANCE;
    }
  }

  const onPointerUp = (event: Event) => {
    const evt = event as PointerEvent;
    const timeDifference = evt.timeStamp - lastPointerDown.timeStamp;

    const d = distance(
      [lastPointerDown.offsetX, lastPointerDown.offsetY], 
      [evt.offsetX, evt.offsetY]);

    if (timeDifference > 300 || d > 15) // Not a single click - ignore
      return;

    if (isClosable) {
      stopDrawing();
    } else if (points.length === 0) {
      // Start drawing
      const point = transform.elementToImage(evt.offsetX, evt.offsetY);
      points.push(point);

      cursor = point;
    } else {
      points.push(cursor!);
    }
  }

  const stopDrawing = () => {
    const shape: Polygon = {
      type: ShapeType.POLYGON, 
      geometry: {
        bounds: boundsFromPoints(points),
        points: [...points]
      }
    }

    points = [];
    cursor = undefined;

    dispatch('create', shape);
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    const siblings = Array.from(svg?.parentElement?.children || []);

    const image = siblings.find(n => n.nodeName.toUpperCase() === 'IMG') as HTMLImageElement;

    const data = getImageData(image);

    getKeypoints(data).then(kp => keypoints = kp);

    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);
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

  {#if (points.length > 0 && cursor)}
    {@const coords = (isClosable ? points : [...points, cursor]).map(xy => xy.join(',')).join(' ')}
    <polygon 
      class="a9s-outer"
      points={coords} />

    <polygon 
      class="a9s-inner"
      points={coords} />
  {/if}

  {#if cursor}
    <circle
      cx={cursor[0]}
      cy={cursor[1]}
      class:snapped={isSnapped}
      r={cursorRadius} />
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