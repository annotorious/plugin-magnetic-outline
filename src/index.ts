import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { IntelligentScissors as ImageScissors } from '@/image';
import { MagneticCursor as ImageMagneticCursor } from '@/image';
import { IntelligentScissors as OSDScissors } from '@/openseadragon';
import { MagneticCursor as OSDMagneticCursor } from '@/openseadragon';
import { setViewer } from '@/util';
import type { MagneticOutlineOpts } from './types';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator,
  opts: MagneticOutlineOpts = {}
) => {
  if ('viewer' in anno) {
    setViewer(anno.viewer);

    // Register OpenSeadragon version
    anno.registerDrawingTool('intelligent-scissors', OSDScissors as typeof SvelteComponent, opts);
    anno.registerDrawingTool('magnetic-cursor', OSDMagneticCursor as typeof SvelteComponent, opts);
  } else {
    // Register Image version
    anno.registerDrawingTool('intelligent-scissors', ImageScissors as typeof SvelteComponent);
    anno.registerDrawingTool('magnetic-cursor', ImageMagneticCursor as typeof SvelteComponent);
  }
}