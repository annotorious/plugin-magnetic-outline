<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { debounce } from 'throttle-debounce';
  import { boundsFromPoints, distance, ShapeType } from '@annotorious/annotorious';
  import type { DrawingMode, Polygon, Transform } from '@annotorious/annotorious';
  import { getKeypoints, getViewer, lazy } from '@/util';
  import type { KeypointIndex, Point } from '@/types';

  const dispatch = createEventDispatcher<{ create: Polygon }>();

  const viewer = getViewer();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let viewportScale: number;
  // svelte-ignore unused-export-let
  export let drawingMode: DrawingMode;
  export let transform: Transform;

  let container: SVGGElement;
  let context: CanvasRenderingContext2D | null;

  let keypoints: KeypointIndex | undefined;

  // Note: keypoints are viewport coordinate space (multiplied
  // by devicePixelRatio), everything else is image coordinate space.
  let canvasCursor: Point | undefined;
  let imageCursor: Point | undefined;

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  let points: Point[] = [];
  let isClosable: boolean = false;

  const CLOSE_DISTANCE = 20;

  $: cursorRadius = 3 / viewportScale;

  const updateKeypoints = () => {
    if (!context) return;

    // Canvas size is set by OpenSeadragon and will be 2x physical size
    const { width, height } = context.canvas;
    
    // Keypoints will be in the Canvas's coordinate space
    const data = context.getImageData(0, 0, width, height);
    getKeypoints(data).then(kp => keypoints = kp);
  }

  const onUpdateViewport = debounce(50, () => {
    updateKeypoints();
  });

  const onAnimationStart = () => {
    // Invalidate keypoints
    keypoints = undefined;
  }

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = evt;
    lastPointerDown = { timeStamp, offsetX, offsetY };
  }

  const onPointerMove = (evt: Event) => {    
    if (!keypoints) return;

    const { offsetX, offsetY } = evt as PointerEvent; 
    const nearestKP = keypoints.neighbors(offsetX * devicePixelRatio, offsetY * devicePixelRatio, 1, 20);

    canvasCursor = nearestKP.length > 0 ? nearestKP[0] : [offsetX * devicePixelRatio, offsetY * devicePixelRatio];
    imageCursor = transform.elementToImage(canvasCursor[0] / devicePixelRatio, canvasCursor[1] / devicePixelRatio);

    if (points.length >  2) {
      const d = distance(imageCursor, points[0]) * viewportScale;
      isClosable = d < CLOSE_DISTANCE;
    }
  }

  const onPointerUp = (event: Event) => {
    const evt = event as PointerEvent;
    const { offsetX, offsetY } = evt;
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

      canvasCursor = [offsetX * devicePixelRatio, offsetY * devicePixelRatio];
      imageCursor = transform.elementToImage(offsetX, offsetY);
    } else if (imageCursor) {
      points.push(imageCursor);
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

    canvasCursor = undefined;
    imageCursor = undefined;

    dispatch('create', shape);
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer') as SVGSVGElement;
    if (!svg) return;

    svg.classList.add('magnetic-cursor');

    const siblings = Array.from(svg?.parentElement?.children || []);

    const canvas = siblings.find(n => n.nodeName.toUpperCase() === 'CANVAS') as HTMLCanvasElement;
    context = canvas.getContext('2d');

    lazy(() => updateKeypoints());
  
    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);

    viewer.addHandler('animation-start', onAnimationStart);
    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      svg.classList.remove('magnetic-cursor');

      viewer.removeHandler('animation-start', onAnimationStart);
      viewer.removeHandler('update-viewport', onUpdateViewport);
    }
  });
</script>

<g 
  bind:this={container}
  class="a9s-annotation">

  {#if (points.length > 0 && imageCursor)}
    {@const coords = (isClosable ? points : [...points, imageCursor]).map(xy => xy.join(',')).join(' ')}
    <polygon 
      class="a9s-outer"
      points={coords} />

    <polygon 
      class="a9s-inner"
      points={coords} />
  {/if}

  {#if isClosable}
    <rect 
      class="a9s-handle"
      x={points[0][0] - cursorRadius} 
      y={points[0][1] - cursorRadius} 
      height={cursorRadius * 3} 
      width={cursorRadius * 3} />
  {:else if imageCursor}
    <circle
      cx={imageCursor[0]}
      cy={imageCursor[1]}
      r={cursorRadius} />
  {/if}
</g>

<style>
  circle {
    fill: #000;
    stroke: #fff;
    stroke-width: 0.75;
    vector-effect: non-scaling-stroke;
  }

  rect.a9s-handle {
    cursor: url('/assets/crosshair.svg') 12 12, auto;
  }

  :global(
    .a9s-annotationlayer.a9s-osd-drawinglayer.magnetic-cursor,
    .a9s-annotationlayer.a9s-osd-drawinglayer.magnetic-cursor .a9s-annotation
  ) {
    cursor: url('/assets/crosshair.svg') 12 12, auto;
  }
</style>