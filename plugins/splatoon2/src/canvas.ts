import Canvas, {
  CanvasRenderingContext2D,
  SkImage,
} from "https://deno.land/x/canvas@v.1.0.5/mod.ts";

export async function read(path: string) {
  const url = new URL(path, import.meta.url);

  if (url.protocol === "file:") {
    return await Deno.readFile(url);
  }

  const res = await fetch(url);
  return await res.arrayBuffer();
}

const Fonts = {
  Roboto: "./font/DroidSansFallback.ttf",
  Paintball: "./font/Paintball_Beta_4a.otf",
  HaiPai: "./font/HaiPaiQiangDiaoGunShiJian-2.otf",
};
const readFont = Promise.all(
  Object.entries(Fonts).map(async ([key, path]) =>
    [key, await read(path)] as const
  ),
);

export const getCanvas = async (width: number, height: number) => {
  const canvas = Canvas.MakeCanvas(width, height);
  const fonts = await readFont;

  for (const [family, bytes] of fonts) {
    canvas.loadFont(bytes, { family });
  }
  return canvas;
};

export const loadImage = (bytes: Uint8Array | ArrayBuffer): SkImage => {
  const img = Canvas.MakeImageFromEncoded(bytes);
  if (!img) {
    throw new Error("Failed to load image");
  }
  return img;
};
export type { CanvasRenderingContext2D, SkImage };
