import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { IntelligentScissors as ImageScissors } from '@/image';
import { MagneticCursor as ImageMagneticCursor } from '@/image';
import { IntelligentScissors as OSDScissors } from '@/openseadragon';
import { MagneticCursor as OSDMagneticCursor } from '@/openseadragon';
import { setViewer } from '@/util';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    setViewer(anno.viewer);

    // Register OpenSeadragon version
    anno.registerDrawingTool('intelligent-scissors', OSDScissors as typeof SvelteComponent);
    anno.registerDrawingTool('magnetic-cursor', OSDMagneticCursor as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('intelligent-scissors', ImageScissors as typeof SvelteComponent);
    anno.registerDrawingTool('magnetic-cursor', ImageMagneticCursor as typeof SvelteComponent);
  }
}