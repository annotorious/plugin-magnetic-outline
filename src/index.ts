import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { MagneticOutlineTool as ImageOutlineTool } from '@/image';
import { MagneticOutlineTool as OSDOutlineTool } from '@/openseadragon';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    // Register OpenSeadragon version
    anno.registerDrawingTool('magnetic-outline', OSDOutlineTool as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('magnetic-outline', ImageOutlineTool as typeof SvelteComponent);
  }
}