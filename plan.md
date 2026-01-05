 # E2E & Unit Testing Plan for SquirrAI

     ## Overview
     Add comprehensive testing infrastructure before launch using **Playwright**
     (E2E) and **Vitest** (Unit tests) for critical paths.

     ---

     ## Test Directory Structure

     ```
     GenerateByAI/
     ├── __tests__/                    # Unit tests (Vitest)
     │   ├── setup.ts                  # Global test setup
     │   ├── mocks/                    # Mock implementations
     │   │   ├── supabase.ts           # Supabase client mocks
     │   │   ├── pakasir.ts            # Payment gateway mocks
     │   │   ├── sumopod.ts            # OpenAI/Sumopod mocks
     │   │   └── kling.ts              # Kling API mocks
     │   ├── lib/                      # Utility tests
     │   │   ├── tokens.test.ts
     │   │   └── rate-limit.test.ts
     │   └── api/                      # API route tests
     │       ├── generate-image.test.ts
     │       ├── generate-video.test.ts
     │       ├── checkout.test.ts
     │       └── webhooks-pakasir.test.ts
     ├── e2e/                          # E2E tests (Playwright)
     │   ├── fixtures/
     │   │   └── auth.fixture.ts
     │   ├── auth.spec.ts
     │   ├── payment.spec.ts
     │   ├── image-generation.spec.ts
     │   └── video-generation.spec.ts
     ├── playwright.config.ts
     ├── vitest.config.ts
     └── .env.test
     ```

     ---

     ## Implementation Steps

     ### Step 1: Install Dependencies
     ```bash
     npm install -D @playwright/test vitest @vitest/coverage-v8 @vitejs/plugin-react
     npx playwright install chromium
     ```

     ### Step 2: Create Configuration Files

     **Files to create:**
     - `vitest.config.ts` - Vitest config with Node environment for API routes
     - `playwright.config.ts` - Playwright config with Next.js webServer
     - `.env.test` - Test environment variables

     ### Step 3: Create Mock Implementations

     **`__tests__/mocks/supabase.ts`**
     - Mock `createClient` and `createAdminClient`
     - Mock auth methods: `getUser`, `signInWithPassword`, `signUp`, `signOut`
     - Mock database operations: `from().select().eq().single()`
     - Mock storage: `upload`, `getPublicUrl`

     **`__tests__/mocks/pakasir.ts`**
     - Mock `generatePaymentUrl`, `createTransaction`
     - Mock `getTransactionDetail`, `validateWebhook`
     - Mock webhook payload for completed payment

     **`__tests__/mocks/sumopod.ts`**
     - Mock OpenAI `images.generate` response (URL and base64)

     **`__tests__/mocks/kling.ts`**
     - Mock `imageToVideo`, `textToVideo`, `getTaskResult`
     - Mock polling responses (submitted → succeed)

     ### Step 4: Write Unit Tests

     **`__tests__/lib/tokens.test.ts`**
     - Test `getTokenCost()` for all quality levels (standard: 10, high: 20, ultra:
     40)
     - Test video cost (100 tokens)
     - Test edit cost (10 tokens)

     **`__tests__/lib/rate-limit.test.ts`**
     - Test first request allowed
     - Test tracking multiple requests
     - Test blocking when limit exceeded
     - Test reset after window expires

     **`__tests__/api/generate-image.test.ts`**
     - 401 for unauthenticated requests
     - 400 for missing/empty prompt
     - 400 for prompt > 2000 chars
     - 400 for invalid quality parameter
     - 403 for insufficient tokens

     **`__tests__/api/webhooks-pakasir.test.ts`**
     - Process completed payment and add tokens
     - Ignore non-completed payments
     - Validate webhook signature
     - Reject mismatched amounts
     - Idempotency (no double-credit)

     ### Step 5: Write E2E Tests

     **`e2e/auth.spec.ts`**
     - Registration form displays correctly
     - Password mismatch shows error
     - Short password shows error
     - Login form displays correctly
     - Invalid credentials shows error
     - Protected routes redirect to login
     - Google OAuth button visible

     **`e2e/payment.spec.ts`**
     - Pricing page shows all 4 packages (Starter, Basic, Pro, Business)
     - Prices displayed in IDR format
     - Popular package highlighted
     - Token costs shown
     - Checkout requires authentication

     **`e2e/image-generation.spec.ts`**
     - Generation interface displays
     - Quality options visible (Standard, High, Ultra)
     - Token costs displayed
     - Empty prompt validation

     **`e2e/video-generation.spec.ts`**
     - Video mode accessible
     - Duration options (5s, 10s)
     - Aspect ratio options (16:9, 9:16, 1:1)
     - Audio option visible

     ### Step 6: Update package.json Scripts

     ```json
     {
       "scripts": {
         "test": "npm run test:unit && npm run test:e2e",
         "test:unit": "vitest run",
         "test:unit:watch": "vitest",
         "test:unit:coverage": "vitest run --coverage",
         "test:e2e": "playwright test",
         "test:e2e:ui": "playwright test --ui",
         "test:e2e:debug": "playwright test --debug"
       }
     }
     ```

     ### Step 7: Update CI/CD Pipeline

     Update `.github/workflows/ci.yml` to add:
     - `unit-tests` job running `npm run test:unit`
     - `e2e-tests` job running `npm run test:e2e`
     - Upload Playwright report as artifact
     - Add test secrets for Supabase, Pakasir test credentials

     ---

     ## Critical Files to Modify

     | File | Action |
     |------|--------|
     | `package.json` | Add test dependencies and scripts |
     | `.github/workflows/ci.yml` | Add test jobs |
     | `.gitignore` | Add test artifacts (playwright-report, coverage) |

     ## New Files to Create

     | File | Purpose |
     |------|---------|
     | `vitest.config.ts` | Vitest configuration |
     | `playwright.config.ts` | Playwright configuration |
     | `.env.test` | Test environment variables |
     | `__tests__/setup.ts` | Global test setup |
     | `__tests__/mocks/*.ts` | Mock implementations |
     | `__tests__/lib/*.test.ts` | Utility unit tests |
     | `__tests__/api/*.test.ts` | API route unit tests |
     | `e2e/*.spec.ts` | E2E test files |
     | `e2e/fixtures/*.ts` | Playwright fixtures |

     ---

     ## Test Coverage Goals

     ### Unit Tests (Critical)
     - [x] Token calculations - `lib/tokens.ts`
     - [x] Rate limiting - `lib/rate-limit.ts`
     - [x] Image generation API - `app/api/generate-image/route.ts`
     - [x] Payment webhook - `app/api/webhooks/pakasir/route.ts`

     ### E2E Tests (Critical Path)
     - [x] Authentication flow (login, register, protected routes)
     - [x] Payment flow (pricing page, checkout initiation)
     - [x] Image generation UI
     - [x] Video generation UI

     ---

     ## Environment Setup Required

     Before running E2E tests in CI:
     1. Create test user in Supabase
     2. Add GitHub secrets:
        - `TEST_SUPABASE_URL`
        - `TEST_SUPABASE_ANON_KEY`
        - `TEST_SUPABASE_SERVICE_KEY`
        - `E2E_TEST_USER_EMAIL`
        - `E2E_TEST_USER_PASSWORD`
        - `TEST_PAKASIR_SLUG` (sandbox)
        - `TEST_PAKASIR_API_KEY` (sandbox)

     ---

     ## Estimated Test Count
     - **Unit Tests**: ~25-30 tests
     - **E2E Tests**: ~20-25 tests
     - **Total**: ~45-55 tests covering critical paths