import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { MagneticPolylineTool as ImagePolylineTool } from '@/image';
import { MagneticPolylineTool as OSDPolylineTool } from '@/openseadragon';
import { setViewer } from './util';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    setViewer(anno.viewer);
    
    // Register OpenSeadragon version
    anno.registerDrawingTool('smart-polyline', OSDPolylineTool as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('smart-polyline', ImagePolylineTool as typeof SvelteComponent);
  }
}