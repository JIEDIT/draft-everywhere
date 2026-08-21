# Draft Everywhere

Turn one raw draft into editable, platform-native versions for X, Substack,
Medium, LinkedIn, and Xiaohongshu. This public repository runs locally with
your own Anthropic, OpenAI, or Gemini API key.

## Requirements

- Node.js 20 or newer
- An API key from at least one supported provider

## Quick Start

```sh
git clone https://github.com/JIEDIT/draft-everywhere.git
cd draft-everywhere
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:8787`. Select a configured provider, select a model,
enter a draft, choose up to five platforms, and generate.

## Configure Providers

Edit `.env.local` and add only the keys you intend to use:

```dotenv
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```

Create keys in the official [Anthropic Console](https://console.anthropic.com/),
[OpenAI Platform](https://platform.openai.com/api-keys), or
[Google AI Studio](https://aistudio.google.com/app/apikey). Provider usage is
billed directly by the provider under your account.

Keys stay in the local Worker environment and are never sent to browser code or
stored in browser persistence. Draft content is sent to the provider you select
for generation.

## Verify Setup

```sh
curl -s http://127.0.0.1:8787/api/capabilities
npm test
```

The capabilities response should report `"mode":"local"` and show which
providers are configured without returning any key values.

## Troubleshooting

- **Generate is disabled:** confirm the selected provider has a non-empty key in `.env.local`, then restart Wrangler.
- **Wrong runtime behavior:** use `npm run dev`; this public Worker is always Local Mode and has no demo-mode switch.
- **Port already in use:** stop the other Wrangler process before restarting.
- **SQLite `database is locked`:** stop duplicate Wrangler processes and remove only local `.wrangler/` state if the lock remains.
- **Repeated reloads:** keep generated or runtime-written files outside `public/`.

## License

Source code is available under the MIT License. JIEDIT names, logos, and branded
artwork remain reserved as described in `NOTICE`.
