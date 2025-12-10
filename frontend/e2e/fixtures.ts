import { test as base, expect, Page } from '@playwright/test';

/**
 * テスト用のサンプルデータ
 */
export const testData = {
  note: {
    title: 'E2Eテストノート',
    content_md: '# テストコンテンツ\n\nこれはE2Eテスト用のノートです。\n\n## セクション1\n\nテキストコンテンツ\n\n## セクション2\n\n- リスト項目1\n- リスト項目2',
    tags: ['テスト', 'E2E'],
  },
  folder: {
    name: 'テストフォルダ',
  },
  comment: {
    content: 'テストコメントです',
  },
  template: {
    name: 'テストテンプレート',
    content: '# {{title}}\n\n## 概要\n\n',
  },
};

/**
 * APIのベースURL
 */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

/**
 * APIモック用のヘルパー関数
 */
export class ApiMockHelper {
  constructor(private page: Page) {}

  /**
   * ノート一覧APIをモック
   */
  async mockNotesList(notes: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
      // /api/notes/1 などの個別ノートリクエストは除外
      const url = route.request().url();
      if (/\/api\/notes\/\d+/.test(url)) {
        await route.continue();
        return;
      }
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: notes,
          total: notes.length,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
      });
    });
  }

  /**
   * 単一ノートAPIをモック
   */
  async mockNote(note: any) {
    // Use exact URL match for the note endpoint (no wildcards to avoid matching sub-routes)
    await this.page.route(`${API_BASE_URL}/api/notes/${note.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(note),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * フォルダ一覧APIをモック
   */
  async mockFoldersList(folders: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/folders**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(folders),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * タグ一覧APIをモック
   */
  async mockTagsList(tags: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/tags**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tags),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * リンクマップAPIをモック
   */
  async mockLinkmap(data: { nodes: any[]; links: any[] }) {
    await this.page.route(`${API_BASE_URL}/api/linkmap**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
  }

  /**
   * ゴミ箱APIをモック
   */
  async mockTrash(notes: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/trash**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: notes,
          total: notes.length,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
      });
    });
  }

  /**
   * テンプレート一覧APIをモック
   */
  async mockTemplates(templates: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/templates**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: templates,
            total: templates.length,
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 検索APIをモック
   */
  async mockSearch(results: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/search**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: results,
          total: results.length,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
      });
    });
  }

  /**
   * コメント一覧APIをモック
   */
  async mockComments(noteId: number, comments: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/notes/${noteId}/comments**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(comments),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * バージョン履歴APIをモック
   */
  async mockVersions(noteId: number, versions: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/notes/${noteId}/versions**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(versions),
      });
    });
  }

  /**
   * 目次APIをモック
   */
  async mockToc(noteId: number, toc: any[] = []) {
    await this.page.route(`${API_BASE_URL}/api/notes/${noteId}/toc`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toc),
      });
    });
  }

  /**
   * ドラフトAPIをモック
   */
  async mockDraft(draft: any | null = null) {
    await this.page.route(`${API_BASE_URL}/api/drafts**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_draft: draft !== null,
            draft: draft,
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 編集ロックAPIをモック
   */
  async mockEditLock(noteId: number, isLocked: boolean = false) {
    await this.page.route(`${API_BASE_URL}/api/notes/${noteId}/lock**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ is_locked: isLocked }),
        });
      } else {
        await route.continue();
      }
    });
  }
}

/**
 * ページ操作ヘルパー
 */
export class PageHelper {
  constructor(private page: Page) {}

  /**
   * トーストメッセージを待機して検証
   */
  async expectToast(message: string | RegExp) {
    const toast = this.page.locator('[role="alert"], .toast, [data-testid="toast"]');
    await expect(toast).toContainText(message);
  }

  /**
   * モーダルが開いていることを確認
   */
  async expectModalOpen() {
    await expect(this.page.locator('[role="dialog"], .modal')).toBeVisible();
  }

  /**
   * モーダルが閉じていることを確認
   */
  async expectModalClosed() {
    await expect(this.page.locator('[role="dialog"], .modal')).not.toBeVisible();
  }

  /**
   * ローディング完了を待機
   */
  async waitForLoading() {
    await this.page.waitForLoadState('networkidle');
    // スピナーが消えるまで待機
    const spinner = this.page.locator('.loading, .spinner, [data-testid="loading"]');
    if (await spinner.isVisible()) {
      await expect(spinner).not.toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * 確認ダイアログで「確認」をクリック
   */
  async confirmDialog() {
    await this.page.locator('button:has-text("確認"), button:has-text("OK"), button:has-text("削除")').click();
  }

  /**
   * 確認ダイアログで「キャンセル」をクリック
   */
  async cancelDialog() {
    await this.page.locator('button:has-text("キャンセル"), button:has-text("Cancel")').click();
  }
}

/**
 * サンプルデータ生成ヘルパー
 */
export function createSampleNote(overrides: Partial<any> = {}) {
  return {
    id: 1,
    title: 'サンプルノート',
    content_md: '# サンプル\n\nテストコンテンツです。',
    folder_id: null,
    folder: null,
    is_pinned: false,
    is_readonly: false,
    cover_file_id: null,
    cover_file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    tags: [{ id: 1, name: 'テスト' }],
    files: [],
    ...overrides,
  };
}

export function createSampleFolder(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'サンプルフォルダ',
    parent_id: null,
    children: [],
    note_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createSampleTag(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'サンプルタグ',
    note_count: 0,
    ...overrides,
  };
}

export function createSampleComment(overrides: Partial<any> = {}) {
  return {
    id: 1,
    note_id: 1,
    parent_id: null,
    content: 'サンプルコメント',
    display_name: 'テストユーザー',
    replies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createSampleVersion(overrides: Partial<any> = {}) {
  return {
    id: 1,
    note_id: 1,
    version_no: 1,
    title: 'サンプルノート',
    content_md: '# 古いバージョン',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createSampleTemplate(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'サンプルテンプレート',
    description: 'サンプルテンプレートの説明',
    content: '# {{title}}\n\n## 概要\n\n',
    is_system: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * 拡張テストフィクスチャ
 */
export const test = base.extend<{
  apiMock: ApiMockHelper;
  pageHelper: PageHelper;
}>({
  apiMock: async ({ page }, use) => {
    await use(new ApiMockHelper(page));
  },
  pageHelper: async ({ page }, use) => {
    await use(new PageHelper(page));
  },
});

export { expect };
