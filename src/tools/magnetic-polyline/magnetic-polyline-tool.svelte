<script lang="ts">
  import { onMount } from 'svelte';
  import type { DrawingMode, Transform } from '@annotorious/annotorious';
  import { getImageData, getKeypoints } from '../../util';

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let drawingMode: DrawingMode
  export let transform: Transform;

  let container: SVGGElement;

  let x: number;

  let y: number;

  let r: number;

  const onPointerMove = (evt: Event) => {
    // console.log('move', evt);
  }

  onMount(() => {
    const svg = container.closest('.a9s-annotationlayer');
    const siblings = Array.from(svg?.parentElement?.children || []);

    const image = siblings.find(n => n.nodeName.toUpperCase() === 'IMG') as HTMLImageElement;
    const data = getImageData(image);

    getKeypoints(data).then(keypoints => {
      console.log('got keypoints', keypoints);
    });

    addEventListener('pointermove', onPointerMove);
  });
</script>

<g 
  bind:this={container}
  class="a9s-annotation">
  
</g>