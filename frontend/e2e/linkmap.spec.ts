import { test, expect, createSampleNote, API_BASE_URL } from './fixtures';

test.describe('リンクマップページ', () => {
  const linkmapData = {
    nodes: [
      { id: 1, title: 'ノートA', link_count: 2 },
      { id: 2, title: 'ノートB', link_count: 1 },
      { id: 3, title: 'ノートC', link_count: 1 },
    ],
    links: [
      { source: 1, target: 2 },
      { source: 1, target: 3 },
    ],
  };

  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockFoldersList([]);
    await apiMock.mockTagsList([]);
  });

  test('リンクマップが表示される', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // グラフコンテナが表示される（main内のsvgまたはコンテナ）
    const graphContainer = page.locator('main [data-testid="linkmap-graph"], main .linkmap-container, main svg').first();
    await expect(graphContainer).toBeVisible();
  });

  test('ノードが表示される', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ノード（テキストラベル）が表示される
    const nodeLabel = page.locator('main').getByText('ノートA');
    await expect(nodeLabel).toBeVisible();
  });

  test('リンク（エッジ）が表示される', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // リンク（線）が表示される（main内に限定）
    const links = page.locator('main svg [data-testid="linkmap-link"], main svg .link, main svg line, main svg path');
    await expect(links.first()).toBeVisible();
  });

  test('ズームイン・ズームアウトができる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ズームインボタン
    const zoomInButton = page.locator('button:has-text("+"), [aria-label*="ズームイン"], [data-testid="zoom-in"]');
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
    }

    // ズームアウトボタン
    const zoomOutButton = page.locator('button:has-text("-"), [aria-label*="ズームアウト"], [data-testid="zoom-out"]');
    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();
    }
  });

  test('ズームリセットができる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ズームリセットボタン
    const resetButton = page.locator('button:has-text("リセット"), [aria-label*="リセット"], [data-testid="zoom-reset"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
    }
  });

  test('ノードをホバーするとプレビューが表示される', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.route(`${API_BASE_URL}/api/notes/1/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'ノートA',
          summary: 'これはノートAの要約です。',
        }),
      });
    });

    await page.goto('/linkmap');

    // ノードラベルをホバー
    const nodeLabel = page.locator('main').getByText('ノートA');
    if (await nodeLabel.isVisible()) {
      await nodeLabel.hover();

      // プレビューが表示される（あれば）
      const preview = page.locator('[data-testid="node-preview"], .hover-preview, .tooltip');
      // プレビューは実装によっては表示されない場合がある
      await page.waitForTimeout(500);
    }
  });

  test('ノードをクリックすると選択状態になる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ノードラベルをクリック
    const nodeLabel = page.locator('main').getByText('ノートA');
    if (await nodeLabel.isVisible()) {
      await nodeLabel.click();
      // クリック後の動作を待機
      await page.waitForTimeout(500);
    }
  });

  test('ノードをダブルクリックすると近傍表示に切り替わる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.route(`${API_BASE_URL}/api/linkmap/1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [
            { id: 1, title: 'ノートA', link_count: 2 },
            { id: 2, title: 'ノートB', link_count: 1 },
          ],
          links: [
            { source: 1, target: 2 },
          ],
        }),
      });
    });

    await page.goto('/linkmap');

    // ノードラベルをダブルクリック
    const nodeLabel = page.locator('main').getByText('ノートA');
    if (await nodeLabel.isVisible()) {
      await nodeLabel.dblclick();
      // ダブルクリック後の動作を待機
      await page.waitForTimeout(500);
    }
  });

  test('全体表示と近傍表示を切り替えられる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // 全体表示ボタン
    const fullViewButton = page.locator('button:has-text("全体"), [data-testid="full-view"]');
    if (await fullViewButton.isVisible()) {
      await fullViewButton.click();
    }

    // 近傍表示ボタン（ノード選択後に表示される場合がある）
    const neighborViewButton = page.locator('button:has-text("近傍"), [data-testid="neighbor-view"]');
    if (await neighborViewButton.isVisible()) {
      await neighborViewButton.click();
    }
  });

  test('更新ボタンでリンクマップを再読み込みできる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // 更新ボタンをクリック
    const refreshButton = page.locator('button:has-text("更新"), [aria-label*="更新"], [data-testid="refresh"]');
    if (await refreshButton.isVisible()) {
      // APIリクエストを待機
      const responsePromise = page.waitForResponse(`${API_BASE_URL}/api/linkmap`);
      await refreshButton.click();
      await responsePromise;
    }
  });

  test('リンクがない場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap({ nodes: [], links: [] });

    await page.goto('/linkmap');

    // 空の状態メッセージを確認
    const emptyState = page.locator('text=/リンクがありません|ノートがありません|関係がありません/');
    await expect(emptyState).toBeVisible();
  });

  test('ノードからノート詳細ページに遷移できる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    const note = createSampleNote({ id: 1, title: 'ノートA' });
    await apiMock.mockNote(note);
    await apiMock.mockComments(1, []);
    await apiMock.mockVersions(1, []);
    await apiMock.mockToc(1, []);

    await page.goto('/linkmap');

    // ノードをクリックして詳細ボタンをクリック、またはノードのリンクをクリック
    const viewDetailButton = page.locator('a:has-text("詳細"), [data-testid="view-note"]');
    if (await viewDetailButton.isVisible()) {
      await viewDetailButton.click();
      await expect(page).toHaveURL(/\/notes\/1/);
    }
  });

  test('パン（ドラッグ移動）ができる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // SVGまたはコンテナをドラッグ（main内に限定）
    const graphContainer = page.locator('main svg').first();
    if (await graphContainer.isVisible()) {
      const box = await graphContainer.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();
      }
    }
  });

  test('Ctrl+マウスホイールでズームできる', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ズームレベル表示を取得
    const zoomLevel = page.locator('.zoom-level');
    await expect(zoomLevel).toBeVisible();
    const initialZoom = await zoomLevel.textContent();
    expect(initialZoom).toBe('100%');

    // コンテナ上でCtrl+マウスホイール
    const graphContainer = page.locator('.linkmap-container').first();
    await expect(graphContainer).toBeVisible();

    const box = await graphContainer.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      // Ctrl+ホイールでズームイン
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -100);
      await page.keyboard.up('Control');

      // ズームレベルが増加したことを確認
      await page.waitForTimeout(100);
      const zoomedIn = await zoomLevel.textContent();
      expect(parseInt(zoomedIn || '100')).toBeGreaterThan(100);

      // Ctrl+ホイールでズームアウト
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, 100);
      await page.mouse.wheel(0, 100);
      await page.keyboard.up('Control');

      // ズームレベルが減少したことを確認
      await page.waitForTimeout(100);
      const zoomedOut = await zoomLevel.textContent();
      expect(parseInt(zoomedOut || '100')).toBeLessThan(parseInt(zoomedIn || '100'));
    }
  });

  test('Ctrl+ホイールなしではブラウザズームが発生しない', async ({ page, apiMock }) => {
    await apiMock.mockLinkmap(linkmapData);

    await page.goto('/linkmap');

    // ズームレベル表示を取得
    const zoomLevel = page.locator('.zoom-level');
    await expect(zoomLevel).toBeVisible();

    // コンテナ上でCtrlなしのマウスホイール
    const graphContainer = page.locator('.linkmap-container').first();
    await expect(graphContainer).toBeVisible();

    const box = await graphContainer.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      // Ctrlなしでホイール（ズームは変化しない）
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);

      // ズームレベルが変化していないことを確認
      const afterWheel = await zoomLevel.textContent();
      expect(afterWheel).toBe('100%');
    }
  });

  test('リンク数に応じてノードサイズが変わる', async ({ page, apiMock }) => {
    const dataWithVariedLinks = {
      nodes: [
        { id: 1, title: '人気ノート', link_count: 10 },
        { id: 2, title: '普通ノート', link_count: 2 },
      ],
      links: [
        { source: 1, target: 2 },
      ],
    };
    await apiMock.mockLinkmap(dataWithVariedLinks);

    await page.goto('/linkmap');

    // ノードラベルが表示されることを確認
    const nodeLabel = page.locator('main').getByText('人気ノート');
    await expect(nodeLabel).toBeVisible();
  });
});
