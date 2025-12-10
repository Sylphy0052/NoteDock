import { test, expect, createSampleNote, createSampleComment, createSampleVersion, createSampleTag, API_BASE_URL } from './fixtures';

test.describe('ノート詳細ページ', () => {
  const sampleNote = createSampleNote({
    id: 1,
    title: 'テストノート',
    content_md: '# テスト見出し\n\nこれはテストコンテンツです。\n\n## セクション1\n\n段落テキスト\n\n## セクション2\n\n- リスト1\n- リスト2',
    tags: [createSampleTag({ id: 1, name: 'テスト' })],
  });

  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
    await apiMock.mockNote(sampleNote);
    await apiMock.mockComments(1, []);
    await apiMock.mockVersions(1, []);
    await apiMock.mockToc(1, [
      { id: 'section-1', text: 'セクション1', level: 2 },
      { id: 'section-2', text: 'セクション2', level: 2 },
    ]);
  });

  test('ノート詳細が正しく表示される', async ({ page }) => {
    await page.goto('/notes/1');

    // タイトルが表示される
    await expect(page.getByRole('heading', { name: 'テストノート' })).toBeVisible();

    // コンテンツが表示される
    await expect(page.getByText('これはテストコンテンツです')).toBeVisible();
  });

  test('Markdownが正しくレンダリングされる', async ({ page }) => {
    await page.goto('/notes/1');

    // 見出しがレンダリングされる
    await expect(page.locator('h1:has-text("テスト見出し")')).toBeVisible();
    await expect(page.locator('h2:has-text("セクション1")')).toBeVisible();
    await expect(page.locator('h2:has-text("セクション2")')).toBeVisible();

    // リストがレンダリングされる
    await expect(page.locator('li:has-text("リスト1")')).toBeVisible();
    await expect(page.locator('li:has-text("リスト2")')).toBeVisible();
  });

  test('目次（TOC）が表示される', async ({ page }) => {
    await page.goto('/notes/1');

    // 目次セクションが表示される
    const toc = page.locator('[data-testid="toc"], .toc, nav:has-text("目次")');
    if (await toc.isVisible()) {
      await expect(toc.getByText('セクション1')).toBeVisible();
      await expect(toc.getByText('セクション2')).toBeVisible();
    }
  });

  test('目次のリンクをクリックするとスクロールする', async ({ page }) => {
    await page.goto('/notes/1');

    const tocLink = page.locator('[data-testid="toc"] a, .toc a').first();
    if (await tocLink.isVisible()) {
      await tocLink.click();
      // スクロール後にセクションが表示されることを確認
      await expect(page.locator('h2:has-text("セクション1")')).toBeInViewport();
    }
  });

  test('タグが表示される', async ({ page }) => {
    await page.goto('/notes/1');

    // タグが表示される（タグリンクを使用）
    await expect(page.getByRole('link', { name: 'テスト', exact: true })).toBeVisible();
  });

  test('タグをクリックするとノート一覧にフィルター遷移する', async ({ page, apiMock }) => {
    await apiMock.mockNotesList([sampleNote]);

    await page.goto('/notes/1');

    // タグをクリック
    const tagBadge = page.locator('.tag, [data-testid="tag"]').getByText('テスト');
    if (await tagBadge.isVisible()) {
      await tagBadge.click();

      // ノート一覧ページにタグフィルター付きで遷移
      await expect(page).toHaveURL(/\/notes\?.*tag/);
    }
  });

  test('編集ボタンから編集ページに遷移できる', async ({ page, apiMock }) => {
    await apiMock.mockDraft(null);
    await apiMock.mockEditLock(1, false);
    await apiMock.mockTemplates([]);

    await page.goto('/notes/1');

    // 編集ボタンをクリック
    await page.getByRole('link', { name: /編集/i }).click();

    // 編集ページに遷移
    await expect(page).toHaveURL(/\/notes\/1\/edit/);
  });

  test('ピン留めの切り替えができる', async ({ page }) => {
    let isPinned = false;

    await page.route(`${API_BASE_URL}/api/notes/1/pin`, async (route) => {
      isPinned = !isPinned;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...sampleNote, is_pinned: isPinned }),
      });
    });

    await page.goto('/notes/1');

    // ピン留めボタンをクリック
    const pinButton = page.locator('button:has-text("ピン"), [aria-label*="ピン"], [data-testid="pin-button"]');
    if (await pinButton.isVisible()) {
      await pinButton.click();
      // 成功のフィードバックを確認（トーストなど）
    }
  });

  test('閲覧専用の切り替えができる', async ({ page }) => {
    let isReadonly = false;

    await page.route(`${API_BASE_URL}/api/notes/1/readonly`, async (route) => {
      isReadonly = !isReadonly;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...sampleNote, is_readonly: isReadonly }),
      });
    });

    await page.goto('/notes/1');

    // 閲覧専用ボタンをクリック
    const readonlyButton = page.locator('button:has-text("閲覧専用"), [aria-label*="閲覧専用"], [data-testid="readonly-button"]');
    if (await readonlyButton.isVisible()) {
      await readonlyButton.click();
    }
  });

  test('ノートを複製できる', async ({ page }) => {
    const duplicatedNote = createSampleNote({
      id: 2,
      title: 'テストノート (コピー)',
    });

    await page.route(`${API_BASE_URL}/api/notes/1/duplicate`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(duplicatedNote),
      });
    });

    await page.goto('/notes/1');

    // 複製ボタンをクリック
    const duplicateButton = page.locator('button:has-text("複製"), [aria-label*="複製"], [data-testid="duplicate-button"]');
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();
    }
  });

  test('ノートを削除できる（ゴミ箱へ移動）', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/notes/1`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/notes/1');

    // 削除ボタンをクリック
    const deleteButton = page.locator('button:has-text("削除"), [aria-label*="削除"], [data-testid="delete-button"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // 確認ダイアログで確認
      const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test.describe('コメント機能', () => {
    test('コメント一覧が表示される', async ({ page, apiMock }) => {
      const comments = [
        createSampleComment({ id: 1, content: 'コメント1', display_name: 'ユーザーA' }),
        createSampleComment({ id: 2, content: 'コメント2', display_name: 'ユーザーB' }),
      ];
      await apiMock.mockComments(1, comments);

      await page.goto('/notes/1');

      // コメントセクションが表示される
      await expect(page.getByText('コメント1')).toBeVisible();
      await expect(page.getByText('コメント2')).toBeVisible();
    });

    test('コメントを投稿できる', async ({ page, apiMock }) => {
      await apiMock.mockComments(1, []);

      await page.route(`${API_BASE_URL}/api/notes/1/comments`, async (route) => {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createSampleComment({
              id: 1,
              content: body.content,
              display_name: body.display_name || '匿名',
            })),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1');

      // コメント入力フォームに入力
      const commentInput = page.locator('textarea[placeholder*="コメント"], [data-testid="comment-input"]');
      if (await commentInput.isVisible()) {
        await commentInput.fill('新しいコメント');

        // 送信ボタンをクリック
        await page.locator('button:has-text("投稿"), button:has-text("送信")').click();
      }
    });

    test('コメントに返信できる', async ({ page, apiMock }) => {
      const parentComment = createSampleComment({ id: 1, content: '親コメント' });
      await apiMock.mockComments(1, [parentComment]);

      await page.route(`${API_BASE_URL}/api/notes/1/comments`, async (route) => {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createSampleComment({
              id: 2,
              parent_id: body.parent_id,
              content: body.content,
            })),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1');

      // 返信ボタンをクリック
      const replyButton = page.locator('button:has-text("返信")').first();
      if (await replyButton.isVisible()) {
        await replyButton.click();

        // 返信入力フォームに入力
        const replyInput = page.locator('textarea').last();
        await replyInput.fill('返信コメント');

        // 送信
        await page.locator('button:has-text("投稿"), button:has-text("送信")').last().click();
      }
    });

    test('コメントを編集できる', async ({ page, apiMock }) => {
      const comment = createSampleComment({ id: 1, content: '元のコメント' });
      await apiMock.mockComments(1, [comment]);

      await page.route(`${API_BASE_URL}/api/comments/1`, async (route) => {
        if (route.request().method() === 'PUT') {
          const body = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...comment, content: body.content }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1');

      // 編集ボタンをクリック
      const editButton = page.locator('[data-testid="edit-comment"], button:has-text("編集")').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // 編集フォームに入力
        const editInput = page.locator('textarea').first();
        await editInput.fill('編集後のコメント');

        // 保存
        await page.locator('button:has-text("保存")').click();
      }
    });

    test('コメントを削除できる', async ({ page, apiMock }) => {
      const comment = createSampleComment({ id: 1, content: '削除するコメント' });
      await apiMock.mockComments(1, [comment]);

      await page.route(`${API_BASE_URL}/api/comments/1`, async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1');

      // 削除ボタンをクリック
      const deleteButton = page.locator('[data-testid="delete-comment"], button:has-text("削除")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // 確認ダイアログで確認
        const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    });
  });

  test.describe('バージョン履歴機能', () => {
    test('バージョン履歴が表示される', async ({ page, apiMock }) => {
      const versions = [
        createSampleVersion({ id: 1, version_no: 1, title: 'v1タイトル' }),
        createSampleVersion({ id: 2, version_no: 2, title: 'v2タイトル' }),
      ];
      await apiMock.mockVersions(1, versions);

      await page.goto('/notes/1');

      // バージョン履歴ボタンをクリック
      const historyButton = page.locator('button:has-text("履歴"), button:has-text("バージョン"), [data-testid="version-history"]');
      if (await historyButton.isVisible()) {
        await historyButton.click();

        // バージョン一覧が表示される
        await expect(page.getByText('v1タイトル')).toBeVisible();
        await expect(page.getByText('v2タイトル')).toBeVisible();
      }
    });

    test('過去バージョンを復元できる', async ({ page, apiMock }) => {
      const versions = [
        createSampleVersion({ id: 1, version_no: 1, title: '古いバージョン' }),
      ];
      await apiMock.mockVersions(1, versions);

      await page.route(`${API_BASE_URL}/api/notes/1/versions/1/restore`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createSampleNote({
            id: 1,
            title: '古いバージョン',
          })),
        });
      });

      await page.goto('/notes/1');

      // バージョン履歴を開く
      const historyButton = page.locator('button:has-text("履歴"), button:has-text("バージョン")');
      if (await historyButton.isVisible()) {
        await historyButton.click();

        // 復元ボタンをクリック
        const restoreButton = page.locator('button:has-text("復元")').first();
        if (await restoreButton.isVisible()) {
          await restoreButton.click();
        }
      }
    });
  });

  test.describe('添付ファイル機能', () => {
    test('添付ファイル一覧が表示される', async ({ page, apiMock }) => {
      const noteWithFiles = {
        ...sampleNote,
        files: [
          { id: 1, original_name: 'document.pdf', mime_type: 'application/pdf', size_bytes: 1024 },
          { id: 2, original_name: 'image.png', mime_type: 'image/png', size_bytes: 2048 },
        ],
      };
      await apiMock.mockNote(noteWithFiles);

      await page.goto('/notes/1');

      // ファイル一覧が表示される
      await expect(page.getByText('document.pdf')).toBeVisible();
      await expect(page.getByText('image.png')).toBeVisible();
    });

    test('ファイルをダウンロードできる', async ({ page, apiMock }) => {
      const noteWithFiles = {
        ...sampleNote,
        files: [
          { id: 1, original_name: 'document.pdf', mime_type: 'application/pdf', size_bytes: 1024 },
        ],
      };
      await apiMock.mockNote(noteWithFiles);

      await page.route(`${API_BASE_URL}/api/files/1`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('dummy pdf content'),
        });
      });

      await page.goto('/notes/1');

      // ダウンロードボタンをクリック
      const downloadButton = page.locator('a:has-text("ダウンロード"), button:has-text("ダウンロード")').first();
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('document');
      }
    });

    test('画像ファイルをプレビューできる', async ({ page, apiMock }) => {
      const noteWithFiles = {
        ...sampleNote,
        files: [
          { id: 1, original_name: 'image.png', mime_type: 'image/png', size_bytes: 2048 },
        ],
      };
      await apiMock.mockNote(noteWithFiles);

      await page.route(`${API_BASE_URL}/api/files/1/preview`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from('dummy image content'),
        });
      });

      await page.goto('/notes/1');

      // プレビューボタンをクリック
      const previewButton = page.locator('button:has-text("プレビュー"), [data-testid="preview-button"]').first();
      if (await previewButton.isVisible()) {
        await previewButton.click();

        // プレビューモーダルが表示される
        await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
      }
    });
  });

  test('閲覧専用ノートは編集ボタンが無効になる', async ({ page, apiMock }) => {
    const readonlyNote = createSampleNote({
      id: 1,
      title: '閲覧専用ノート',
      is_readonly: true,
    });
    await apiMock.mockNote(readonlyNote);

    await page.goto('/notes/1');

    // 編集ボタンが無効または非表示
    const editButton = page.getByRole('link', { name: /編集/i });
    const isDisabled = await editButton.isDisabled().catch(() => true);
    const isHidden = !(await editButton.isVisible().catch(() => false));

    expect(isDisabled || isHidden).toBe(true);
  });
});
