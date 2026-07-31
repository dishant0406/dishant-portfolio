import { readFile } from 'node:fs/promises';
import { readGcsJsonConfig } from './gcs-json-config';

export const readRawModelConfig = async () => {
  const inlineJson = process.env.MODEL_CONFIG_JSON?.trim();
  if (inlineJson) return JSON.parse(inlineJson);

  const filePath = process.env.MODEL_CONFIG_FILE?.trim();
  if (filePath) return JSON.parse(await readFile(filePath, 'utf8'));

  const gcsUri = process.env.MODEL_CONFIG_GCS_URI?.trim();
  if (gcsUri) return readGcsJsonConfig(gcsUri);

  return undefined;
};
