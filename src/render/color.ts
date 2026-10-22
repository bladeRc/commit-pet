// Small colour helpers shared by the renderers.

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** Blends `hex` toward `toward` by `amount` (0 = unchanged, 1 = `toward`). */
export function mix(hex: string, toward: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const out = [16, 8, 0].map((shift) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  });
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Keeps language colours readable: darkens pale ones on light, lightens dark ones on dark. */
export function readableOn(color: string, theme: "light" | "dark"): string {
  const lum = luminance(color);
  if (theme === "light" && lum > 0.45) return mix(color, "#000000", 0.4);
  if (theme === "dark" && lum < 0.12) return mix(color, "#ffffff", 0.5);
  return color;
}

export function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
