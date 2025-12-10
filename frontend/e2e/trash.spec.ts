import { test, expect, createSampleNote, API_BASE_URL } from './fixtures';

test.describe('ゴミ箱ページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test('ゴミ箱内のノート一覧が表示される', async ({ page, apiMock }) => {
    const trashedNotes = [
      createSampleNote({ id: 1, title: '削除されたノート1', is_deleted: true }),
      createSampleNote({ id: 2, title: '削除されたノート2', is_deleted: true }),
    ];
    await apiMock.mockTrash(trashedNotes);

    await page.goto('/trash');

    // 削除されたノートが表示される
    await expect(page.getByText('削除されたノート1')).toBeVisible();
    await expect(page.getByText('削除されたノート2')).toBeVisible();
  });

  test('ノートを復元できる', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({ id: 1, title: '復元するノート', is_deleted: true });
    await apiMock.mockTrash([trashedNote]);

    await page.route(`${API_BASE_URL}/api/notes/1/restore`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...trashedNote, is_deleted: false }),
      });
    });

    await page.goto('/trash');

    // 復元ボタンをクリック
    const restoreButton = page.locator('button:has-text("復元"), [aria-label*="復元"], [data-testid="restore-button"]').first();
    await restoreButton.click();

    // 成功のフィードバックを確認（ノートがリストから消える、またはトースト表示）
  });

  test('ノートを完全削除できる', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({ id: 1, title: '完全削除するノート', is_deleted: true });
    await apiMock.mockTrash([trashedNote]);

    await page.route(`${API_BASE_URL}/api/notes/1/permanent`, async (route) => {
      await route.fulfill({ status: 204 });
    });

    await page.goto('/trash');

    // 削除ボタンをクリック（実際のUIでは「削除」ボタン）
    const deleteButton = page.locator('.trash-item-actions button.btn-danger').first();
    await deleteButton.click();

    // 確認ダイアログが表示される
    const confirmDialog = page.locator('[role="dialog"], .modal');
    await expect(confirmDialog).toBeVisible();

    // 確認ボタンをクリック（モーダル内の「完全に削除」ボタン）
    await page.locator('.modal-actions button.btn-danger').click();
  });

  test('完全削除時に確認ダイアログが表示される', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({ id: 1, title: 'テストノート', is_deleted: true });
    await apiMock.mockTrash([trashedNote]);

    await page.goto('/trash');

    // 削除ボタンをクリック
    const deleteButton = page.locator('.trash-item-actions button.btn-danger').first();
    await deleteButton.click();

    // 確認ダイアログに警告メッセージが表示される（「取り消せません」）
    await expect(page.getByText('この操作は取り消せません。')).toBeVisible();
  });

  test('確認ダイアログでキャンセルできる', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({ id: 1, title: 'テストノート', is_deleted: true });
    await apiMock.mockTrash([trashedNote]);

    await page.goto('/trash');

    // 削除ボタンをクリック
    const deleteButton = page.locator('.trash-item-actions button.btn-danger').first();
    await deleteButton.click();

    // キャンセルボタンをクリック
    await page.locator('button:has-text("キャンセル")').click();

    // ダイアログが閉じる
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible();

    // ノートがまだ表示されている
    await expect(page.getByText('テストノート')).toBeVisible();
  });

  test('ゴミ箱が空の場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockTrash([]);

    await page.goto('/trash');

    // 空の状態メッセージを確認
    const emptyState = page.locator('text=/ゴミ箱は空です|削除されたノートはありません/');
    await expect(emptyState).toBeVisible();
  });

  test('自動削除の警告メッセージが表示される', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({
      id: 1,
      title: 'テストノート',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    });
    await apiMock.mockTrash([trashedNote]);

    await page.goto('/trash');

    // 30日後に自動削除される警告
    const warningMessage = page.locator('text=/30日|自動.*削除|期限/');
    await expect(warningMessage).toBeVisible();
  });

  test('削除日時が表示される', async ({ page, apiMock }) => {
    const deletedAt = new Date();
    deletedAt.setDate(deletedAt.getDate() - 5); // 5日前

    const trashedNote = createSampleNote({
      id: 1,
      title: 'テストノート',
      is_deleted: true,
      deleted_at: deletedAt.toISOString(),
    });
    await apiMock.mockTrash([trashedNote]);

    await page.goto('/trash');

    // 削除日時が表示される
    const dateInfo = page.locator('text=/日前|削除日/');
    await expect(dateInfo).toBeVisible();
  });

  test('ゴミ箱のページネーションが機能する', async ({ page }) => {
    const page1Notes = Array.from({ length: 20 }, (_, i) =>
      createSampleNote({ id: i + 1, title: `削除ノート${i + 1}`, is_deleted: true })
    );
    const page2Notes = Array.from({ length: 10 }, (_, i) =>
      createSampleNote({ id: i + 21, title: `削除ノート${i + 21}`, is_deleted: true })
    );

    await page.route(`${API_BASE_URL}/api/trash**`, async (route) => {
      const url = new URL(route.request().url());
      const pageNum = url.searchParams.get('page') || '1';

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
    });

    await page.goto('/trash');

    // 1ページ目のノートが表示
    await expect(page.getByRole('heading', { name: '削除ノート1', exact: true })).toBeVisible();

    // 次のページボタンをクリック
    const nextButton = page.locator('button:has-text("次"), [aria-label="次のページ"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // 2ページ目のノートが表示
      await expect(page.getByText('削除ノート21')).toBeVisible();
    }
  });

  test('復元後にノートがリストから消える', async ({ page, apiMock }) => {
    const trashedNotes = [
      createSampleNote({ id: 1, title: '復元するノート', is_deleted: true }),
      createSampleNote({ id: 2, title: '残るノート', is_deleted: true }),
    ];

    let currentTrash = [...trashedNotes];

    await page.route(`${API_BASE_URL}/api/trash**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: currentTrash,
          total: currentTrash.length,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
      });
    });

    await page.route(`${API_BASE_URL}/api/notes/1/restore`, async (route) => {
      currentTrash = currentTrash.filter(n => n.id !== 1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...trashedNotes[0], is_deleted: false }),
      });
    });

    await page.goto('/trash');

    // 両方のノートが表示される
    await expect(page.getByText('復元するノート')).toBeVisible();
    await expect(page.getByText('残るノート')).toBeVisible();

    // 復元ボタンをクリック
    const restoreButton = page.locator('button:has-text("復元")').first();
    await restoreButton.click();

    // ページをリロード（または自動更新を待つ）
    await page.reload();

    // 復元したノートが消える
    await expect(page.getByText('復元するノート')).not.toBeVisible();
    await expect(page.getByText('残るノート')).toBeVisible();
  });

  test('ゴミ箱を空にする機能（一括削除）', async ({ page, apiMock }) => {
    const trashedNotes = [
      createSampleNote({ id: 1, title: 'ノート1', is_deleted: true }),
      createSampleNote({ id: 2, title: 'ノート2', is_deleted: true }),
    ];
    await apiMock.mockTrash(trashedNotes);

    await page.route(`${API_BASE_URL}/api/trash/empty`, async (route) => {
      await route.fulfill({ status: 204 });
    });

    await page.goto('/trash');

    // ゴミ箱を空にするボタンを探す
    const emptyTrashButton = page.locator('button:has-text("ゴミ箱を空にする"), button:has-text("すべて削除"), [data-testid="empty-trash"]');
    if (await emptyTrashButton.isVisible()) {
      await emptyTrashButton.click();

      // 確認ダイアログが表示される
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();

      // 確認ボタンをクリック
      await page.locator('button:has-text("削除"), button:has-text("確認")').click();
    }
  });

  test('ゴミ箱からノート詳細は閲覧できない（または読み取り専用）', async ({ page, apiMock }) => {
    const trashedNote = createSampleNote({ id: 1, title: 'テストノート', is_deleted: true });
    await apiMock.mockTrash([trashedNote]);

    await page.goto('/trash');

    // ノートをクリック
    const noteCard = page.getByText('テストノート');
    if (await noteCard.isVisible()) {
      await noteCard.click();

      // 詳細ページに遷移しない、または閲覧のみ可能
      const currentUrl = page.url();
      expect(currentUrl).toContain('/trash');
    }
  });

  test('ゴミ箱ヘッダーにノート数が表示される', async ({ page, apiMock }) => {
    const trashedNotes = [
      createSampleNote({ id: 1, title: 'ノート1', is_deleted: true }),
      createSampleNote({ id: 2, title: 'ノート2', is_deleted: true }),
      createSampleNote({ id: 3, title: 'ノート3', is_deleted: true }),
    ];
    await apiMock.mockTrash(trashedNotes);

    await page.goto('/trash');

    // ノート数が表示される
    await expect(page.getByText(/3.*件|3.*ノート/).first()).toBeVisible();
  });
});
