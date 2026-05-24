import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Converts a local image URI (file://, content://, ph://, etc.)
 * into a base64 data URI that can be safely stored in the database
 * and displayed on any device.
 *
 * On web, the URI from expo-image-picker is already a blob/data URL,
 * so we return it as-is.
 *
 * @param {string} uri  - local URI from expo-image-picker
 * @returns {Promise<string>} base64 data URI
 */
export async function uriToBase64DataUri(uri) {
  if (!uri) return null;

  // Already a data URI or https URL — nothing to do
  if (uri.startsWith('data:') || uri.startsWith('https://') || uri.startsWith('http://')) {
    return uri;
  }

  // On web, expo-image-picker returns blob URLs; convert via fetch
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return uri; // fallback — return as-is
    }
  }

  // Native: read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Determine MIME type from extension (default jpeg)
  const ext = uri.split('.').pop()?.toLowerCase();
  const mime =
    ext === 'png'  ? 'image/png'  :
    ext === 'gif'  ? 'image/gif'  :
    ext === 'webp' ? 'image/webp' :
    'image/jpeg';

  return `data:${mime};base64,${base64}`;
}

/**
 * Converts an array of local URIs to base64 data URIs, filtering out nulls.
 * @param {Array<string|null>} uris
 * @returns {Promise<string[]>}
 */
export async function urisToBase64DataUris(uris) {
  const valid = uris.filter(Boolean);
  const results = await Promise.all(valid.map(uriToBase64DataUri));
  return results.filter(Boolean);
}
