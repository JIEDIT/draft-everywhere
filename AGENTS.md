# Draft Everywhere — Public Core Guide

- This repository is the canonical source for the Local Mode UI, generation engine, provider adapters, platform validation, and public assets.
- Local configuration flows only from `.env.example` to `.env.local`; never add another env-file convention or commit credentials.
- The public Worker supports Local Mode only. Do not add hosted quotas, session/IP limiters, Cloudflare account identifiers, custom domains, fixed provider targets, or private deployment instructions.
- Keep `GET /api/capabilities` and `POST /api/generate` compatible with the shared browser UI.
- Shared changes land here first and are released with immutable version tags. Private hosted deployments consume a tagged release rather than copying files.
- Run `npm test` and `npm run pack:check` before release. Confirm a fresh clone can start using only the README.
