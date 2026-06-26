# raphael-devplatform

Developer platform for Raphael — TypeScript and Python SDKs, OpenAPI specs, webhooks.

## Packages

- `@hummingbird/raphael-sdk` — TypeScript client for the Raphael API gateway

```bash
cd packages/raphael-sdk && npm install && npm run build
```

## API base

All SDK calls target `raphael-core` at `http://localhost:8080` (or `RAPHAEL_API_BASE`).
