# VNV Copilot

**An AI financial copilot for freelancers, built on PayPal.** Chat with it in plain language to draft, send and track PayPal invoices. It never touches your PayPal account without your explicit approval.

Built by [VNV-Tech](https://github.com/VNV-Tech) for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

> 🚧 Work in progress. The submission deadline is Nov 12, 2026.

## Features (MVP)

- **AI copilot chat (Claude):** ask questions about your income and invoices, or tell it what to bill.
- **Freelance invoicing (PayPal Invoicing API):** create, send, remind and track invoices in MXN (USD coming soon).
- **Human-in-the-loop actions:** every action on PayPal is shown as a confirmation card that you approve or cancel.
- **Real-time updates (PayPal Webhooks):** invoice status changes as soon as clients pay.

## Tech stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router                         |
| Backend  | Node.js, Express 5, TypeScript, Zod                                   |
| AI       | Claude (Anthropic API)                                                |
| Payments | PayPal REST APIs (Sandbox): OAuth 2.0, Invoicing, Webhooks            |
| Hosting  | Render                                                                |

## Getting started

### Prerequisites

- Node.js **20.19+** and npm
- A [PayPal Developer](https://developer.paypal.com) account with a Sandbox app (Client ID and Secret)
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/VNV-Tech/PayPal-AI-Hackathon.git
cd PayPal-AI-Hackathon
npm ci
cp .env.example .env   # then fill in your keys
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3000/api/health
- PayPal credentials check: http://localhost:3000/api/paypal/ping

### Production build

```bash
npm run build
NODE_ENV=production npm start   # Express serves the API and the React build on PORT
```

### Testing webhooks locally

PayPal needs a public HTTPS URL. Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/):

```bash
npm run tunnel   # prints https://<random>.trycloudflare.com
```

Register `https://<random>.trycloudflare.com/webhooks/paypal` in your Sandbox app's webhooks, then put its ID in `PAYPAL_WEBHOOK_ID`.

## Project structure

```
client/   React app (UI, chat, invoices)
server/   Express API (PayPal client, webhooks, AI)
docs/     Research, design and pitch material
```

## Security

- Sandbox only: the server refuses to start with live PayPal credentials in production.
- Secrets are loaded from environment variables and never sent to the browser.
- PayPal webhook signatures are verified; unverified events are dropped in production.
- Helmet security headers, rate limiting, request size limits and input validation (Zod).

## License

[MIT](LICENSE)
