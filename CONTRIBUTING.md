# Contributing to PrintCraft Studio

Thanks for wanting to help! This project is a small monorepo:

- `apps/web` – Next.js app
- `apps/agent` – Node print agent (raw ESC/POS/ZPL to OS printer)
- `packages/encoders` – shared ESC/POS + ZPL helpers

## Quick start (dev)

```bash
pnpm i
pnpm dlx prisma generate
pnpm dlx prisma migrate dev -n init  # first time only

# two terminals:
pnpm dev:agent
pnpm dev:web
```
