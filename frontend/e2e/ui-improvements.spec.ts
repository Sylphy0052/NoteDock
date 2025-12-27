import { test, expect, API_BASE_URL } from './fixtures';

test.describe('UI改善 - テーマ切替', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('ダークモードに切り替えられる', async ({ page }) => {
    await page.goto('/');

    // 初期状態（ライトモード）の確認
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-theme', 'dark');

    // ダークモード切替ボタンをクリック
    await page.getByRole('button', { name: /ダークモードに切替/ }).click();

    // ダークモードになっていることを確認
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('ライトモードに切り替えられる', async ({ page }) => {
    await page.goto('/');

    // まずダークモードに切り替え
    await page.getByRole('button', { name: /ダークモードに切替/ }).click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // ライトモードに切り替え
    await page.getByRole('button', { name: /ライトモードに切替/ }).click();

    // ライトモードになっていることを確認
    await expect(html).not.toHaveAttribute('data-theme', 'dark');
  });

  test('テーマ設定がローカルストレージに保存される', async ({ page }) => {
    await page.goto('/');

    // ダークモードに切り替え
    await page.getByRole('button', { name: /ダークモードに切替/ }).click();

    // ローカルストレージの確認
    const theme = await page.evaluate(() => localStorage.getItem('notedock-theme'));
    expect(theme).toBe('dark');
  });
});

test.describe('UI改善 - キーボードショートカット', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('?キーでキーボードショートカットヘルプが開く', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // ?キーを押す（キーボードイベントをディスパッチ）
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // キーボードショートカットモーダルが開く
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText('キーボードショートカット');

    // グローバルショートカットが表示される
    await expect(modal).toContainText('グローバル');
    await expect(modal).toContainText('クイックオープン');

    // エディタショートカットが表示される
    await expect(modal).toContainText('エディタ');
    await expect(modal).toContainText('保存');
    await expect(modal).toContainText('太字');
  });

  test('Escキーでショートカットヘルプが閉じる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // ?キーを押してモーダルを開く
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Escキーで閉じる
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('Ctrl+Kでクイックオープンが開く', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // Ctrl+Kを押す
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // クイックオープンモーダルが開く
    await expect(page.locator('.quick-open-overlay')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('ノートを検索...')).toBeVisible();
  });

  test('Escキーでクイックオープンが閉じる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // Ctrl+Kでクイックオープンを開く
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });
    await expect(page.locator('.quick-open-overlay')).toBeVisible({ timeout: 5000 });

    // Escキーで閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('.quick-open-overlay')).not.toBeVisible({ timeout: 5000 });
  });

  test('入力フィールドでは?キーでモーダルが開かない', async ({ page, isMobile }) => {
    // サイドバーの検索フィールドはモバイルでは非表示
    test.skip(isMobile, 'Sidebar search field is hidden on mobile');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 検索入力フィールドにフォーカス
    await page.getByPlaceholder('検索...').click();

    // ?キーを押す（入力フィールド内なので無視される）
    await page.keyboard.type('?');

    // モーダルが開いていないことを確認（少し待つ）
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('UI改善 - クイックオープン', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test('クイックオープンボタンをクリックでモーダルが開く', async ({ page, isMobile }) => {
    // クイックオープンボタンはサイドバー/ヘッダー内にあり、モバイルでは非表示
    test.skip(isMobile, 'Quick open button is in sidebar which is hidden on mobile');

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });

    await page.goto('/');

    // クイックオープンボタンをクリック
    await page.getByRole('button', { name: /クイックオープン/ }).click();

    // モーダルが開く
    await expect(page.locator('.quick-open-overlay')).toBeVisible();
    await expect(page.getByPlaceholder('ノートを検索...')).toBeVisible();
  });

  test('クイックオープンにショートカットヒントが表示される', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // クイックオープンを開く（キーボードイベントをディスパッチ）
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });
    await expect(page.locator('.quick-open-overlay')).toBeVisible({ timeout: 5000 });

    // ショートカットヒントが表示される
    await expect(page.getByText('↑ ↓ 移動')).toBeVisible();
    await expect(page.getByText('Enter 開く')).toBeVisible();
    await expect(page.getByText('Esc 閉じる')).toBeVisible();
  });
});

