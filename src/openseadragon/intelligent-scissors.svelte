<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import cv from '@techstark/opencv-js';
  import simplify from 'simplify-js';
  import { debounce } from 'throttle-debounce';
  import { boundsFromPoints, distance, ShapeType } from '@annotorious/annotorious';
  import type { DrawingMode, Polygon, Transform } from '@annotorious/annotorious';
  import type { Point } from '@/types';
  import { getViewer } from '@/util';

  const dispatch = createEventDispatcher<{ create: Polygon }>();

  const viewer = getViewer();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;

  export let viewportScale: number;
  // svelte-ignore unused-export-let
  export let drawingMode: DrawingMode;
  export let transform: Transform;

  let container: SVGGElement;
  let canvas: HTMLCanvasElement;

  let src: cv.Mat | undefined;
  let tool: any;
  let hasMap = false;

  let lockedPoints: Point[] = [];
  let nextLeg: Point[] = [];

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  const CLOSE_DISTANCE = 20;

  $: points = [...lockedPoints, ...nextLeg];

  $: cursorRadius = 6 / viewportScale;

  let isClosable: boolean = false;

  const initScissors = () => {
    if (!canvas) return;

    src = cv.imread(canvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0)

    // @ts-expect-error
    tool = new cv.segmentation_IntelligentScissorsMB();
    tool.setEdgeFeatureCannyParameters(32, 100);
    tool.setGradientMagnitudeMaxLimit(200);
    tool.applyImage(src);
  }

  const onUpdateViewport = debounce(50, () => {
    initScissors();
  });

  const onAnimationStart = () => {
    // Invalidate image data and tool
    src = undefined;
    tool = undefined;
  }

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = evt;
    lastPointerDown = { timeStamp, offsetX, offsetY };
  }

  const onPointerUp = (event: Event) => {
    if (!tool) return;

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
    } else {
      // Viewport can't change while selecting is in progress
      viewer.setMouseNavEnabled(false);

      // Lock current leg
      lockedPoints = [...lockedPoints, ...nextLeg];

      // Build new map
      tool.buildMap(new cv.Point(offsetX * devicePixelRatio, offsetY * devicePixelRatio));
      hasMap = true;
    }
  }

  const onPointerMove = (event: Event) => {
    if (!src || !tool || !hasMap) return;

    const evt = event as PointerEvent;
    const { offsetX, offsetY } = evt;

    // Compute contour
    const contour = new cv.Mat();
    tool.getContour(new cv.Point(offsetX * devicePixelRatio, offsetY * devicePixelRatio), contour);

    let contourPoints: {x: number, y: number}[] = [];
    for (let i = 0; i < contour.rows; i++) {
      const x = contour.data32S[i * 2] / devicePixelRatio;
      const y = contour.data32S[i * 2 + 1] / devicePixelRatio;
      contourPoints.push({ x, y });
    }
    contour.delete();

    nextLeg = simplify(contourPoints, 2, true)
      .map(xy => ([xy.x, xy.y]))
      .map(pt => transform.elementToImage(pt[0], pt[1]));
    
    if (points.length >  2) {
      const cursor = transform.elementToImage(offsetX, offsetY);
      const d = distance(cursor, points[0]) * viewportScale;
      isClosable = d < CLOSE_DISTANCE;
    } else {
      isClosable = false;
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

    lockedPoints = [];
    nextLeg = [];
    isClosable = false;

    viewer.setMouseNavEnabled(true);

    dispatch('create', shape);
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    if (!svg) return;

    svg.classList.add('intelligent-scissors');

    const siblings = Array.from(svg?.parentElement?.children || []);
    canvas = siblings.find(n => n.nodeName.toUpperCase() === 'CANVAS') as HTMLCanvasElement;
    
    const lazy = (fn: Function) => new Promise(resolve => {
      const isLoaded = !!cv?.Mat;

      if (isLoaded)
        resolve(fn());
      else
        cv.onRuntimeInitialized = () => resolve(fn());
    });

    lazy(() => {
      console.log('init tool');
      initScissors();
    });

    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);

    viewer.addHandler('animation-start', onAnimationStart);
    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      svg.classList.remove('intelligent-scissors');

      viewer.removeHandler('animation-start', onAnimationStart);
      viewer.removeHandler('update-viewport', onUpdateViewport);
    }
  });
</script>

<g bind:this={container}>
  {#if (points.length > 0)}
    {@const coords = points.map(xy => xy.join(',')).join(' ')}
    <polygon 
      class="a9s-outer"
      points={coords} />

    <polygon 
      class="a9s-inner"
      points={coords} />
  {/if}

  {#if (isClosable)}
    <circle 
      cx={points[0][0]}
      cy={points[0][1]}
      class="closable"
      r={cursorRadius}
      />
  {/if}
</g>

<style>
  circle.closable {
    fill: #fff;
    stroke: #000;
    stroke-width: 0.75;
  }
</style>