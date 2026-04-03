// ─── Image Presets ───────────────────────────────────────────────────

export interface ImagePreset {
  name: string;
  w: number;
  h: number;
  fit: string;
  fm: string;
  q: number;
}

const BUILT_IN_PRESETS: ImagePreset[] = [
  { name: 'thumbnail', w: 150,  h: 150,  fit: 'cover', fm: 'webp', q: 80 },
  { name: 'small',     w: 400,  h: 300,  fit: 'cover', fm: 'webp', q: 80 },
  { name: 'medium',    w: 800,  h: 600,  fit: 'cover', fm: 'webp', q: 80 },
  { name: 'large',     w: 1200, h: 900,  fit: 'cover', fm: 'webp', q: 80 },
  { name: 'hero',      w: 1920, h: 1080, fit: 'cover', fm: 'webp', q: 85 },
];

/**
 * Get a built-in image preset by name.
 */
export function getPreset(name: string): ImagePreset | undefined {
  return BUILT_IN_PRESETS.find((p) => p.name === name);
}

/**
 * Get all built-in presets.
 */
export function getAllPresets(): ImagePreset[] {
  return [...BUILT_IN_PRESETS];
}