test.describe('UI改善 - ヘッダー', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('ロゴが正しく表示される', async ({ page }) => {
    await page.goto('/');

    // ロゴが表示される
    const logo = page.getByRole('link', { name: /NoteDock/ });
    await expect(logo).toBeVisible();
  });

  test('ロゴクリックでホームに戻る', async ({ page, apiMock }) => {
    await apiMock.mockTrash([]);
    await page.goto('/trash');

    // ロゴをクリック
    await page.getByRole('link', { name: /NoteDock/ }).click();

    // ホームに戻る
    await expect(page).toHaveURL('/');
  });

  test('キーボードショートカットボタンが表示される', async ({ page }) => {
    await page.goto('/');

    // キーボードボタンが表示される
    const keyboardButton = page.getByRole('button', { name: /キーボードショートカット/ });
    await expect(keyboardButton).toBeVisible();
  });

  test('キーボードショートカットボタンクリックでモーダルが開く', async ({ page }) => {
    await page.goto('/');

    // キーボードボタンをクリック
    await page.getByRole('button', { name: /キーボードショートカット/ }).click();

    // モーダルが開く
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('キーボードショートカット');
  });
});

test.describe('UI改善 - サイドバー', () => {
  // サイドバーはモバイルでは非表示のためスキップ
  test.skip(({ isMobile }) => isMobile, 'Sidebar is hidden on mobile');

  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('新規ノートボタンが表示される', async ({ page }) => {
    await page.goto('/');

    // 新規ノートボタンが表示される
    const newNoteButton = page.locator('.new-note-button');
    await expect(newNoteButton).toBeVisible();
  });

  test('ナビゲーションアイテムがすべて表示される', async ({ page }) => {
    await page.goto('/');

    // 各ナビゲーションアイテムが表示される
    await expect(page.locator('.nav-item').filter({ hasText: 'ホーム' })).toBeVisible();
    await expect(page.locator('.nav-item').filter({ hasText: 'ノート' })).toBeVisible();
    await expect(page.locator('.nav-item').filter({ hasText: 'タグ' })).toBeVisible();
    await expect(page.locator('.nav-item').filter({ hasText: 'フォルダ' })).toBeVisible();
    await expect(page.locator('.nav-item').filter({ hasText: 'ゴミ箱' })).toBeVisible();
    await expect(page.locator('.nav-item').filter({ hasText: 'リンクマップ' })).toBeVisible();
  });

  test('アクティブなナビゲーションアイテムがハイライトされる', async ({ page }) => {
    await page.goto('/');

    // ホームページのナビゲーションアイテムがアクティブ
    const homeLink = page.locator('.nav-item').filter({ hasText: 'ホーム' });
    await expect(homeLink).toHaveClass(/active/);
  });
});

test.describe('UI改善 - モーダルアニメーション', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('モーダルオーバーレイクリックでモーダルが閉じる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // キーボードショートカットモーダルを開く
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // オーバーレイをクリック
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

    // モーダルが閉じる
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('閉じるボタンでモーダルが閉じる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // キーボードショートカットモーダルを開く
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 閉じるボタンをクリック（aria-label="閉じる"）
    await page.getByLabel('閉じる').click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('UI改善 - クイックアクションカード', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('クイックアクションカードが表示される', async ({ page }) => {
    await page.goto('/');

    // クイックアクションセクションが表示される
    await expect(page.getByText('クイックアクション')).toBeVisible();

    // 各カードが表示される
    await expect(page.locator('.quick-action-card').filter({ hasText: '新規ノート作成' })).toBeVisible();
    await expect(page.locator('.quick-action-card').filter({ hasText: 'ノート一覧' })).toBeVisible();
    await expect(page.locator('.quick-action-card').filter({ hasText: 'リンクマップ' })).toBeVisible();
    await expect(page.locator('.quick-action-card').filter({ hasText: 'ゴミ箱' })).toBeVisible();
  });
});

test.describe('UI改善 - アクセシビリティ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
  });

  test('モーダルにaria属性が設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページにフォーカスを当てる
    await page.locator('body').click();

    // キーボードショートカットモーダルを開く
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // モーダルにaria属性が設定されている
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('ボタンにtitle属性が設定されている', async ({ page }) => {
    await page.goto('/');

    // テーマ切替ボタンにtitle属性がある
    const themeButton = page.getByRole('button', { name: /モードに切替/ });
    await expect(themeButton).toHaveAttribute('title');

    // キーボードショートカットボタンにtitle属性がある
    const keyboardButton = page.getByRole('button', { name: /キーボードショートカット/ });
    await expect(keyboardButton).toHaveAttribute('title');
  });
});
