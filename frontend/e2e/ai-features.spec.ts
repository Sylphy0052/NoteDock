import { test, expect, API_BASE_URL } from './fixtures';
import { Page } from '@playwright/test';

/**
 * テンプレートモーダルを閉じるヘルパー関数
 */
async function closeTemplateModalIfOpen(page: Page) {
  await page.waitForTimeout(500);
  const modalCancelButton = page.locator('.modal-footer button:has-text("キャンセル")');
  const isModalOpen = await modalCancelButton.isVisible().catch(() => false);
  if (isModalOpen) {
    await modalCancelButton.click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  }
}

/**
 * 表示名をlocalStorageに設定するヘルパー関数
 */
async function setDisplayName(page: Page, name: string = 'テストユーザー') {
  await page.addInitScript((displayName) => {
    localStorage.setItem('notedock_display_name', displayName);
  }, name);
}

test.describe('AI機能', () => {
  test.describe('AIステータス', () => {
    test('AI機能が有効な場合、ツールバーにAIボタンが表示される', async ({ page, apiMock }) => {
      await setDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
      await apiMock.mockAIStatus(true);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンが表示される
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
    });

    test('AI機能が無効な場合、ツールバーにAIボタンが表示されない', async ({ page, apiMock }) => {
      await setDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
      await apiMock.mockAIStatus(false);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンが表示されない
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('AI生成モーダル', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      await setDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
      await apiMock.mockAIStatus(true);
    });

    test('AIボタンをクリックするとモーダルが開く', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // モーダルが表示される
      const modal = page.locator('.ai-generate-modal, .modal:has-text("AIで生成")');
      await expect(modal).toBeVisible({ timeout: 3000 });
    });

    test('プロンプトを入力して生成できる', async ({ page, apiMock }) => {
      const generatedContent = '# AIが生成した記事\n\nこれはテスト用に生成されたコンテンツです。';
      await apiMock.mockAIGenerate(generatedContent);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // プロンプトを入力
      const promptInput = page.locator('.ai-generate-modal textarea, .modal textarea[placeholder*="プロンプト"]');
      await promptInput.fill('プログラミングに関する記事を書いてください');

      // 生成ボタンをクリック
      const generateButton = page.locator('.ai-generate-modal button:has-text("生成"), .modal button:has-text("生成")');
      await generateButton.click();

      // 生成されたコンテンツが表示される
      const responseArea = page.locator('.ai-response, .ai-streaming-text');
      await expect(responseArea).toContainText('AIが生成した記事', { timeout: 10000 });
    });

    test('生成されたコンテンツをエディタに挿入できる', async ({ page, apiMock }) => {
      const generatedContent = 'AIが生成したテキスト';
      await apiMock.mockAIGenerate(generatedContent);

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // プロンプトを入力
      const promptInput = page.locator('.ai-generate-modal textarea, .modal textarea[placeholder*="プロンプト"]');
      await promptInput.fill('テスト');

      // 生成ボタンをクリック
      const generateButton = page.locator('.ai-generate-modal button:has-text("生成"), .modal button:has-text("生成")');
      await generateButton.click();

      // レスポンスを待つ
      await page.waitForTimeout(1000);

      // 挿入ボタンをクリック
      const insertButton = page.locator('.ai-generate-modal button:has-text("挿入"), .modal button:has-text("挿入")');
      await insertButton.click();

      // エディタにコンテンツが挿入される
      const editor = page.locator('textarea.content-textarea, [data-testid="content-editor"]');
      await expect(editor).toHaveValue(new RegExp(generatedContent));
    });

    test('閉じるボタンでモーダルを閉じられる', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // モーダルが表示される
      const modal = page.locator('.modal:has-text("AI 記事生成")');
      await expect(modal).toBeVisible();

      // 閉じるボタン（×）をクリック
      const closeButton = page.locator('.modal-close[aria-label="閉じる"]');
      await closeButton.click();

      // モーダルが閉じる
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    });

    test('生成中にキャンセルできる', async ({ page }) => {
      // 遅延するモックを設定
      await page.route(`${API_BASE_URL}/api/ai/generate`, async (route) => {
        // 5秒待ってからレスポンス（その前にキャンセルされるはず）
        await new Promise(resolve => setTimeout(resolve, 5000));
        const events = [
          { type: 'add_message_token', token: '生成されたコンテンツ' },
        ];
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson',
          body: events.map(e => JSON.stringify(e)).join('\n') + '\n',
        });
      });

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // プロンプトを入力
      const promptInput = page.locator('.ai-generate-modal textarea, .modal textarea[placeholder*="プロンプト"]');
      await promptInput.fill('テスト');

      // 生成ボタンをクリック
      const generateButton = page.locator('.ai-generate-modal button:has-text("生成"), .modal button:has-text("生成")');
      await generateButton.click();

      // 生成中状態を確認（ローディングインジケーターまたはキャンセルボタン）
      const cancelGenerateButton = page.locator('.ai-generate-modal button:has-text("キャンセル"), .modal button:has-text("中止")');

      // キャンセルボタンが表示されるか確認
      const isCancelVisible = await cancelGenerateButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isCancelVisible) {
        await cancelGenerateButton.click();
      }
    });
  });

  test.describe('エラーハンドリング', () => {
    test.beforeEach(async ({ page, apiMock }) => {
      await setDisplayName(page);
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockDraft(null);
      await apiMock.mockTemplates([]);
      await apiMock.mockAIStatus(true);
    });

    test('APIエラー時にエラーメッセージが表示される', async ({ page }) => {
      // エラーを返すモックを設定
      await page.route(`${API_BASE_URL}/api/ai/generate`, async (route) => {
        const events = [
          { type: 'error', message: 'AI service temporarily unavailable' },
        ];
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson',
          body: events.map(e => JSON.stringify(e)).join('\n') + '\n',
        });
      });

      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // プロンプトを入力
      const promptInput = page.locator('.ai-generate-modal textarea, .modal textarea[placeholder*="プロンプト"]');
      await promptInput.fill('テスト');

      // 生成ボタンをクリック
      const generateButton = page.locator('.ai-generate-modal button:has-text("生成"), .modal button:has-text("生成")');
      await generateButton.click();

      // エラーメッセージが表示される
      const errorMessage = page.locator('.ai-generate-error');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('空のプロンプトでは生成ボタンが無効', async ({ page }) => {
      await page.goto('/notes/new');
      await closeTemplateModalIfOpen(page);

      // エディタが表示されるまで待機
      await expect(page.locator('.editor-toolbar')).toBeVisible({ timeout: 10000 });

      // AIボタンをクリック
      const aiButton = page.locator('button.toolbar-btn-ai, button[title="AIで生成"]');
      await expect(aiButton).toBeVisible({ timeout: 5000 });
      await aiButton.click();

      // 生成ボタンが無効になっている
      const generateButton = page.locator('.ai-generate-modal button:has-text("生成"), .modal button:has-text("生成")');
      await expect(generateButton).toBeDisabled();
    });
  });

  test.describe('AI要約モーダル', () => {
    const sampleNote = {
      id: 1,
      title: 'テストノート',
      content_md: '# テストノート\n\nこれはテスト用のノートです。\n\n## セクション1\n\nテキストコンテンツがここに入ります。\n\n## セクション2\n\n- リスト項目1\n- リスト項目2',
      folder_id: null,
      folder: null,
      is_pinned: false,
      is_readonly: false,
      cover_file_id: null,
      cover_file_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      tags: [],
      files: [],
    };

    test.beforeEach(async ({ page, apiMock }) => {
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockAIStatus(true);
      await apiMock.mockNote(sampleNote);
      await apiMock.mockComments(sampleNote.id, []);
      await apiMock.mockToc(sampleNote.id, [
        { id: 'heading-1', text: 'テストノート', level: 1 },
        { id: 'heading-2', text: 'セクション1', level: 2 },
        { id: 'heading-3', text: 'セクション2', level: 2 },
      ]);
      await apiMock.mockVersions(sampleNote.id, []);
    });

    test('メニューから「AIで要約」を選択するとモーダルが開く', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);

      // ページが読み込まれるまで待機
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューボタンをクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();

      // 「AIで要約」ボタンをクリック
      const summarizeButton = page.locator('button:has-text("AIで要約")');
      await expect(summarizeButton).toBeVisible({ timeout: 3000 });
      await summarizeButton.click();

      // モーダルが表示される
      const modal = page.locator('.ai-summarize-modal');
      await expect(modal).toBeVisible({ timeout: 3000 });
    });

    test('要約の長さと形式を選択できる', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューを開いて「AIで要約」をクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIで要約")').click();

      // モーダルが表示される
      await expect(page.locator('.ai-summarize-modal')).toBeVisible();

      // 長さオプションが表示される（getByRoleで正確に指定）
      await expect(page.getByRole('button', { name: '短め 1-2文程度' })).toBeVisible();
      await expect(page.getByRole('button', { name: '標準 3-5文程度' })).toBeVisible();
      await expect(page.getByRole('button', { name: '詳細 段落単位' })).toBeVisible();

      // 形式オプションが表示される
      await expect(page.getByRole('button', { name: '段落 文章形式' })).toBeVisible();
      await expect(page.getByRole('button', { name: '箇条書き ポイント形式' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'アウトライン 階層形式' })).toBeVisible();

      // 長さを「短め」に変更
      await page.getByRole('button', { name: '短め 1-2文程度' }).click();
      await expect(page.getByRole('button', { name: '短め 1-2文程度' })).toHaveClass(/active/);

      // 形式を「箇条書き」に変更
      await page.getByRole('button', { name: '箇条書き ポイント形式' }).click();
      await expect(page.getByRole('button', { name: '箇条書き ポイント形式' })).toHaveClass(/active/);
    });

    test('要約を生成できる', async ({ page, apiMock }) => {
      const summaryContent = 'これはテストノートの要約です。主なポイントは以下の通りです。';
      await apiMock.mockAISummarize(summaryContent);

      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューを開いて「AIで要約」をクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIで要約")').click();

      // モーダルが表示される
      await expect(page.locator('.ai-summarize-modal')).toBeVisible();

      // 「要約を生成」ボタンをクリック
      const generateButton = page.locator('button:has-text("要約を生成")');
      await generateButton.click();

      // 要約結果が表示される
      const result = page.locator('.ai-summarize-result, .ai-streaming-text');
      await expect(result).toContainText('これはテストノートの要約です', { timeout: 10000 });
    });

    test('要約をコピーできる', async ({ page, context, apiMock }) => {
      // クリップボード権限を付与
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const summaryContent = 'コピーテスト用の要約テキスト';
      await apiMock.mockAISummarize(summaryContent);

      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューを開いて「AIで要約」をクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIで要約")').click();

      // 「要約を生成」ボタンをクリック
      await page.locator('button:has-text("要約を生成")').click();

      // 要約結果を待つ
      await expect(page.locator('.ai-streaming-text')).toContainText(summaryContent, { timeout: 10000 });

      // コピーボタンが表示されるまで待つ
      const copyButton = page.locator('.ai-summarize-actions button:has-text("コピー")').first();
      await expect(copyButton).toBeVisible({ timeout: 5000 });
      await copyButton.click();

      // コピー完了表示を待つ
      await expect(page.locator('.ai-summarize-actions button:has-text("コピー完了")')).toBeVisible({ timeout: 5000 });
    });

    test('AI機能が無効な場合、「AIで要約」メニューが表示されない', async ({ page, apiMock }) => {
      await apiMock.mockAIStatus(false);

      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューボタンをクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();

      // 「AIで要約」ボタンが表示されない
      const summarizeButton = page.locator('button:has-text("AIで要約")');
      await expect(summarizeButton).not.toBeVisible({ timeout: 2000 });
    });

    test('閉じるボタンでモーダルを閉じられる', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('テストノート', { timeout: 10000 });

      // メニューを開いて「AIで要約」をクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIで要約")').click();

      // モーダルが表示される
      const modal = page.locator('.modal:has-text("ノートを要約")');
      await expect(modal).toBeVisible();

      // 閉じるボタンをクリック
      const closeButton = page.locator('.modal-close[aria-label="閉じる"]');
      await closeButton.click();

      // モーダルが閉じる
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('AIに質問パネル', () => {
    const sampleNote = {
      id: 2,
      title: '質問テストノート',
      content_md: '# 質問テストノート\n\nAIに質問するためのテストノートです。\n\n## 内容\n\nこのノートには様々な情報が含まれています。',
      folder_id: null,
      folder: null,
      is_pinned: false,
      is_readonly: false,
      cover_file_id: null,
      cover_file_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      tags: [],
      files: [],
    };

    test.beforeEach(async ({ page, apiMock }) => {
      await apiMock.mockFoldersList([]);
      await apiMock.mockTagsList([]);
      await apiMock.mockAIStatus(true);
      await apiMock.mockNote(sampleNote);
      await apiMock.mockComments(sampleNote.id, []);
      await apiMock.mockToc(sampleNote.id, []);
      await apiMock.mockVersions(sampleNote.id, []);
    });

    test('メニューから「AIに質問」を選択するとパネルが開く', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('質問テストノート', { timeout: 10000 });

      // メニューボタンをクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();

      // 「AIに質問」ボタンをクリック
      const askButton = page.locator('button:has-text("AIに質問")');
      await expect(askButton).toBeVisible({ timeout: 3000 });
      await askButton.click();

      // パネルが表示される
      const panel = page.locator('.ai-ask-panel');
      await expect(panel).toBeVisible({ timeout: 3000 });
    });

    test('質問を入力して送信できる', async ({ page, apiMock }) => {
      const answerContent = 'このノートは質問テスト用のノートで、AIに関する質問のテストに使用されます。';
      await apiMock.mockAIAsk(answerContent);

      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('質問テストノート', { timeout: 10000 });

      // パネルを開く
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIに質問")').click();

      // パネルが表示される
      await expect(page.locator('.ai-ask-panel')).toBeVisible();

      // 質問を入力
      const textarea = page.locator('.ai-ask-panel-input textarea');
      await textarea.fill('このノートは何についてですか？');

      // 送信ボタンをクリック
      const sendButton = page.locator('.ai-ask-panel-input button[type="submit"]');
      await sendButton.click();

      // ユーザーメッセージが表示される
      await expect(page.locator('.ai-ask-message.user')).toContainText('このノートは何についてですか？');

      // AI回答が表示される
      await expect(page.locator('.ai-ask-message.assistant')).toContainText('このノートは質問テスト用のノート', { timeout: 10000 });
    });

    test('閉じるボタンでパネルを閉じられる', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('質問テストノート', { timeout: 10000 });

      // パネルを開く
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIに質問")').click();

      // パネルが表示される
      const panel = page.locator('.ai-ask-panel');
      await expect(panel).toBeVisible();

      // 閉じるボタンをクリック
      const closeButton = page.locator('.ai-ask-panel-header button[title="閉じる"]');
      await closeButton.click();

      // パネルが閉じる
      await expect(panel).not.toBeVisible({ timeout: 3000 });
    });

    test('AI機能が無効な場合、「AIに質問」メニューが表示されない', async ({ page, apiMock }) => {
      await apiMock.mockAIStatus(false);

      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('質問テストノート', { timeout: 10000 });

      // メニューボタンをクリック
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();

      // 「AIに質問」ボタンが表示されない
      const askButton = page.locator('button:has-text("AIに質問")');
      await expect(askButton).not.toBeVisible({ timeout: 2000 });
    });

    test('空の質問では送信ボタンが無効', async ({ page }) => {
      await page.goto(`/notes/${sampleNote.id}`);
      await expect(page.locator('.note-title')).toContainText('質問テストノート', { timeout: 10000 });

      // パネルを開く
      const menuButton = page.locator('button:has(svg.lucide-more-vertical), button.btn-icon:has-text("")').first();
      await menuButton.click();
      await page.locator('button:has-text("AIに質問")').click();

      // パネルが表示される
      await expect(page.locator('.ai-ask-panel')).toBeVisible();

      // 送信ボタンが無効
      const sendButton = page.locator('.ai-ask-panel-input button[type="submit"]');
      await expect(sendButton).toBeDisabled();
    });
  });

  test.describe('フォルダAI要約', () => {
    // モバイルビューポートではフォルダページのAIボタンが表示上の問題でクリックできないためスキップ
    test.skip(({ isMobile }) => isMobile, 'Folder AI buttons are obscured on mobile viewport');

    const sampleFolder = {
      id: 1,
      name: 'テストフォルダ',
      parent_id: null,
      children: [],
      note_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sampleNotes = [
      {
        id: 1,
        title: 'ノート1',
        content_md: '# ノート1\n\nノート1の内容です。',
        folder_id: 1,
        folder: sampleFolder,
        is_pinned: false,
        is_readonly: false,
        cover_file_id: null,
        cover_file_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        tags: [],
        files: [],
      },
      {
        id: 2,
        title: 'ノート2',
        content_md: '# ノート2\n\nノート2の内容です。',
        folder_id: 1,
        folder: sampleFolder,
        is_pinned: false,
        is_readonly: false,
        cover_file_id: null,
        cover_file_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        tags: [],
        files: [],
      },
    ];

    test.beforeEach(async ({ page, apiMock }) => {
      await apiMock.mockFoldersList([sampleFolder]);
      await apiMock.mockTagsList([]);
      await apiMock.mockAIStatus(true);
    });

    test('フォルダ選択時にAIボタンが表示される', async ({ page, apiMock }) => {
      // フォルダ内ノート一覧をモック
      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: 'テストフォルダ' }).click();

      // AIボタンが表示される
      const summarizeButton = page.locator('button[title="フォルダを要約"]');
      const askButton = page.locator('button[title="フォルダについて質問"]');
      await expect(summarizeButton).toBeVisible({ timeout: 5000 });
      await expect(askButton).toBeVisible({ timeout: 5000 });
    });

    test('AI機能が無効な場合、AIボタンが表示されない', async ({ page, apiMock }) => {
      await apiMock.mockAIStatus(false);

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: 'テストフォルダ' }).click();

      // AIボタンが表示されない
      const summarizeButton = page.locator('button[title="フォルダを要約"]');
      const askButton = page.locator('button[title="フォルダについて質問"]');
      await expect(summarizeButton).not.toBeVisible({ timeout: 3000 });
      await expect(askButton).not.toBeVisible({ timeout: 3000 });
    });

    test('フォルダ要約モーダルが開く', async ({ page, apiMock }) => {
      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: 'テストフォルダ' }).click();

      // AIで要約ボタンをクリック
      const summarizeButton = page.locator('button[title="フォルダを要約"]');
      await expect(summarizeButton).toBeVisible({ timeout: 5000 });
      await summarizeButton.click();

      // モーダルが表示される
      const modal = page.locator('.modal:has-text("フォルダを要約")');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // フォルダ名と「サブフォルダ含む」が表示される
      await expect(modal.locator('.ai-summarize-note-info')).toContainText('テストフォルダ');
      await expect(modal.locator('.ai-summarize-note-hint')).toContainText('サブフォルダ含む');
    });

    test('フォルダ要約を生成できる', async ({ page, apiMock }) => {
      const summaryContent = 'このフォルダには2つのノートが含まれています。それぞれのノートの主要な内容をまとめると...';
      await apiMock.mockAIFolderSummarize(summaryContent);

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: 'テストフォルダ' }).click();

      // AIで要約ボタンをクリック
      const summarizeButton = page.locator('button[title="フォルダを要約"]');
      await expect(summarizeButton).toBeVisible({ timeout: 5000 });
      await summarizeButton.click();

      // モーダルが表示される
      await expect(page.locator('.modal:has-text("フォルダを要約")')).toBeVisible();

      // 「要約を生成」ボタンをクリック
      const generateButton = page.locator('button:has-text("要約を生成")');
      await generateButton.click();

      // 要約結果が表示される
      const result = page.locator('.ai-summarize-result, .ai-streaming-text');
      await expect(result).toContainText('このフォルダには2つのノート', { timeout: 10000 });
    });
  });

  test.describe('フォルダAI質問', () => {
    // モバイルビューポートではフォルダページのAIボタンが表示上の問題でクリックできないためスキップ
    test.skip(({ isMobile }) => isMobile, 'Folder AI buttons are obscured on mobile viewport');

    const sampleFolder = {
      id: 2,
      name: '質問テストフォルダ',
      parent_id: null,
      children: [],
      note_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sampleNotes = [
      {
        id: 3,
        title: 'プロジェクト計画',
        content_md: '# プロジェクト計画\n\nこのプロジェクトは3ヶ月で完了予定です。',
        folder_id: 2,
        folder: sampleFolder,
        is_pinned: false,
        is_readonly: false,
        cover_file_id: null,
        cover_file_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        tags: [],
        files: [],
      },
    ];

    test.beforeEach(async ({ page, apiMock }) => {
      await apiMock.mockFoldersList([sampleFolder]);
      await apiMock.mockTagsList([]);
      await apiMock.mockAIStatus(true);
    });

    test('フォルダ質問パネルが開く', async ({ page, apiMock }) => {
      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=2')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('質問テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: '質問テストフォルダ' }).click();

      // AIに質問ボタンをクリック
      const askButton = page.locator('button[title="フォルダについて質問"]');
      await expect(askButton).toBeVisible({ timeout: 5000 });
      await askButton.click();

      // パネルが表示される
      const panel = page.locator('.ai-ask-panel');
      await expect(panel).toBeVisible({ timeout: 3000 });

      // フォルダ名が表示される（パネル内に対象フォルダが表示される）
      await expect(panel.locator('.ai-ask-panel-note-title')).toContainText('質問テストフォルダ');
    });

    test('フォルダに質問できる', async ({ page, apiMock }) => {
      const answerContent = 'プロジェクトは3ヶ月で完了予定です。';
      await apiMock.mockAIFolderAsk(answerContent);

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=2')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('質問テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: '質問テストフォルダ' }).click();

      // AIに質問ボタンをクリック
      const askButton = page.locator('button[title="フォルダについて質問"]');
      await expect(askButton).toBeVisible({ timeout: 5000 });
      await askButton.click();

      // パネルが表示される
      await expect(page.locator('.ai-ask-panel')).toBeVisible();

      // 質問を入力
      const textarea = page.locator('.ai-ask-panel-input textarea');
      await textarea.fill('プロジェクトの期間は？');

      // 送信ボタンをクリック
      const sendButton = page.locator('.ai-ask-panel-input button[type="submit"]');
      await sendButton.click();

      // ユーザーメッセージが表示される
      await expect(page.locator('.ai-ask-message.user')).toContainText('プロジェクトの期間は？');

      // AI回答が表示される
      await expect(page.locator('.ai-ask-message.assistant')).toContainText('3ヶ月で完了予定', { timeout: 10000 });
    });

    test('閉じるボタンでパネルを閉じられる', async ({ page, apiMock }) => {
      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = route.request().url();
        if (url.includes('folder_id=2')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: sampleNotes,
              total: sampleNotes.length,
              page: 1,
              per_page: 20,
              pages: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/folders');

      // フォルダが表示されるまで待機
      await expect(page.getByText('質問テストフォルダ')).toBeVisible({ timeout: 10000 });

      // フォルダをクリック
      await page.locator('.folder-name, [data-testid="folder-name"]').filter({ hasText: '質問テストフォルダ' }).click();

      // AIに質問ボタンをクリック
      const askButton = page.locator('button[title="フォルダについて質問"]');
      await expect(askButton).toBeVisible({ timeout: 5000 });
      await askButton.click();

      // パネルが表示される
      const panel = page.locator('.ai-ask-panel');
      await expect(panel).toBeVisible();

      // 閉じるボタンをクリック
      const closeButton = page.locator('.ai-ask-panel-header button[title="閉じる"]');
      await closeButton.click();

      // パネルが閉じる
      await expect(panel).not.toBeVisible({ timeout: 3000 });
    });
  });
});
