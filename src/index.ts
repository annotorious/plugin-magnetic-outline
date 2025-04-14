import type { SvelteComponent } from 'svelte';
import type { ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { IntelligenceScissors as ImageScissors } from '@/image';
import { MagneticCursor as ImageMagneticCursor } from '@/image';
import { MagneticCursor as OSDMagneticCursor } from '@/openseadragon';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  if ('viewer' in anno) {
    // Register OpenSeadragon version
    anno.registerDrawingTool('magnetic-outline', OSDMagneticCursor as typeof SvelteComponent);
  } else {
    // Register Image version
    anno.registerDrawingTool('magnetic-cursor', ImageMagneticCursor as typeof SvelteComponent);
    anno.registerDrawingTool('intelligent-scissors', ImageScissors as typeof SvelteComponent);
  }
}