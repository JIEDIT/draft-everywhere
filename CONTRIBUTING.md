# Contributing

## Development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Use placeholder credentials in tests and documentation. Run `npm test` before
opening a pull request. Keep changes focused, preserve the dependency-free
browser application, and add regression coverage for behavior changes.

Changes to platform constraints, prompts, output parsing, or provider adapters
can alter generated output and should explain the intended compatibility impact.
