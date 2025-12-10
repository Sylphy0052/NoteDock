import { test, expect, createSampleNote, API_BASE_URL } from './fixtures';

test.describe('ホームページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test('ホームページが正しく表示される', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });

    await page.goto('/');

    // タイトルを確認（「ホーム」）
    await expect(page.locator('h1')).toContainText('ホーム');

    // 新規ノートボタンが表示される
    await expect(page.getByRole('link', { name: /新規ノート/ }).first()).toBeVisible();

    // クイックアクションが表示される
    await expect(page.getByText('新規ノート作成')).toBeVisible();
    await expect(page.getByText('ノート一覧')).toBeVisible();
  });

  test('ピン留めされたノートが表示される', async ({ page }) => {
    const pinnedNotes = [
      createSampleNote({ id: 1, title: 'ピン留めノート1', is_pinned: true }),
      createSampleNote({ id: 2, title: 'ピン留めノート2', is_pinned: true }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('is_pinned=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: pinnedNotes,
            total: 2,
            page: 1,
            per_page: 6,
            pages: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
        });
      }
    });

    await page.goto('/');

    // ピン留めセクションを確認
    await expect(page.getByText('ピン留めノート1')).toBeVisible();
    await expect(page.getByText('ピン留めノート2')).toBeVisible();
  });

  test('最近更新されたノートが表示される', async ({ page }) => {
    const recentNotes = [
      createSampleNote({ id: 1, title: '最近のノート1' }),
      createSampleNote({ id: 2, title: '最近のノート2' }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('is_pinned=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: recentNotes,
            total: 2,
            page: 1,
            per_page: 6,
            pages: 1,
          }),
        });
      }
    });

    await page.goto('/');

    // 最近更新されたノートを確認
    await expect(page.getByText('最近のノート1')).toBeVisible();
    await expect(page.getByText('最近のノート2')).toBeVisible();
  });

  test('新規ノートリンクから編集ページに遷移できる', async ({ page, apiMock }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
    await apiMock.mockDraft(null);
    await apiMock.mockTemplates([]);

    await page.goto('/');

    // 新規ノートリンク（ヘッダーのボタン）をクリック
    await page.getByRole('link', { name: /新規ノート/ }).first().click();

    // 編集ページに遷移
    await expect(page).toHaveURL(/\/notes\/new/);
  });

  test('ノート一覧リンクから一覧ページに遷移できる', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });

    await page.goto('/');

    // ノート一覧リンクをクリック（クイックアクション内）
    await page.locator('.quick-action-card').filter({ hasText: 'ノート一覧' }).click();

    // 一覧ページに遷移
    await expect(page).toHaveURL(/\/notes$/);
  });

  test('ゴミ箱リンクからゴミ箱ページに遷移できる', async ({ page, apiMock }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
    await apiMock.mockTrash([]);

    await page.goto('/');

    // ゴミ箱リンクをクリック（クイックアクション内）
    await page.locator('.quick-action-card').filter({ hasText: 'ゴミ箱' }).click();

    // ゴミ箱ページに遷移
    await expect(page).toHaveURL(/\/trash/);
  });

  test('リンクマップリンクからリンクマップページに遷移できる', async ({ page, apiMock }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });
    await apiMock.mockLinkmap({ nodes: [], links: [] });

    await page.goto('/');

    // リンクマップリンクをクリック（クイックアクション内）
    await page.locator('.quick-action-card').filter({ hasText: 'リンクマップ' }).click();

    // リンクマップページに遷移
    await expect(page).toHaveURL(/\/linkmap/);
  });

  test('ノートカードをクリックするとノート詳細ページに遷移する', async ({ page, apiMock }) => {
    const note = createSampleNote({ id: 1, title: 'テストノート' });

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [note],
          total: 1,
          page: 1,
          per_page: 6,
          pages: 1,
        }),
      });
    });

    await apiMock.mockNote(note);
    await apiMock.mockComments(1, []);
    await apiMock.mockVersions(1, []);
    await apiMock.mockToc(1, []);

    await page.goto('/');

    // ノートカードをクリック
    await page.getByText('テストノート').first().click();

    // ノート詳細ページに遷移
    await expect(page).toHaveURL(/\/notes\/1/);
  });

  test('ノートがない場合は空の状態が表示される', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 6, pages: 0 }),
      });
    });

    await page.goto('/');

    // 空の状態メッセージを確認
    await expect(page.getByText('ノートがありません')).toBeVisible();
  });
});
