// This account's Cloudflare workers.dev subdomain has drifted before. If
// fetching a code starts failing with a network error, check whether the
// worker moved (see tests/offline-artifacts-worker) and update this.
export const WORKER_URL = 'https://offline-artifacts.greatneck.workers.dev';
