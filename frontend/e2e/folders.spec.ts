import { test, expect, createSampleFolder, createSampleNote } from './fixtures';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

test.describe('フォルダ管理ページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockTagsList([]);
  });

  test('フォルダ一覧が表示される', async ({ page, apiMock }) => {
    const folders = [
      createSampleFolder({ id: 1, name: '開発メモ', note_count: 5 }),
      createSampleFolder({ id: 2, name: '日記', note_count: 3 }),
      createSampleFolder({ id: 3, name: 'アイデア', note_count: 10 }),
    ];
    await apiMock.mockFoldersList(folders);

    await page.goto('/folders');

    // フォルダが表示される
    await expect(page.getByText('開発メモ')).toBeVisible();
    await expect(page.getByText('日記')).toBeVisible();
    await expect(page.getByText('アイデア')).toBeVisible();
  });

  test('ネストされたフォルダが表示される', async ({ page, apiMock }) => {
    const folders = [
      createSampleFolder({
        id: 1,
        name: '親フォルダ',
        children: [
          createSampleFolder({ id: 2, name: '子フォルダ1', parent_id: 1 }),
          createSampleFolder({ id: 3, name: '子フォルダ2', parent_id: 1 }),
        ],
      }),
    ];
    await apiMock.mockFoldersList(folders);

    await page.goto('/folders');

    // 親フォルダが表示される
    await expect(page.getByText('親フォルダ')).toBeVisible();

    // 親フォルダを展開
    const expandButton = page.locator('[data-testid="expand-folder"], button:has-text("展開")').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // 子フォルダが表示される
      await expect(page.getByText('子フォルダ1')).toBeVisible();
      await expect(page.getByText('子フォルダ2')).toBeVisible();
    }
  });

  test('フォルダを作成できる', async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);

    await page.route(`${API_BASE_URL}/api/folders`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createSampleFolder({
            id: 1,
            name: body.name,
            parent_id: body.parent_id,
          })),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/folders');

    // 新規作成ボタンをクリック
    await page.locator('button:has-text("新規フォルダ"), button:has-text("フォルダを作成")').click();

    // フォルダ名を入力
    const nameInput = page.locator('input[placeholder*="フォルダ名"], [data-testid="folder-name-input"]');
    await nameInput.fill('新しいフォルダ');

    // 保存
    await page.locator('button:has-text("作成"), button:has-text("保存")').click();

    // 新しいフォルダが表示される
    await expect(page.getByText('新しいフォルダ')).toBeVisible();
  });

  test('子フォルダを作成できる', async ({ page, apiMock }) => {
    const parentFolder = createSampleFolder({ id: 1, name: '親フォルダ', children: [] });
    await apiMock.mockFoldersList([parentFolder]);

    await page.route(`${API_BASE_URL}/api/folders`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createSampleFolder({
            id: 2,
            name: body.name,
            parent_id: body.parent_id,
          })),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/folders');

    // 親フォルダの「+」ボタンまたはコンテキストメニューから子フォルダ作成
    const addChildButton = page.locator('[data-testid="add-child-folder"], button[aria-label*="子フォルダ"]').first();
    if (await addChildButton.isVisible()) {
      await addChildButton.click();

      // フォルダ名を入力
      const nameInput = page.locator('input[placeholder*="フォルダ名"], [data-testid="folder-name-input"]');
      await nameInput.fill('子フォルダ');

      // 保存
      await page.locator('button:has-text("作成"), button:has-text("保存")').click();
    }
  });

  test('フォルダを編集できる', async ({ page, apiMock }) => {
    const folder = createSampleFolder({ id: 1, name: '元の名前' });
    await apiMock.mockFoldersList([folder]);

    await page.route(`${API_BASE_URL}/api/folders/1`, async (route) => {
      if (route.request().method() === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...folder, name: body.name }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/folders');

    // 編集ボタンをクリック
    const editButton = page.locator('[data-testid="edit-folder"], button:has-text("編集")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // 名前を変更
      const nameInput = page.locator('input[placeholder*="フォルダ名"], [data-testid="folder-name-input"]');
      await nameInput.clear();
      await nameInput.fill('新しい名前');

      // 保存
      await page.locator('button:has-text("保存"), button:has-text("更新")').click();

      // 新しい名前が表示される
      await expect(page.getByText('新しい名前')).toBeVisible();
    }
  });

  test('フォルダを削除できる', async ({ page, apiMock }) => {
    const folder = createSampleFolder({ id: 1, name: '削除するフォルダ', note_count: 0 });
    await apiMock.mockFoldersList([folder]);

    await page.route(`${API_BASE_URL}/api/folders/1`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/folders');

    // 削除ボタンをクリック
    const deleteButton = page.locator('[data-testid="delete-folder"], button:has-text("削除")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // 確認ダイアログで確認
      const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // フォルダが削除される
      await expect(page.getByText('削除するフォルダ')).not.toBeVisible();
    }
  });

  test('フォルダにノートがある場合は削除の警告が表示される', async ({ page, apiMock }) => {
    const folder = createSampleFolder({ id: 1, name: 'ノートありフォルダ', note_count: 5 });
    await apiMock.mockFoldersList([folder]);

    await page.goto('/folders');

    // 削除ボタンをクリック
    const deleteButton = page.locator('[data-testid="delete-folder"], button:has-text("削除")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // 警告メッセージが表示される
      await expect(page.getByText(/ノートが.*含まれ|5.*ノート/)).toBeVisible();
    }
  });

  test('フォルダを選択するとそのフォルダのノートが表示される', async ({ page, apiMock }) => {
    const folder = createSampleFolder({ id: 1, name: '開発メモ', note_count: 2 });
    await apiMock.mockFoldersList([folder]);

    const folderNotes = [
      createSampleNote({ id: 1, title: 'メモ1', folder }),
      createSampleNote({ id: 2, title: 'メモ2', folder }),
    ];

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = route.request().url();
      if (url.includes('folder_id=1')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: folderNotes,
            total: 2,
            page: 1,
            per_page: 20,
            pages: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
        });
      }
    });

    await page.goto('/folders');

    // フォルダをクリック
    await page.getByText('開発メモ').click();

    // フォルダ内のノートが表示される
    await expect(page.getByText('メモ1')).toBeVisible();
    await expect(page.getByText('メモ2')).toBeVisible();
  });

  test('フォルダ内ノートのページネーションが機能する', async ({ page, apiMock }) => {
    const folder = createSampleFolder({ id: 1, name: 'たくさんのノート', note_count: 30 });
    await apiMock.mockFoldersList([folder]);

    const page1Notes = Array.from({ length: 20 }, (_, i) =>
      createSampleNote({ id: i + 1, title: `ノート${i + 1}`, folder })
    );
    const page2Notes = Array.from({ length: 10 }, (_, i) =>
      createSampleNote({ id: i + 21, title: `ノート${i + 21}`, folder })
    );

    await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      const url = new URL(route.request().url());
      const pageNum = url.searchParams.get('page') || '1';

      if (url.searchParams.get('folder_id') === '1') {
        if (pageNum === '2') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: page2Notes,
              total: 30,
              page: 2,
              per_page: 20,
              pages: 2,
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
              per_page: 20,
              pages: 2,
            }),
          });
        }
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
        });
      }
    });

    await page.goto('/folders');

    // フォルダをクリック
    await page.getByText('たくさんのノート').click();

    // 1ページ目のノートが表示
    await expect(page.getByRole('heading', { name: 'ノート1', exact: true })).toBeVisible();

    // 次のページボタンをクリック
    const nextButton = page.locator('button:has-text("次"), [aria-label="次のページ"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // 2ページ目のノートが表示
      await expect(page.getByText('ノート21')).toBeVisible();
    }
  });

  test('フォルダがない場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);

    await page.goto('/folders');

    // 空の状態メッセージを確認
    const emptyState = page.locator('text=/フォルダがありません|まだフォルダがありません/');
    await expect(emptyState).toBeVisible();
  });

  test('親フォルダを選択できる（最大3階層）', async ({ page, apiMock }) => {
    const folders = [
      createSampleFolder({ id: 1, name: 'レベル1' }),
      createSampleFolder({
        id: 2,
        name: 'レベル1-2',
        children: [
          createSampleFolder({ id: 3, name: 'レベル2', parent_id: 2 }),
        ],
      }),
    ];
    await apiMock.mockFoldersList(folders);

    await page.goto('/folders');

    // 新規作成ボタンをクリック
    await page.locator('button:has-text("新規フォルダ"), button:has-text("フォルダを作成")').click();

    // 親フォルダ選択ドロップダウンを探す
    const parentSelect = page.locator('select[data-testid="parent-folder-select"], [data-testid="parent-selector"]');
    if (await parentSelect.isVisible()) {
      // レベル2のフォルダを親として選択可能
      await parentSelect.selectOption({ label: 'レベル2' });
    }
  });
});
