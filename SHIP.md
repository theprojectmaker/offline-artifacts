# Getting Offline Artifacts onto your iPhone

Everything is built and tested except the parts that need **your Apple login**.
The app is linked to the EAS project `@solomonsasson/offline-artifacts`
(id `a6b40bb4-1b5f-4293-8e77-666e12766b57`), bundle id `com.solyapps.offlineartifacts`.

## Fastest way (about 20 minutes, two commands)

Uses 1 of your 15 free Expo cloud iOS builds this month. Run these in a terminal.

```bash
cd C:\Users\Soly\Desktop\tests\offline-artifacts-native
```

```bash
npx eas-cli@latest build -p ios --profile production
```

- Log in to your Apple account when asked and say **yes** to letting EAS create the
  certificate and provisioning profile.

When the build finishes:

```bash
npx eas-cli@latest submit -p ios --latest
```

- Pick **create a new app** if asked. If "Offline Artifacts" is taken on the App Store it
  adds a suffix; that's fine, it is never published.
- After Apple processes it (5-15 min), open **TestFlight** on your iPhone and install it.
- Copy the `ascAppId` it prints into `eas.json` under `submit.production.ios`
  (needed for the GitHub route below).

## Free rebuilds later (GitHub Actions, no Expo quota)

Only after the steps above (credentials have to exist first):

1. In PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\setup-github.ps1`
   (creates the **public** repo theprojectmaker/offline-artifacts, since private repos can't
   get free macOS minutes on this account, and asks for your Expo token).
2. Build + send to TestFlight:

```bash
gh workflow run ios-testflight.yml -R theprojectmaker/offline-artifacts -f submit=true
```

## How the whole thing fits together

1. `/offlineapp <claude.ai artifact URL>` (a Claude Code slash command/mod) reads one of your
   own published Artifacts, uploads its raw HTML to the Cloudflare Worker at
   `tests/offline-artifacts-worker`, and gets back a 4-letter code.
2. Type that code into this app. It fetches the HTML once, saves it to the device
   (`expo-file-system`, under `offline-artifacts/<CODE>.html`), and opens it in a `WebView`
   pointed at the local file.
3. From then on the saved item is listed on the home screen and opens with **zero network
   calls** — airplane mode, no Wi-Fi, app restarts, all fine. Only the first download needs
   a connection.

Codes expire after 60 days on the Worker side (KV TTL), but anything already downloaded to
the phone stays, since the device never re-fetches it.

## Good to know

- Only your *own* Claude Artifacts work with `/offlineapp` — a shared artifact you don't own
  only returns an AI-generated summary, not the raw page, so there isn't enough to recreate
  it offline.
- The Worker's `workers.dev` subdomain has drifted before on this account. If downloads start
  failing with a network error, check `tests/offline-artifacts-worker` is still deployed at the
  URL in `src/config.ts` and redeploy/update if it moved.
