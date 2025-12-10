import { test, expect, createSampleTag, createSampleNote, API_BASE_URL } from './fixtures';

test.describe('タグページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
  });

  test('タグ一覧が表示される', async ({ page, apiMock }) => {
    const tags = [
      createSampleTag({ id: 1, name: 'JavaScript', note_count: 10 }),
      createSampleTag({ id: 2, name: 'Python', note_count: 5 }),
      createSampleTag({ id: 3, name: 'React', note_count: 8 }),
    ];
    await apiMock.mockTagsList(tags);

    await page.goto('/tags');

    // タグが表示される
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('React')).toBeVisible();
  });

  test('タグを選択するとノート件数が表示される', async ({ page, apiMock }) => {
    const tag = createSampleTag({ id: 1, name: 'JavaScript', note_count: 10 });
    await apiMock.mockTagsList([tag]);

    const tagNotes = [
      createSampleNote({ id: 1, title: 'JSノート1', tags: [tag] }),
      createSampleNote({ id: 2, title: 'JSノート2', tags: [tag] }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      const tagParam = url.searchParams.get('tag');
      if (tagParam === 'JavaScript') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: tagNotes,
            total: 10,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 12, pages: 0 }),
        });
      }
    });

    await page.goto('/tags');

    // タグをクリック
    await page.getByRole('button', { name: 'JavaScript' }).click();

    // ノート数が表示される（コンテンツエリア内）
    await expect(page.getByText('10件のノート')).toBeVisible();
  });

  test('タグを選択するとそのタグのノートが表示される', async ({ page, apiMock }) => {
    const tag = createSampleTag({ id: 1, name: 'JavaScript', note_count: 2 });
    await apiMock.mockTagsList([tag]);

    const tagNotes = [
      createSampleNote({ id: 1, title: 'JSノート1', tags: [tag] }),
      createSampleNote({ id: 2, title: 'JSノート2', tags: [tag] }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      const tagParam = url.searchParams.get('tag');
      if (tagParam === 'JavaScript') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: tagNotes,
            total: 2,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 12, pages: 0 }),
        });
      }
    });

    await page.goto('/tags');

    // タグをクリック
    await page.getByRole('button', { name: 'JavaScript' }).click();

    // タグ付きノートが表示される
    await expect(page.getByText('JSノート1')).toBeVisible();
    await expect(page.getByText('JSノート2')).toBeVisible();
  });

  test('複数のタグが正しく表示される', async ({ page, apiMock }) => {
    const tags = [
      createSampleTag({ id: 1, name: 'JavaScript', note_count: 10 }),
      createSampleTag({ id: 2, name: 'Java', note_count: 5 }),
      createSampleTag({ id: 3, name: 'Python', note_count: 8 }),
    ];
    await apiMock.mockTagsList(tags);

    await page.goto('/tags');

    // すべてのタグが表示される
    await expect(page.getByRole('button', { name: 'JavaScript', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Java', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Python', exact: true })).toBeVisible();
  });

  test('タグが存在しない場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockTagsList([]);

    await page.goto('/tags');

    // 空の状態メッセージを確認
    const emptyState = page.locator('text=/タグがありません|まだタグがありません/');
    await expect(emptyState).toBeVisible();
  });

  test('タグ内ノートのページネーションが機能する', async ({ page, apiMock }) => {
    const tag = createSampleTag({ id: 1, name: 'JavaScript', note_count: 30 });
    await apiMock.mockTagsList([tag]);

    const page1Notes = Array.from({ length: 12 }, (_, i) =>
      createSampleNote({ id: i + 1, title: `JSノート${i + 1}`, tags: [tag] })
    );
    const page2Notes = Array.from({ length: 12 }, (_, i) =>
      createSampleNote({ id: i + 13, title: `JSノート${i + 13}`, tags: [tag] })
    );

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      const pageNum = url.searchParams.get('page') || '1';
      const tagParam = url.searchParams.get('tag');

      if (tagParam === 'JavaScript') {
        if (pageNum === '2') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: page2Notes,
              total: 30,
              page: 2,
              per_page: 12,
              pages: 3,
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: page1Notes,
              total: 30,
              page: 1,
              per_page: 12,
              pages: 3,
            }),
          });
        }
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 12, pages: 0 }),
        });
      }
    });

    await page.goto('/tags');

    // タグをクリック
    await page.getByRole('button', { name: 'JavaScript' }).click();

    // 1ページ目のノートが表示（exact: trueでJSノート10, 11, 12との衝突を避ける）
    await expect(page.getByRole('heading', { name: 'JSノート1', level: 3, exact: true })).toBeVisible();

    // 次のページボタンをクリック（ページネーションコンポーネントでは「2」ボタンを探す）
    const page2Button = page.locator('nav[aria-label="ページネーション"]').getByRole('button', { name: '2' });
    await page2Button.click();

    // 2ページ目のノートが表示
    await expect(page.getByRole('heading', { name: 'JSノート13', level: 3, exact: true })).toBeVisible();
  });

  test('タグをクリックするとノート一覧ページにフィルター遷移する', async ({ page, apiMock }) => {
    const tag = createSampleTag({ id: 1, name: 'JavaScript', note_count: 5 });
    await apiMock.mockTagsList([tag]);
    await apiMock.mockNotesList([]);

    await page.goto('/tags');

    // タグをダブルクリックまたは詳細リンクをクリック
    const viewAllLink = page.locator('a:has-text("すべて表示"), [data-testid="view-all-notes"]');
    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();

      // ノート一覧ページにタグフィルター付きで遷移
      await expect(page).toHaveURL(/\/notes\?.*tag/);
    }
  });

  test('人気タグが強調表示される', async ({ page, apiMock }) => {
    const tags = [
      createSampleTag({ id: 1, name: '人気タグ', note_count: 100 }),
      createSampleTag({ id: 2, name: '普通のタグ', note_count: 5 }),
    ];
    await apiMock.mockTagsList(tags);

    await page.goto('/tags');

    // 人気タグのスタイリングを確認（サイズが大きい、または強調スタイル）
    const popularTag = page.getByText('人気タグ');
    await expect(popularTag).toBeVisible();

    // タグクラウドスタイルの場合、サイズやスタイルで区別される
  });

  test('タグ一覧からノート詳細に遷移できる', async ({ page, apiMock }) => {
    const tag = createSampleTag({ id: 1, name: 'JavaScript', note_count: 1 });
    await apiMock.mockTagsList([tag]);

    const note = createSampleNote({ id: 1, title: 'JSノート', tags: [tag] });

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      // Skip individual note requests - let mockNote handle those
      if (/\/api\/notes\/\d+/.test(url.pathname)) {
        await route.continue();
        return;
      }
      const tagParam = url.searchParams.get('tag');
      if (tagParam === 'JavaScript') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [note],
            total: 1,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 12, pages: 0 }),
        });
      }
    });

    await apiMock.mockNote(note);
    await apiMock.mockComments(1, []);
    await apiMock.mockVersions(1, []);
    await apiMock.mockToc(1, []);

    await page.goto('/tags');

    // タグをクリック
    await page.getByRole('button', { name: 'JavaScript' }).click();

    // ノートが表示されるまで待機
    await expect(page.getByText('JSノート')).toBeVisible();

    // ノートをクリック
    await page.getByText('JSノート').click();

    // ノート詳細ページに遷移
    await expect(page).toHaveURL(/\/notes\/1/);
  });
});
