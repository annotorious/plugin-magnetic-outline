<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import cv from '@techstark/opencv-js';
  import simplify from 'simplify-js';
  import { boundsFromPoints, distance, ShapeType } from '@annotorious/annotorious';
  import type { DrawingMode, Polygon, Transform } from '@annotorious/annotorious';
  import type { Point } from '@/types';

  const dispatch = createEventDispatcher<{ create: Polygon }>();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;

  export let viewportScale: number;
  // svelte-ignore unused-export-let
  export let drawingMode: DrawingMode;
  // svelte-ignore unused-export-let
  export let transform: Transform;

  let container: SVGGElement;

  let src: cv.Mat | undefined;
  let tool: any;
  let hasMap = false;

  let lockedPoints: Point[] = [];
  let nextLeg: Point[] = [];

  const CLOSE_DISTANCE = 20;

  $: points = [...lockedPoints, ...nextLeg];

  let isClosable: boolean = false;

  const onPointerDown = (event: Event) => {
    if (!tool) return;

    if (isClosable) {
      stopDrawing();
    } else {
      const evt = event as PointerEvent;
      const { offsetX, offsetY } = evt;

      // Lock current leg
      lockedPoints = [...lockedPoints, ...nextLeg];

      // Build new map
      tool.buildMap(new cv.Point(offsetX, offsetY));
      hasMap = true;
    }
  }

  const onPointerMove = (event: Event) => {
    if (!src || !tool || !hasMap) return;

    const evt = event as PointerEvent;
    const { offsetX: x, offsetY: y } = evt;

    // Compute contour
    const contour = new cv.Mat();
    tool.getContour(new cv.Point(x, y), contour);

    let contourPoints: {x: number, y: number}[] = [];
    for (let i = 0; i < contour.rows; i++) {
      const x = contour.data32S[i * 2];
      const y = contour.data32S[i * 2 + 1];
      contourPoints.push({ x, y });
    }
    contour.delete();

    nextLeg = simplify(contourPoints, 0.8, true).map(xy => ([xy.x, xy.y])) as Point[];

    if (points.length >  2) {
      const d = distance([x, y], points[0]) * viewportScale;
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

    dispatch('create', shape);
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    const siblings = Array.from(svg?.parentElement?.children || []);

    const image = siblings.find(n => n.nodeName.toUpperCase() === 'IMG') as HTMLImageElement;
    const lazy = (fn: Function) => new Promise(resolve => {
      const isLoaded = !!cv?.Mat;

      if (isLoaded)
        resolve(fn());
      else
        cv.onRuntimeInitialized = () => resolve(fn());
    });

    lazy(() => {
      src = cv.imread(image);

      // @ts-expect-error
      tool = new cv.segmentation_IntelligentScissorsMB();
      tool.setEdgeFeatureCannyParameters(32, 100);
      tool.setGradientMagnitudeMaxLimit(200);
      tool.applyImage(src);
    });

    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', onPointerMove);
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
</g>