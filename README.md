# Briki

Insurance proposal platform built with Next.js, Supabase, and OpenAI.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Development Commands

```bash
pnpm dev           # Start development server
pnpm dev:clean     # Clean .next cache and restart (for HMR issues)
pnpm build         # Build for production
pnpm start         # Start production server
```

## Security & PII Policies

Before deploying to production, **always run the security check**:

```bash
./scripts/security-check.sh
```

This verifies:
- No PII in logs (emails, passwords, tokens)
- Service keys not exposed to client
- No hardcoded secrets
- Proper error handling without stack traces

📚 **Documentation**:
- [Quick Start Guide](docs/SECURITY_QUICK_START.md) - 5 minute setup
- [Security Policies](docs/SECURITY_PII_POLICIES.md) - Complete rules and checklist
- [Implementation Examples](docs/SECURITY_IMPLEMENTATION_EXAMPLE.md) - Code examples
- [Contact Form Guide](docs/CONTACT_FORM.md) - Architecture, validation & anti-spam

See [docs/SECURITY_SUMMARY.md](docs/SECURITY_SUMMARY.md) for full details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Project Structure

```
briki/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   ├── components/       # React components
│   ├── lib/              # Utilities (including secure-logging.ts)
│   └── messages/         # i18n translations
├── docs/                 # Documentation (security, deployment, etc.)
├── scripts/              # Automation scripts (security-check.sh, etc.)
├── prisma/               # Database schema
└── supabase/             # Supabase migrations
```

## Deploy on Vercel

**Pre-deploy checklist**:
1. Run `./scripts/security-check.sh` ✅
2. Verify environment variables are set
3. Run `pnpm build` and check for errors
4. Test in staging environment

Deploy to [Vercel Platform](https://vercel.com).

See [docs/DEPLOY_PROD.md](docs/DEPLOY_PROD.md) for detailed deployment instructions.
