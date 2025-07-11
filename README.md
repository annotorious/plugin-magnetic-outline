# Annotorious Magnetic Outline Tools

A plugin for [Annotorious](https://annotorious.dev) that adds two smart polygon drawing tools:

- __Magnetic Cursor.__ Makes the mouse cursor snap to corner points of nearby objects detected
  in the image.
- __Intelligent Scissors.__ A Photoshop-style intelligent scissors tools for tracing the outlines 
  of objects in the image.

> **Important:** this plugin only supports `@annotorious/openseadragon` at this time. Support for 
> plain (JPEG, PNG,...) images is not yet implemented. [Get in touch via the forum](https://github.com/orgs/annotorious/discussions) if you are interested in using this with the `@annotorious/annotorious` or `@annotorious/react` packages.

## Usage

```sh
npm install @annotorious/plugin-magnetic-outline
```

```js
import OpenSeadragon from 'openseadragon';
import { createOSDAnnotator } from '@annotorious/openseadragon';
import { mountPlugin } from '@annotorious/plugin-magnetic-outline';

import '@annotorious/openseadragon/annotorious-openseadragon.css';

// ...

const viewer = OpenSeadragon({
  // init OSD viewer normally  
});

const anno = createOSDAnnotator(viewer, {
  // init Annotorious for OSD normally
});

// Will mount the plugin and register
// both drawing tools.
mountPlugin(anno);

anno.setDrawingTool('magnetic-cursor'); // or 'intelligent-scissors'
```