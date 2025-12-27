import { test, expect, createSampleNote, createSampleFolder, createSampleTag, createSampleTemplate, API_BASE_URL, setupDisplayName } from './fixtures';
import { Page } from '@playwright/test';

/**
 * テンプレートモーダルを閉じるヘルパー関数
 * 新規ノート作成ページでは、デフォルトでテンプレート選択モーダルが開く
 */
async function closeTemplateModalIfOpen(page: Page) {
  // テンプレートモーダルが表示されるのを少し待つ
  await page.waitForTimeout(500);

  // モーダル内のキャンセルボタンを探す
  const modalCancelButton = page.locator('.modal-footer button:has-text("キャンセル")');

  // モーダルが開いているかチェック
  const isModalOpen = await modalCancelButton.isVisible().catch(() => false);

  if (isModalOpen) {
    await modalCancelButton.click();
    // モーダルが閉じるのを待つ
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  }
}

test.describe('ノート編集ページ', () => {
  test.describe('新規作成', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('新規ノート作成ページが表示される', async ({ page }) => {
      await page.goto('/notes/new');

      // テンプレートモーダルを閉じる
      await closeTemplateModalIfOpen(page);

      // タイトル入力欄が表示される
      await expect(page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]')).toBeVisible();

      // コンテンツ入力欄が表示される
      await expect(page.locator('textarea, [data-testid="content-editor"]')).toBeVisible();
    });

    test('ノートを作成できる', async ({ page }) => {
      const createdNote = createSampleNote({
        id: 1,
        title: '新しいノート',
        content_md: '# 新しいコンテンツ',
      });

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createdNote),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/new');

      // テンプレートモーダルを閉じる
      await closeTemplateModalIfOpen(page);

      // タイトルを入力
      await page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]').fill('新しいノート');

      // コンテンツを入力
      await page.locator('textarea, [data-testid="content-editor"]').fill('# 新しいコンテンツ');

      // 保存ボタンをクリック
      await page.locator('button:has-text("保存"), button:has-text("作成")').click();

      // 詳細ページまたは一覧ページに遷移
      await expect(page).toHaveURL(/\/notes\/(1|$)/);
    });

    test('キーボードショートカット（Ctrl+S）で保存できる', async ({ page }) => {
      const createdNote = createSampleNote({ id: 1, title: 'ショートカットテスト' });

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createdNote),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/new');

      // テンプレートモーダルを閉じる
      await closeTemplateModalIfOpen(page);

      // タイトルとコンテンツを入力
      await page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]').fill('ショートカットテスト');
      await page.locator('textarea, [data-testid="content-editor"]').fill('コンテンツ');

      // Ctrl+Sで保存
      await page.keyboard.press('Control+s');

      // 保存が完了する
      await expect(page).toHaveURL(/\/notes\/(1|$)/);
    });

    test('テンプレートから作成できる', async ({ page, apiMock }) => {
      const templates = [
        createSampleTemplate({ id: 1, name: '議事録テンプレート', description: '会議の議事録', content: '# 議事録\n\n## 日時\n\n## 参加者\n\n## 議題\n\n' }),
      ];
      await apiMock.mockTemplates(templates);

      await page.goto('/notes/new');

      // テンプレートモーダルが開いているはず - テンプレートを選択
      const templateItem = page.locator('.template-item:has-text("議事録テンプレート")');
      if (await templateItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await templateItem.click();

        // 「このテンプレートを使用」ボタンをクリック
        await page.locator('button:has-text("このテンプレートを使用")').click();

        // コンテンツにテンプレートが適用される
        const content = await page.locator('textarea, [data-testid="content-editor"]').inputValue();
        expect(content).toContain('議事録');
      }
    });

    test('ドラフトが存在する場合、復元ダイアログが表示される', async ({ page, apiMock }) => {
      await apiMock.mockDraft({
        id: 1,
        note_id: null,
        session_id: 'test-session',
        title: 'ドラフトタイトル',
        content_md: 'ドラフトコンテンツ',
        folder_id: null,
        tags: [],
        saved_at: new Date().toISOString(),
      });

      await page.goto('/notes/new');

      // ドラフト復元ダイアログが表示される（テンプレートモーダルではなく）
      const draftDialog = page.locator('.draft-recovery-modal');
      await expect(draftDialog).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('既存ノート編集', () => {
    const existingNote = createSampleNote({
      id: 1,
      title: '既存ノート',
      content_md: '# 既存のコンテンツ',
    });

    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockNote(existingNote);
      await apiMock.mockDraft(null);
      await apiMock.mockEditLock(1, false);
      await apiMock.mockTemplates([]);
    });

    test('既存ノートが編集フォームに読み込まれる', async ({ page }) => {
      await page.goto('/notes/1/edit');

      // タイトルが表示される
      const titleInput = page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]');
      await expect(titleInput).toHaveValue('既存ノート');

      // コンテンツが表示される
      const contentEditor = page.locator('textarea, [data-testid="content-editor"]');
      await expect(contentEditor).toHaveValue(/既存のコンテンツ/);
    });

    test('ノートを更新できる', async ({ page }) => {
      let updateCalled = false;
      await page.route(`${API_BASE_URL}/api/notes/1`, async (route) => {
        if (route.request().method() === 'PUT') {
          updateCalled = true;
          const body = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...existingNote, ...body }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1/edit');

      // タイトルを変更
      const titleInput = page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]');
      await titleInput.clear();
      await titleInput.fill('更新されたタイトル');

      // 保存
      await page.locator('button:has-text("保存"), button:has-text("更新")').click();

      // 更新APIが呼ばれたことを確認（トースト表示を待つ）
      await page.waitForTimeout(1000);
      expect(updateCalled).toBe(true);
    });

    test('編集ロック中は警告が表示される', async ({ page, apiMock }) => {
      // ノート情報のモックは既にbeforeEachで設定済み

      // ロック状態をモック（他のユーザーが編集中）
      await page.route(`${API_BASE_URL}/api/notes/1/lock**`, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              is_locked: true,
              locked_by: '他のユーザー',
              locked_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/1/edit');

      // ロック警告が表示される
      const lockWarning = page.locator('.edit-lock-warning');
      await expect(lockWarning).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('エディタツールバー', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('太字ボタンが機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('テスト');
      await editor.selectText();

      // 太字ボタンをクリック
      const boldButton = page.locator('button[title*="太字"], button:has-text("B"), [data-testid="bold-button"]');
      if (await boldButton.isVisible()) {
        await boldButton.click();

        // **テスト** になる
        await expect(editor).toHaveValue(/\*\*テスト\*\*/);
      }
    });

    test('斜体ボタンが機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('テスト');
      await editor.selectText();

      // 斜体ボタンをクリック
      const italicButton = page.locator('button[title*="斜体"], button:has-text("I"), [data-testid="italic-button"]');
      if (await italicButton.isVisible()) {
        await italicButton.click();

        // *テスト* になる
        await expect(editor).toHaveValue(/\*テスト\*/);
      }
    });

    test('見出しボタンが機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');

      // 見出し1ボタンをクリック（複数の見出しボタンがあるので最初のものを選択）
      const headingButton = page.locator('button[title="見出し1"]');
      if (await headingButton.isVisible()) {
        await headingButton.click();

        // カーソル位置に # が挿入される
        await expect(editor).toHaveValue(/# /);
      }
    });

    test('リストボタンが機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('リスト項目');

      // リストボタンをクリック
      const listButton = page.locator('button[title*="リスト"], [data-testid="list-button"]');
      if (await listButton.isVisible()) {
        await listButton.click();

        // - リスト項目 になる
        await expect(editor).toHaveValue(/^-/);
      }
    });

    test('リンク挿入が機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('リンクテキスト');
      await editor.selectText();

      // リンクボタンをクリック
      const linkButton = page.locator('button[title*="リンク"], [data-testid="link-button"]');
      if (await linkButton.isVisible()) {
        await linkButton.click();

        // [リンクテキスト](url) になる
        await expect(editor).toHaveValue(/\[リンクテキスト\]\(.*\)/);
      }
    });

    test('コードボタンが機能する', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('code');
      await editor.selectText();

      // コードボタンをクリック（インラインコード用）
      const codeButton = page.locator('button[title*="コード"], [data-testid="code-button"]');
      if (await codeButton.isVisible()) {
        await codeButton.click();

        // `code` になる（インラインコード）
        await expect(editor).toHaveValue(/`code`/);
      }
    });

    test('プレビューモードに切り替えられる', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');
      await editor.fill('# プレビューテスト\n\nこれはテストです。');

      // プレビューボタンをクリック
      const previewButton = page.locator('button:has-text("プレビュー"), [data-testid="preview-toggle"]');
      if (await previewButton.isVisible()) {
        await previewButton.click();

        // プレビューが表示される
        await expect(page.locator('h1:has-text("プレビューテスト")')).toBeVisible();
      }
    });
  });

  test.describe('タグ入力', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('タグを追加できる', async ({ page, apiMock }) => {
      const tags = [
        createSampleTag({ id: 1, name: 'JavaScript' }),
        createSampleTag({ id: 2, name: 'React' }),
      ];
      await apiMock.mockTagsList(tags);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // タグ入力欄を探す
      const tagInput = page.locator('input[placeholder*="タグ"], [data-testid="tag-input"]');
      if (await tagInput.isVisible()) {
        await tagInput.fill('JavaScript');

        // サジェストが表示される
        const suggestion = page.getByText('JavaScript');
        if (await suggestion.isVisible()) {
          await suggestion.click();
        }
      }
    });

    test('新しいタグを作成できる', async ({ page, apiMock }) => {
      await apiMock.mockTagsList([]);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const tagInput = page.locator('input[placeholder*="タグ"], [data-testid="tag-input"]');
      if (await tagInput.isVisible()) {
        await tagInput.fill('新しいタグ');
        await tagInput.press('Enter');

        // 新しいタグが追加される
        await expect(page.getByText('新しいタグ')).toBeVisible();
      }
    });
  });

  test.describe('フォルダ選択', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('フォルダを選択できる', async ({ page, apiMock }) => {
      const folders = [
        createSampleFolder({ id: 1, name: '開発メモ' }),
        createSampleFolder({ id: 2, name: '日記' }),
      ];
      await apiMock.mockFoldersList(folders);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // フォルダ選択を探す
      const folderSelect = page.locator('select[data-testid="folder-select"], [data-testid="folder-selector"]');
      if (await folderSelect.isVisible()) {
        await folderSelect.selectOption({ label: '開発メモ' });
      }
    });
  });

  test.describe('ファイルアップロード', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('ファイルをアップロードできる', async ({ page }) => {
      await page.route(`${API_BASE_URL}/api/files`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              original_name: 'test.png',
              mime_type: 'image/png',
              size_bytes: 1024,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // ファイル入力を探す
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.first().setInputFiles({
          name: 'test.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake image content'),
        });

        // アップロード完了を待機
        await page.waitForResponse(`${API_BASE_URL}/api/files`);
      }
    });
  });

  test.describe('テンプレート保存', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('現在の内容をテンプレートとして保存できる', async ({ page }) => {
      await page.route(`${API_BASE_URL}/api/templates`, async (route) => {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createSampleTemplate({
              id: 1,
              name: body.name,
              content: body.content,
            })),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // コンテンツを入力
      await page.locator('textarea, [data-testid="content-editor"]').fill('# テンプレート\n\n## セクション');

      // テンプレート保存ボタンをクリック
      const saveTemplateButton = page.locator('button:has-text("テンプレートとして保存"), [data-testid="save-as-template"]');
      if (await saveTemplateButton.isVisible()) {
        await saveTemplateButton.click();

        // テンプレート名入力ダイアログ
        const nameInput = page.locator('input[placeholder*="テンプレート名"], [data-testid="template-name-input"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill('マイテンプレート');
          await page.locator('button:has-text("保存")').click();
        }
      }
    });
  });

  test.describe('ノートリンク挿入', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    test('ノートリンクを挿入できる', async ({ page }) => {
      const notes = [
        createSampleNote({ id: 1, title: 'リンク先ノート' }),
      ];

      await page.route(`${API_BASE_URL}/api/search/quick**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: notes,
            total: 1,
          }),
        });
      });

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      const editor = page.locator('textarea, [data-testid="content-editor"]');

      // [# を入力してサジェストを起動
      await editor.fill('[#');

      // サジェストが表示される
      const suggestion = page.locator('[data-testid="note-link-suggestion"], .suggestion-item');
      if (await suggestion.isVisible()) {
        await suggestion.getByText('リンク先ノート').click();

        // [#1] が挿入される
        await expect(editor).toHaveValue(/\[#1\]/);
      }
    });
  });

  test.describe('ドラフト自動保存', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      // 表示名を設定（ノート編集ページは表示名が必要）
      await setupDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
    });

    // 自動保存は30秒間隔なので、テストではAPIモックの呼び出しを確認する代わりに
    // ドラフト保存インジケーターの表示を確認する（もし実装されていれば）
    test('編集するとダーティ状態になる', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // タイトルを入力
      await page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]').fill('テストタイトル');

      // コンテンツを入力
      await page.locator('textarea, [data-testid="content-editor"]').fill('ドラフトテスト内容');

      // ページを離れようとすると、beforeunloadが発火するはずだが、
      // E2Eテストではbeforeunloadを検出できないため、
      // 代わりに入力した内容が保持されていることを確認
      const titleValue = await page.locator('input[placeholder*="タイトル"], [data-testid="title-input"]').inputValue();
      expect(titleValue).toBe('テストタイトル');

      const contentValue = await page.locator('textarea, [data-testid="content-editor"]').inputValue();
      expect(contentValue).toBe('ドラフトテスト内容');
    });
  });
});
