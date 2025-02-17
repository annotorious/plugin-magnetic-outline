export const getImageData = (image: HTMLImageElement) => {
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');

  if (!ctx)
    throw 'Error creating buffer canvas context';

  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}