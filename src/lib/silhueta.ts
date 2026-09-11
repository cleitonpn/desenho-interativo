/** Flood only the transparent area connected to the outside. Enclosed holes
 * belong to the character; gaps between feet and outside feathers stay clear.
 * Input must contain at least one transparent pixel of padding on each edge. */
export function interiorMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const total = width * height,
    exterior = new Uint8Array(total),
    queue = new Int32Array(total);
  let head = 0,
    tail = 0;
  function visit(i: number) {
    if (!exterior[i] && pixels[i * 4 + 3] < 24) {
      exterior[i] = 1;
      queue[tail++] = i;
    }
  }
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++],
      x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < total - width) visit(i + width);
  }
  const mask = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i++) {
    mask[i * 4] = 255;
    mask[i * 4 + 1] = 250;
    mask[i * 4 + 2] = 241;
    // Keep the original antialiasing on the outline, opaque inside it.
    mask[i * 4 + 3] = exterior[i]
      ? 0
      : pixels[i * 4 + 3] >= 24
        ? pixels[i * 4 + 3]
        : 255;
  }
  return mask;
}

const cache = new Map<string, Promise<string>>();
export function silhouetteFor(src: string): Promise<string> {
  const prior = cache.get(src);
  if (prior) return prior;
  const task = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const factor = Math.min(
          1,
          768 / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * factor)),
          height = Math.max(1, Math.round(image.naturalHeight * factor)),
          pad = 4;
        const input = document.createElement("canvas");
        input.width = width + pad * 2;
        input.height = height + pad * 2;
        const ctx = input.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(image, pad, pad, width, height);
        const data = ctx.getImageData(0, 0, input.width, input.height);
        data.data.set(interiorMask(data.data, input.width, input.height));
        ctx.putImageData(data, 0, 0);
        const output = document.createElement("canvas");
        output.width = width;
        output.height = height;
        output
          .getContext("2d")!
          .drawImage(input, pad, pad, width, height, 0, 0, width, height);
        resolve(output.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    image.onerror = () =>
      reject(
        new Error("Não foi possível preparar o preenchimento do personagem."),
      );
    image.src = src;
  });
  cache.set(src, task);
  void task.catch(() => cache.delete(src));
  return task;
}
