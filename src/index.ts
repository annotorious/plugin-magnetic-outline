import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { MagneticPolylineTool as ImagePolylineTool } from '@/tools/magnetic-polyline/image';
import { MagneticPolylineTool as OSDPolylineTool } from '@/tools/magnetic-polyline/openseadragon';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    // Register OpenSeadragon version
    anno.registerDrawingTool('smart-polyline', OSDPolylineTool as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('smart-polyline', ImagePolylineTool as typeof SvelteComponent);
  }
}