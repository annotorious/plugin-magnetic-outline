import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { MagneticOutlineTool as ImageOutlineTool } from '@/image';
import { MagneticOutlineTool as OSDOutlineTool } from '@/openseadragon';
import { setViewer } from './util';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    setViewer(anno.viewer);
    
    // Register OpenSeadragon version
    anno.registerDrawingTool('magnetic-outline', OSDOutlineTool as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('magnetic-outline', ImageOutlineTool as typeof SvelteComponent);
  }
}