// Runs before any test file imports app code. config/env.ts validates
// required environment variables at import time (and calls process.exit(1)
// if they're missing) — these dummy-but-valid values let that validation
// pass so unit tests can import modules that transitively depend on env.ts,
// without needing a real .env file or a real database connection.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret-at-least-32-chars';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'test-webhook-secret';
process.env.NODE_ENV ??= 'test';
