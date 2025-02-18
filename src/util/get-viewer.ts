import OpenSeadragon from 'openseadragon';

let current: OpenSeadragon.Viewer;

export const setViewer = (viewer: OpenSeadragon.Viewer) => {
  current = viewer;
}

export const getViewer = () => current;