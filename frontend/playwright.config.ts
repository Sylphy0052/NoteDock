import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール対応: __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * NoteDock E2E テスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* 最大タイムアウト時間 */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  /* 並列実行 */
  fullyParallel: true,
  /* CI環境では失敗時にリトライしない */
  forbidOnly: !!process.env.CI,
  /* 失敗時のリトライ回数 */
  retries: process.env.CI ? 2 : 0,
  /* 並列ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  /* レポーター */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  /* 共通設定 */
  use: {
    /* ベースURL */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    /* トレース（失敗時のみ） */
    trace: 'on-first-retry',
    /* スクリーンショット（失敗時のみ） */
    screenshot: 'only-on-failure',
    /* ビデオ（失敗時のみ） */
    video: 'on-first-retry',
    /* アクションタイムアウト */
    actionTimeout: 10000,
    /* ナビゲーションタイムアウト */
    navigationTimeout: 15000,
  },
  /* プロジェクト（ブラウザ）設定 */
  /* 注意: Docker環境ではchromiumのみインストールされている */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* モバイルビューポート */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    /* Firefox と WebKit はローカル開発時に有効化 */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  /* 開発サーバー設定 */
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
