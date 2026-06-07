// Canvas utilities — optimised for vertical strip frames (e.g. 400×2048)

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Creates a 3-photo vertical strip and overlays the chosen frame.
 * Strip dimensions match the frame's aspect ratio so the overlay fits perfectly.
 */
export async function createPhotoStrip(
  photos: string[],
  frameSrc: string | null,
  outputWidth = 600
): Promise<string> {
  // Load frame first to get its aspect ratio
  let frameImg: HTMLImageElement | null = null;
  let frameAspect = 400 / 2048; // default: portrait strip ~1:5.12

  if (frameSrc) {
    try {
      frameImg = await loadImage(frameSrc);
      frameAspect = frameImg.naturalWidth / frameImg.naturalHeight;
    } catch {
      frameImg = null;
    }
  }

  const outputHeight = Math.round(outputWidth / frameAspect);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // --- Layout: 3 photos stacked vertically with small margins ---
  const numPhotos = Math.min(photos.length, 3);
  const marginH = Math.round(outputWidth * 0.05);   // 5% horizontal margin
  const marginTop = Math.round(outputHeight * 0.04); // 4% top margin
  const marginBottom = Math.round(outputHeight * 0.04);
  const gap = Math.round(outputHeight * 0.015);
  const photoW = outputWidth - marginH * 2;
  const totalPhotoH = outputHeight - marginTop - marginBottom - gap * (numPhotos - 1);
  const photoH = Math.floor(totalPhotoH / numPhotos);

  for (let i = 0; i < numPhotos; i++) {
    const x = marginH;
    const y = marginTop + i * (photoH + gap);
    try {
      const img = await loadImage(photos[i]);
      // Draw photo cropped/fitted into slot (cover)
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const slotAspect = photoW / photoH;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgAspect > slotAspect) {
        // Image wider — crop sides
        sw = img.naturalHeight * slotAspect;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        // Image taller — crop top/bottom
        sh = img.naturalWidth / slotAspect;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
    } catch {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(x, y, photoW, photoH);
    }
  }

  // Overlay frame on top (full canvas)
  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, outputWidth, outputHeight);
  }

  return canvas.toDataURL("image/png", 1.0);
}

/**
 * Captures a single frame from the webcam video element.
 * Mirrors horizontally for selfie feel.
 */
export function captureFromVideo(
  video: HTMLVideoElement,
  width?: number,
  height?: number
): string {
  const w = width || video.videoWidth || 1280;
  const h = height || video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
