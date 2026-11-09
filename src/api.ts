import { WORKER_URL } from './config';

export type FetchedArtifact = {
  code: string;
  html: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
};

export class ArtifactApiError extends Error {}

export async function fetchArtifactByCode(rawCode: string): Promise<FetchedArtifact> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) {
    throw new ArtifactApiError('Enter the 4-letter code exactly as shown.');
  }

  let response: Response;
  try {
    response = await fetch(`${WORKER_URL}/api/fetch/${code}`);
  } catch {
    throw new ArtifactApiError('Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 404) {
    throw new ArtifactApiError('That code was not found. It may have expired or been mistyped.');
  }
  if (!response.ok) {
    throw new ArtifactApiError(`Server error (${response.status}). Try again in a moment.`);
  }

  const data = await response.json();
  return data as FetchedArtifact;
}
