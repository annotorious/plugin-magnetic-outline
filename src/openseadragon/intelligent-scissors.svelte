<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import cv from '@techstark/opencv-js';
  import simplify from 'simplify-js';
  import { debounce } from 'throttle-debounce';
  import { boundsFromPoints, computeArea, distance, ShapeType, isTouch } from '@annotorious/annotorious';
  import type { DrawingMode, Polygon, Transform } from '@annotorious/annotorious';
  import type { MagneticOutlineOpts, Point } from '@/types';
  import { getViewer, lazy } from '@/util';

  const dispatch = createEventDispatcher<{ create: Polygon }>();

  const viewer = getViewer();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;

  export let viewportScale: number;
  export let transform: Transform;
  export let opts: MagneticOutlineOpts;
  // svelte-ignore unused-export-let
  export let drawingMode: DrawingMode;

  let container: SVGGElement;
  let canvas: HTMLCanvasElement;

  let src: cv.Mat | undefined;
  let tool: any | undefined;
  let hasMap = false;

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  let lockedPoints: Point[] = [];
  let nextLeg: Point[] = [];

  let isClosable: boolean = false;

  const CLOSE_DISTANCE = 20;

  $: svg = container?.closest('.a9s-annotationlayer');

  $: points = [...lockedPoints, ...nextLeg];

  $: cursorRadius = 6 / viewportScale;

  const initScissors = () => {
    if (!canvas) return;

    src = cv.imread(canvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

    const edgeFeatureCannyLo = opts?.edgeFeatureCannyLo || 32;
    const edgeFeatureCannyHi = opts?.edgeFeatureCannyHi || 100;  
    const gradientMagnitudeMaxLimit = opts?.gradientMagnitudeMaxLimit || 200;

    // @ts-expect-error
    tool = new cv.segmentation_IntelligentScissorsMB();
    tool.setEdgeFeatureCannyParameters(
      edgeFeatureCannyLo, 
      edgeFeatureCannyHi
    );
    tool.setGradientMagnitudeMaxLimit(gradientMagnitudeMaxLimit);
    tool.applyImage(src);
  }

  const onUpdateViewport = debounce(50, () => {
    initScissors();
    svg?.classList.remove('busy');
  });

  const onAnimationStart = () => {
    src = undefined;
    tool = undefined;
    hasMap = false;

    svg?.classList.add('busy');
  }

  const onPointerDown = (event: Event) => {
    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = event as PointerEvent;
    lastPointerDown = { timeStamp, offsetX, offsetY };
  }

  const onPointerUp = (event: Event) => {
    if (!tool || !lastPointerDown) return;

    const { offsetX, offsetY } = event as PointerEvent;
    const timeDifference = event.timeStamp - lastPointerDown.timeStamp;

    const d = distance(
      [lastPointerDown.offsetX, lastPointerDown.offsetY], 
      [offsetX, offsetY]);

    // Drag not click - ignore, unless mobile
    if (!isTouch && (timeDifference > 300 || d > 15)) return;

    if (isClosable) {
      stopDrawing();
    } else {
      svg?.classList.add('busy');

      // Don't allow viewport change while selecting, because
      // this would complicate things significantly–not supported
      // for now!
      viewer.setMouseNavEnabled(false);

      if (isTouch && lockedPoints.length === 0 && nextLeg.length === 0) {
        // Lock starting point on mobile for visual feedback
        const current = transform.elementToImage(offsetX, offsetY);
        lockedPoints = [current];
      }

      setTimeout(() => {
        // Build the map is a heavy operation! Allow the UI some time to
        // act on the 'busy' class and change cursor, then build the map.
        tool.buildMap(new cv.Point(offsetX * devicePixelRatio, offsetY * devicePixelRatio));
        
        // Update state and remove busy cursor
        hasMap = true;

        svg?.classList.remove('busy');      
        
        lockedPoints = [...lockedPoints, ...nextLeg];
      }, 50);
    }
  }

  const onPointerMove = (event: Event) => {
    if (!src || !tool || !hasMap) return;

    const { offsetX, offsetY } = event as PointerEvent;

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

  const onDblClick = () => {    
    // Require min 3 points and minimum polygon area.
    // Note that the double click will have added a duplicate point!
    const p = lockedPoints.slice(0, -1);
    if (p.length < 3) return;

    const shape: Polygon = {
      type: ShapeType.POLYGON, 
      geometry: {
        bounds: boundsFromPoints(p),
        points: p
      }
    }

    const area = computeArea(shape);
    if (area > 4) {
      hasMap = false;

      lockedPoints = [];
      nextLeg = [];
      isClosable = false;

      viewer.setMouseNavEnabled(true);

      dispatch('create', shape);
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

    hasMap = false;

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

    lazy(() => initScissors());

    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);
    addEventListener('dblclick', onDblClick, true);

    viewer.addHandler('animation-start', onAnimationStart);
    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      svg.classList.remove('intelligent-scissors');

      viewer.removeHandler('animation-start', onAnimationStart);
      viewer.removeHandler('update-viewport', onUpdateViewport);

      // In case anno.cancelDrawing gets called while drawing
      // is in progress
      viewer.setMouseNavEnabled(true);
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

    {#if (isTouch)}
      <circle
        cx={points[0][0]}
        cy={points[0][1]}
        class="touch-start"
        r={cursorRadius} />
    {/if}
  {/if}

  {#if (isClosable)}
    {#if (isTouch)}
      <circle
        cx={points[0][0]}
        cy={points[0][1]}
        class="touch-closable-outer"
        r={4 * cursorRadius} />

      <circle
        cx={points[0][0]}
        cy={points[0][1]}
        class="touch-closable-inner"
        r={4 * cursorRadius} />
    {:else}
      <circle 
        cx={points[0][0]}
        cy={points[0][1]}
        class="closable"
        r={cursorRadius} />
    {/if}
  {/if}
</g>

<style>
  :global(.a9s-annotationlayer.intelligent-scissors) {
    cursor: crosshair;
  }

  :global(.a9s-annotationlayer.intelligent-scissors.busy) {
    cursor: wait;
  }

  circle.touch-closable-outer {
    fill: transparent;
    stroke: #000;
    stroke-width: 3.5;
    vector-effect: non-scaling-stroke;
  }

  circle.touch-closable-inner {
    fill: transparent;
    stroke: #fff;
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }

  circle.closable,
  circle.touch-start {
    fill: #fff;
    stroke: #000;
    stroke-width: 0.75;
  }
</style>