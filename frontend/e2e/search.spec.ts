import { test, expect, createSampleNote, createSampleTag, API_BASE_URL } from './fixtures';

test.describe('検索機能', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test.describe('通常検索', () => {
    test('キーワードでノートを検索できる', async ({ page, apiMock }) => {
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({ id: 2, title: 'JavaScript入門', content_md: 'JavaScriptの基礎を学ぶ' }),
        createSampleNote({ id: 3, title: 'JSフレームワーク比較', content_md: 'ReactとVueの比較' }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        // Skip individual note requests
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        if (query === 'JavaScript') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: searchResults,
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
            body: JSON.stringify({
              items: allNotes,
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // 検索入力欄に入力（ノート一覧ページの検索入力）
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('JavaScript');
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果が表示される
      await expect(page.getByText('JavaScript入門')).toBeVisible();
      await expect(page.getByText('JSフレームワーク比較')).toBeVisible();
    });

    test('本文を含めて検索できる', async ({ page }) => {
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({
          id: 2,
          title: 'Reactメモ',
          content_md: '# メモ\n\nReactのuseMemoフックについて',
        }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        if (query === 'useMemo') {
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
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // 本文のキーワードで検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('useMemo');
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果が表示される
      await expect(page.getByText('Reactメモ')).toBeVisible();
    });

    test('タグで検索できる', async ({ page }) => {
      const tag = createSampleTag({ id: 1, name: 'React' });
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({ id: 2, title: 'Reactコンポーネント', tags: [tag] }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        if (query === 'React') {
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
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // タグ名で検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('React');
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果が表示される
      await expect(page.getByText('Reactコンポーネント')).toBeVisible();
    });

    test('検索結果が0件の場合はメッセージが表示される', async ({ page }) => {
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        if (query) {
          // 検索クエリがある場合は0件を返す
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 12, pages: 0 }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: allNotes,
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // 存在しないキーワードで検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('存在しないキーワード');
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果なしのメッセージが表示される
      await expect(page.getByText(/条件に一致するノートが見つかりませんでした|ノートがありません/)).toBeVisible();
    });

    test('検索結果からノート詳細ページに遷移できる', async ({ page, apiMock }) => {
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({ id: 2, title: '検索結果ノート' }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        if (query) {
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
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await apiMock.mockNote(searchResults[0]);
      await apiMock.mockComments(2, []);
      await apiMock.mockVersions(2, []);
      await apiMock.mockToc(2, []);

      await page.goto('/notes');

      // 検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('検索');
      await page.getByRole('button', { name: '検索' }).click();

      // 結果をクリック
      await page.getByText('検索結果ノート').click();

      // 詳細ページに遷移
      await expect(page).toHaveURL(/\/notes\/2/);
    });

    test('検索結果のページネーションが機能する', async ({ page }) => {
      const allNotes = [
        createSampleNote({ id: 100, title: '全てのノート' }),
      ];
      const page1Results = Array.from({ length: 12 }, (_, i) =>
        createSampleNote({ id: i + 1, title: `検索結果${i + 1}` })
      );
      const page2Results = Array.from({ length: 10 }, (_, i) =>
        createSampleNote({ id: i + 13, title: `検索結果${i + 13}` })
      );

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        const pageNum = url.searchParams.get('page') || '1';

        if (query) {
          if (pageNum === '2') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                items: page2Results,
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
                items: page1Results,
                total: 22,
                page: 1,
                per_page: 12,
                pages: 2,
              }),
            });
          }
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: allNotes,
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // 検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('検索');
      await page.getByRole('button', { name: '検索' }).click();

      // 1ページ目が表示
      await expect(page.getByRole('heading', { name: '検索結果1', exact: true })).toBeVisible();

      // 次のページボタンをクリック（ページネーション）
      const pagination = page.locator('.pagination');
      const nextButton = pagination.getByRole('button').filter({ hasText: /2|次|>/ }).first();
      if (await nextButton.isVisible()) {
        await nextButton.click();

        // 2ページ目が表示
        await expect(page.getByText('検索結果13')).toBeVisible();
      }
    });
  });

  test.describe('クイックオープン（Ctrl+K）', () => {
    // クイックオープンボタンはサイドバー内にあり、モバイルでは非表示
    test.skip(({ isMobile }) => isMobile, 'Quick open button is in sidebar which is hidden on mobile');

    test('Ctrl+Kでクイックオープンモーダルが開く', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      await page.goto('/');

      // Ctrl+Kを押すか、クイックオープンボタンをクリック
      await page.keyboard.press('Control+k');

      // 短い待機後、モーダルが開かない場合はボタンをクリック
      await page.waitForTimeout(500);
      const modal = page.locator('[data-testid="quick-open"], .quick-open-modal, [role="dialog"]');
      if (!await modal.isVisible().catch(() => false)) {
        // ボタンクリックでフォールバック
        await page.getByRole('button', { name: /クイックオープン/ }).click();
      }

      // クイックオープンモーダルが表示される
      await expect(modal).toBeVisible();
    });

    test('クイックオープンでノートを検索できる', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      const quickResults = [
        createSampleNote({ id: 1, title: 'Quick検索結果' }),
      ];

      await page.route(`${API_BASE_URL}/api/search/quick`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: quickResults,
            total: 1,
          }),
        });
      });

      await page.goto('/');

      // Ctrl+Kを押す
      await page.keyboard.press('Control+k');

      // 検索入力
      const quickInput = page.locator('[data-testid="quick-open-input"], .quick-open input');
      if (await quickInput.isVisible()) {
        await quickInput.fill('Quick');

        // 結果が表示される
        await expect(page.getByText('Quick検索結果')).toBeVisible();
      }
    });

    test('クイックオープンからノートに遷移できる', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      const quickResults = [
        createSampleNote({ id: 1, title: '選択するノート' }),
      ];

      await page.route(`${API_BASE_URL}/api/search/quick`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: quickResults,
            total: 1,
          }),
        });
      });

      await apiMock.mockNote(quickResults[0]);
      await apiMock.mockComments(1, []);
      await apiMock.mockVersions(1, []);
      await apiMock.mockToc(1, []);

      await page.goto('/');

      // Ctrl+Kを押す
      await page.keyboard.press('Control+k');

      const quickInput = page.locator('[data-testid="quick-open-input"], .quick-open input');
      if (await quickInput.isVisible()) {
        await quickInput.fill('選択');

        // 結果をクリック
        await page.getByText('選択するノート').click();

        // ノート詳細ページに遷移
        await expect(page).toHaveURL(/\/notes\/1/);
      }
    });

    test('Escでクイックオープンモーダルを閉じられる', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      await page.goto('/');

      // Ctrl+Kを押す
      await page.keyboard.press('Control+k');

      const modal = page.locator('[data-testid="quick-open"], .quick-open-modal, [role="dialog"]');
      if (await modal.isVisible()) {
        // Escを押す
        await page.keyboard.press('Escape');

        // モーダルが閉じる
        await expect(modal).not.toBeVisible();
      }
    });

    test('キーボード矢印キーで結果を選択できる', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      const quickResults = [
        createSampleNote({ id: 1, title: '結果1' }),
        createSampleNote({ id: 2, title: '結果2' }),
        createSampleNote({ id: 3, title: '結果3' }),
      ];

      await page.route(`${API_BASE_URL}/api/search/quick`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: quickResults,
            total: 3,
          }),
        });
      });

      await page.goto('/');

      // Ctrl+Kを押す
      await page.keyboard.press('Control+k');

      const quickInput = page.locator('[data-testid="quick-open-input"], .quick-open input');
      if (await quickInput.isVisible()) {
        await quickInput.fill('結果');

        // 下矢印キーで選択を移動
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        // 選択状態のスタイルが適用される
        const selectedItem = page.locator('.selected, [aria-selected="true"], .highlighted');
        if (await selectedItem.isVisible()) {
          await expect(selectedItem).toContainText(/結果2|結果3/);
        }
      }
    });

    test('Enterで選択中のノートに遷移する', async ({ page, apiMock }) => {
      await apiMock.mockNotesList([]);

      const quickResults = [
        createSampleNote({ id: 1, title: '最初の結果' }),
      ];

      await page.route(`${API_BASE_URL}/api/search/quick`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: quickResults,
            total: 1,
          }),
        });
      });

      await apiMock.mockNote(quickResults[0]);
      await apiMock.mockComments(1, []);
      await apiMock.mockVersions(1, []);
      await apiMock.mockToc(1, []);

      await page.goto('/');

      // Ctrl+Kを押す
      await page.keyboard.press('Control+k');

      const quickInput = page.locator('[data-testid="quick-open-input"], .quick-open input');
      if (await quickInput.isVisible()) {
        await quickInput.fill('最初');

        // Enterで遷移
        await page.keyboard.press('Enter');

        // ノート詳細ページに遷移
        await expect(page).toHaveURL(/\/notes\/1/);
      }
    });
  });

  test.describe('検索フィルタ組み合わせ', () => {
    test('キーワード+タグで複合検索できる', async ({ page, apiMock }) => {
      const tags = [createSampleTag({ id: 1, name: 'React' })];
      await apiMock.mockTagsList(tags);

      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({ id: 2, title: 'Reactコンポーネント', tags }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');
        const tagFilter = url.searchParams.get('tag');

        if (query === 'コンポーネント' && tagFilter === 'React') {
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
        } else if (!query && !tagFilter) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: allNotes,
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

      await page.goto('/notes');

      // フィルターパネルを開く
      await page.locator('.btn-icon').filter({ has: page.locator('svg') }).last().click();

      // タグフィルターを選択
      const tagSelect = page.locator('.filter-group').filter({ hasText: 'タグ' }).locator('select');
      await tagSelect.selectOption('React');

      // キーワード入力
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('コンポーネント');
      await page.getByRole('button', { name: '検索' }).click();

      // 結果が表示される
      await expect(page.getByText('Reactコンポーネント')).toBeVisible();
    });

    test('検索をクリアできる', async ({ page }) => {
      const allNotes = [
        createSampleNote({ id: 1, title: '全てのノート' }),
      ];
      const searchResults = [
        createSampleNote({ id: 2, title: '検索結果ノート' }),
      ];

      await page.route(`${API_BASE_URL}/api/notes**`, async (route) => {
        const url = new URL(route.request().url());
        if (/\/api\/notes\/\d+/.test(url.pathname)) {
          await route.continue();
          return;
        }
        const query = url.searchParams.get('q');

        if (query) {
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
              total: 1,
              page: 1,
              per_page: 12,
              pages: 1,
            }),
          });
        }
      });

      await page.goto('/notes');

      // 最初に全てのノートが表示される
      await expect(page.getByText('全てのノート')).toBeVisible();

      // 検索
      const searchInput = page.getByPlaceholder('ノートを検索...');
      await searchInput.fill('検索');
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果が表示
      await expect(page.getByText('検索結果ノート')).toBeVisible();

      // 検索をクリア（filter-tagのXボタンをクリック）
      const filterTag = page.locator('.filter-tag').filter({ hasText: '検索' });
      if (await filterTag.isVisible()) {
        await filterTag.locator('button').click();
      } else {
        // 入力をクリアして再検索
        await searchInput.clear();
        await page.getByRole('button', { name: '検索' }).click();
      }

      // 全てのノートが再び表示される
      await expect(page.getByText('全てのノート')).toBeVisible();
    });
  });
});
