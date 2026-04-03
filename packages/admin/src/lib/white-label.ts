import { apiGet, apiPatch } from './api';

/**
 * White-label configuration for a space.
 * Mirrors the server-side WhiteLabelConfig type.
 */
export interface WhiteLabelConfig {
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  favicon?: string;
  customDomain?: string;
}

/**
 * Fetch the white-label config for the current space from the CMA API.
 * Returns null if the request fails (e.g. no config set yet).
 */
export async function getWhiteLabelConfig(): Promise<WhiteLabelConfig | null> {
  try {
    return await apiGet<WhiteLabelConfig>('/cma/v1/white-label');
  } catch {
    return null;
  }
}

/**
 * Update the white-label config for the current space.
 */
export async function updateWhiteLabelConfig(
  config: Partial<WhiteLabelConfig>,
): Promise<WhiteLabelConfig> {
  return apiPatch<WhiteLabelConfig>('/cma/v1/white-label', config);
}
