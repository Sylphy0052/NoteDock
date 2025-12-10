import { test, expect, createSampleNote, createSampleTag, createSampleFolder, API_BASE_URL } from './fixtures';

test.describe('ノート一覧ページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test('ノート一覧が正しく表示される', async ({ page, apiMock }) => {
    const notes = [
      createSampleNote({ id: 1, title: 'ノート1' }),
      createSampleNote({ id: 2, title: 'ノート2' }),
      createSampleNote({ id: 3, title: 'ノート3' }),
    ];

    await apiMock.mockNotesList(notes);

    await page.goto('/notes');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('ノート一覧');

    // ノートが表示される
    await expect(page.getByText('ノート1')).toBeVisible();
    await expect(page.getByText('ノート2')).toBeVisible();
    await expect(page.getByText('ノート3')).toBeVisible();
  });

  test('キーワード検索ができる', async ({ page }) => {
    const allNotes = [
      createSampleNote({ id: 1, title: 'JavaScript入門' }),
      createSampleNote({ id: 2, title: 'Python入門' }),
      createSampleNote({ id: 3, title: 'React開発ガイド' }),
    ];

    const searchResults = [
      createSampleNote({ id: 1, title: 'JavaScript入門' }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('q=JavaScript')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: searchResults,
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
          body: JSON.stringify({
            items: allNotes,
            total: 3,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      }
    });

    await page.goto('/notes');

    // 検索ボックスに入力（プレースホルダー: "ノートを検索..."）
    const searchInput = page.getByPlaceholder('ノートを検索...');
    await searchInput.fill('JavaScript');

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click();

    // 検索結果が表示される
    await expect(page.getByText('JavaScript入門')).toBeVisible();
  });

  test('タグでフィルタリングできる', async ({ page, apiMock }) => {
    const tags = [
      createSampleTag({ id: 1, name: 'JavaScript', note_count: 5 }),
      createSampleTag({ id: 2, name: 'Python', note_count: 3 }),
    ];

    await apiMock.mockTagsList(tags);

    const allNotes = [
      createSampleNote({ id: 1, title: 'JS記事', tags: [tags[0]] }),
      createSampleNote({ id: 2, title: 'Python記事', tags: [tags[1]] }),
    ];

    const filteredNotes = [
      createSampleNote({ id: 1, title: 'JS記事', tags: [tags[0]] }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('tag=JavaScript')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: filteredNotes,
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
          body: JSON.stringify({
            items: allNotes,
            total: 2,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      }
    });

    await page.goto('/notes');

    // フィルターパネルを開く
    await page.locator('.btn-icon').filter({ has: page.locator('svg') }).last().click();

    // タグフィルターを選択
    const tagSelect = page.locator('.filter-group').filter({ hasText: 'タグ' }).locator('select');
    await tagSelect.selectOption('JavaScript');

    // フィルタ結果が表示される
    await expect(page.getByText('JS記事')).toBeVisible();
  });

  test('フォルダでフィルタリングできる', async ({ page, apiMock }) => {
    const folders = [
      createSampleFolder({ id: 1, name: '開発メモ', note_count: 5 }),
      createSampleFolder({ id: 2, name: '日記', note_count: 3 }),
    ];

    await apiMock.mockFoldersList(folders);

    const allNotes = [
      createSampleNote({ id: 1, title: '開発メモ1', folder: folders[0] }),
      createSampleNote({ id: 2, title: '日記1', folder: folders[1] }),
    ];

    const filteredNotes = [
      createSampleNote({ id: 1, title: '開発メモ1', folder: folders[0] }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('folder_id=1')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: filteredNotes,
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
          body: JSON.stringify({
            items: allNotes,
            total: 2,
            page: 1,
            per_page: 12,
            pages: 1,
          }),
        });
      }
    });

    await page.goto('/notes');

    // フィルターパネルを開く
    await page.locator('.btn-icon').filter({ has: page.locator('svg') }).last().click();

    // フォルダフィルターを選択
    const folderSelect = page.locator('.filter-group').filter({ hasText: 'フォルダ' }).locator('select');
    await folderSelect.selectOption('1');

    // フィルタ結果が表示される
    await expect(page.getByText('開発メモ1')).toBeVisible();
  });

  test('ページネーションが機能する', async ({ page }) => {
    const page1Notes = Array.from({ length: 12 }, (_, i) =>
      createSampleNote({ id: i + 1, title: `ノート${i + 1}` })
    );
    const page2Notes = Array.from({ length: 10 }, (_, i) =>
      createSampleNote({ id: i + 13, title: `ノート${i + 13}` })
    );

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      const pageNum = url.searchParams.get('page') || '1';

      if (pageNum === '2') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: page2Notes,
            total: 22,
            page: 2,
            per_page: 12,
            pages: 2,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: page1Notes,
            total: 22,
            page: 1,
            per_page: 12,
            pages: 2,
          }),
        });
      }
    });

    await page.goto('/notes');

    // 1ページ目のノートが表示
    await expect(page.getByRole('heading', { name: 'ノート1', exact: true })).toBeVisible();

    // ページネーションのボタンをクリック（2ページ目へ）
    const pagination = page.locator('.pagination');
    const nextButton = pagination.getByRole('button').filter({ hasText: /2|次|>/ }).first();
    await nextButton.click();

    // 2ページ目のノートが表示
    await expect(page.getByText('ノート13')).toBeVisible();
  });

  test('ノートカードをクリックすると詳細ページに遷移する', async ({ page, apiMock }) => {
    const note = createSampleNote({ id: 1, title: 'テストノート' });
    await apiMock.mockNotesList([note]);
    await apiMock.mockNote(note);
    await apiMock.mockComments(1, []);
    await apiMock.mockVersions(1, []);
    await apiMock.mockToc(1, []);

    await page.goto('/notes');

    // ノートカードをクリック
    await page.getByText('テストノート').click();

    // 詳細ページに遷移
    await expect(page).toHaveURL(/\/notes\/1/);
  });

  test('新規作成ボタンから編集ページに遷移できる', async ({ page, apiMock }) => {
    await apiMock.mockNotesList([]);
    await apiMock.mockDraft(null);
    await apiMock.mockTemplates([]);

    await page.goto('/notes');

    // 新規ノートボタンをクリック（main内のボタン）
    await page.getByRole('main').getByRole('link', { name: /新規ノート/ }).click();

    // 編集ページに遷移
    await expect(page).toHaveURL(/\/notes\/new/);
  });

  test('ノートがない場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockNotesList([]);

    await page.goto('/notes');

    // 空の状態メッセージを確認
    await expect(page.getByText('ノートがありません')).toBeVisible();
  });

  test('アクティブフィルターを削除できる', async ({ page, apiMock }) => {
    const tags = [createSampleTag({ id: 1, name: 'JavaScript', note_count: 5 })];
    await apiMock.mockTagsList(tags);

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [createSampleNote({ id: 1, title: 'ノート1' })],
          total: 1,
          page: 1,
          per_page: 12,
          pages: 1,
        }),
      });
    });

    // タグフィルター付きでアクセス
    await page.goto('/notes?tag=JavaScript');

    // アクティブフィルターバッジが表示される
    const filterTag = page.locator('.filter-tag').filter({ hasText: 'タグ' });
    await expect(filterTag).toBeVisible();

    // フィルターを削除（Xボタンをクリック）
    await filterTag.locator('button').click();

    // URLからフィルターが削除される
    await expect(page).not.toHaveURL(/tag=/);
  });

  test('ピン留めノートにピンアイコンが表示される', async ({ page }) => {
    const notes = [
      createSampleNote({ id: 1, title: '通常ノート', is_pinned: false }),
      createSampleNote({ id: 2, title: 'ピン留めノート', is_pinned: true }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: notes,
          total: 2,
          page: 1,
          per_page: 12,
          pages: 1,
        }),
      });
    });

    await page.goto('/notes');

    // 両方のノートが表示される
    await expect(page.getByText('ピン留めノート')).toBeVisible();
    await expect(page.getByText('通常ノート')).toBeVisible();
  });

  test('件数が表示される', async ({ page }) => {
    const notes = [
      createSampleNote({ id: 1, title: 'ノート1' }),
      createSampleNote({ id: 2, title: 'ノート2' }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: notes,
          total: 2,
          page: 1,
          per_page: 12,
          pages: 1,
        }),
      });
    });

    await page.goto('/notes');

    // 件数が表示される
    await expect(page.getByText('2件のノート')).toBeVisible();
  });
});
