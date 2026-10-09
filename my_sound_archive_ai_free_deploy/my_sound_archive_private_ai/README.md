# My Sound Archive AI (free-tier deployment starter)

A private, mobile-first music library with cloud sync and AI-assisted tagging.

## Features

- Mobile-friendly music library UI.
- Add/edit/delete tracks, favorites, search, platform filters.
- Embed supported music players; use the original platform when embedding is not available.
- Cloudflare Pages Functions API and D1 shared storage.
- AI button on each track: proposes genres, moods, energy, listening context, and tags.
- AI classification uses only track metadata (title, artist, optional note/group). It does **not** analyze the actual audio in this version.
- Local browser cache and JSON backup.

## Zero-cost setup (subject to provider limits and plan changes)

1. Create a **private** GitHub repository and upload the files in this folder to its root.
2. In Cloudflare Dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Configure no framework, build command `exit 0`, output directory `.`. Deploy.
4. Create a Cloudflare D1 database and run `schema.sql`.
5. In Pages project settings, add a D1 binding named `DB`.
6. In Pages project settings, add an encrypted secret named `GEMINI_API_KEY`. Generate a key in Google AI Studio. Never place the key in `index.html`, GitHub, or a public repo.
7. Configure Cloudflare Access for the entire site hostname, including `/api/*`, allowing only your own email. Do this before adding personal library data.
8. Redeploy if needed, sign in, then test adding a track on one device and seeing it on another.
9. Click **Phân loại bằng AI** on a track. Tags are saved with the track and sync across devices.

## Official documentation

- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Pages Functions: https://developers.cloudflare.com/pages/functions/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Access one-time PIN: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- Gemini API pricing/free tier: https://ai.google.dev/gemini-api/docs/pricing
- Google AI Studio: https://aistudio.google.com/

## Important limits and privacy

- This is a deployable starter, **not a live website**. Publishing and account authorization must be completed in your own service accounts.
- Cloudflare Access must protect both the website and every API endpoint.
- Free AI quota is limited and can change. Gemini's free tier may use submitted prompts to improve Google products; this classifier sends song title, artist, optional group, and your optional note. Do not put sensitive private information in notes. Check current terms and limits before use.
- Classification is based on metadata, so genre/mood can be wrong, especially for ambiguous titles. It does not claim to listen to the actual track.
- Audio analysis would require a separate supported audio source and rights to process it. This version does not download music or bypass platform protections.
- Shared library uses last-write-wins when multiple devices save simultaneously. Avoid editing at the exact same time; export backups regularly.
- For a personal small library, free tiers may be sufficient, but providers can change limits and terms.

## Database schema

`schema.sql` creates a single-row JSON document. This is intentionally simple for one owner. A larger multi-user app should use per-track rows and proper per-user authorization.
