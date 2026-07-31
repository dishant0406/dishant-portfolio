type GcsLocation = {
  bucket: string;
  object: string;
};

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseGcsUri = (uri: string): GcsLocation => {
  if (!uri.startsWith('gs://')) {
    throw new Error('MODEL_CONFIG_GCS_URI must start with gs://');
  }

  const withoutScheme = uri.slice('gs://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  const bucket = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
  const object = slashIndex === -1 ? '' : withoutScheme.slice(slashIndex + 1);

  if (!bucket || !object) {
    throw new Error('MODEL_CONFIG_GCS_URI must include bucket and object path');
  }

  return { bucket, object };
};

const getMetadataAccessToken = async () => {
  const response = await fetch(METADATA_TOKEN_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
  });

  if (!response.ok) {
    throw new Error(`Metadata token request failed with ${response.status}`);
  }

  const tokenPayload: unknown = await response.json();
  const accessToken = isRecord(tokenPayload) ? tokenPayload.access_token : undefined;

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Metadata token response did not include access_token');
  }

  return accessToken;
};

export const readGcsJsonConfig = async (gcsUri: string) => {
  const { bucket, object } = parseGcsUri(gcsUri);
  const accessToken = await getMetadataAccessToken();
  const url = new URL(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}`,
  );
  url.searchParams.set('alt', 'media');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`GCS model config request failed with ${response.status}`);
  }

  return response.json();
};
