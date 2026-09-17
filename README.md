# AI Story Forge

Веб-платформа: идея текстом → короткий визуальный комикс. Монорепозиторий: Next.js (`apps/web`), NestJS (`apps/api`), общие контракты (`packages/contracts`).

## Локальный запуск

Нужны Node 24+, pnpm 11, Docker Desktop (демон запущен).

```powershell
Copy-Item .env.example .env
pnpm install
pnpm infra:up
pnpm dev
```

- инфраструктура: Postgres `localhost:5432`, Redis `localhost:6379`
- web: http://localhost:3000
- api health: http://localhost:3001/v1/health

Остановить контейнеры: `pnpm infra:down`. Данные Postgres/Redis живут в Docker volumes, пока не сделаете `docker compose down -v`.
