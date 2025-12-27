import { test, expect, createSampleCompany, createSampleProject, createSampleNote, API_BASE_URL } from './fixtures';

test.describe('プロジェクト管理ページ', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    // Set up common mocks before each test
    await apiMock.mockTagsList([]);
    await apiMock.mockAIStatus(true);
  });

  test('プロジェクトページが表示される', async ({ page, apiMock }) => {
    // Set up mocks BEFORE navigation
    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([]);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトページが表示される
    await expect(page.locator('.projects-page')).toBeVisible({ timeout: 10000 });
    // サイドバーのプロジェクトヘッダーが表示される
    await expect(page.locator('.project-tree-header h3')).toHaveText('プロジェクト');
  });

  test('会社とプロジェクトのツリーが表示される', async ({ page, apiMock }) => {
    const company = createSampleCompany({ id: 1, name: 'テスト株式会社', project_count: 2 });
    const projects = [
      createSampleProject({
        id: 1,
        name: 'プロジェクトA',
        company_id: 1,
        company: { id: 1, name: 'テスト株式会社' },
        note_count: 3,
      }),
      createSampleProject({
        id: 2,
        name: 'プロジェクトB',
        company_id: 1,
        company: { id: 1, name: 'テスト株式会社' },
        note_count: 5,
      }),
      createSampleProject({
        id: 3,
        name: '独立プロジェクト',
        company_id: null,
        company: null,
        note_count: 2,
      }),
    ];

    await apiMock.mockCompaniesList([company]);
    await apiMock.mockProjectsList(projects);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 会社が表示される
    await expect(page.getByText('テスト株式会社')).toBeVisible({ timeout: 10000 });

    // 独立プロジェクト（会社なし）が表示される
    await expect(page.getByText('独立プロジェクト')).toBeVisible();
  });

  test('プロジェクトを選択するとノート一覧が表示される', async ({ page, apiMock }) => {
    const project = createSampleProject({
      id: 1,
      name: 'テストプロジェクト',
      note_count: 2,
    });
    const projectNotes = [
      createSampleNote({ id: 1, title: 'プロジェクトノート1', project_id: 1 }),
      createSampleNote({ id: 2, title: 'プロジェクトノート2', project_id: 1 }),
    ];

    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, projectNotes);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトをクリック（サイドバーのプロジェクト項目）
    await page.locator('.project-item').filter({ hasText: 'テストプロジェクト' }).click();

    // プロジェクトヘッダーが表示される
    await expect(page.locator('.projects-header h1').filter({ hasText: 'テストプロジェクト' })).toBeVisible({ timeout: 10000 });

    // プロジェクト内のノートが表示される
    await expect(page.locator('.project-note-item').filter({ hasText: 'プロジェクトノート1' })).toBeVisible();
    await expect(page.locator('.project-note-item').filter({ hasText: 'プロジェクトノート2' })).toBeVisible();
  });

  test('プロジェクト詳細にノート数が表示される', async ({ page, apiMock }) => {
    const project = createSampleProject({
      id: 1,
      name: 'ノート数表示テスト',
      note_count: 5,
    });

    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, []);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトをクリック
    await page.getByText('ノート数表示テスト').click();

    // ノート数が表示される
    await expect(page.getByText(/5.*ノート/)).toBeVisible({ timeout: 10000 });
  });

  test('会社情報がプロジェクト詳細に表示される', async ({ page, apiMock }) => {
    const company = createSampleCompany({ id: 1, name: '親会社', project_count: 1 });
    const project = createSampleProject({
      id: 1,
      name: '会社所属プロジェクト',
      company_id: 1,
      company: { id: 1, name: '親会社' },
      note_count: 0,
    });

    await apiMock.mockCompaniesList([company]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, []);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 会社をクリックして展開
    await page.locator('.company-item').filter({ hasText: '親会社' }).click();

    // 展開後、プロジェクトが表示されるまで待機
    await expect(page.locator('.project-item').filter({ hasText: '会社所属プロジェクト' })).toBeVisible({ timeout: 5000 });

    // プロジェクトをクリック
    await page.locator('.project-item').filter({ hasText: '会社所属プロジェクト' }).click();

    // 会社名がプロジェクト詳細に表示される
    await expect(page.locator('.project-company').filter({ hasText: '親会社' })).toBeVisible({ timeout: 10000 });
  });

  test('プロジェクトがない場合は空の状態が表示される', async ({ page, apiMock }) => {
    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([]);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // メインエリアの空の状態メッセージが表示される（サイドバーではなく）
    await expect(page.locator('.projects-empty-state h2')).toHaveText('プロジェクトを選択', { timeout: 10000 });
    // 「プロジェクトを作成」ボタンが表示される
    await expect(page.locator('.projects-empty-state button').filter({ hasText: 'プロジェクトを作成' })).toBeVisible();
  });

  test('AIに質問ボタンが表示される（AI有効時）', async ({ page, apiMock }) => {
    const project = createSampleProject({
      id: 1,
      name: 'AIテストプロジェクト',
      note_count: 1,
    });

    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, [createSampleNote({ id: 1, title: 'テストノート', project_id: 1 })]);
    await apiMock.mockAIStatus(true);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトを選択
    await page.getByText('AIテストプロジェクト').click();

    // AIに質問ボタンが表示される
    await expect(page.getByText('AIに質問')).toBeVisible({ timeout: 10000 });
  });

  test('AI無効時はAIボタンが表示されない', async ({ page, apiMock }) => {
    const project = createSampleProject({
      id: 1,
      name: 'AI無効テスト',
      note_count: 1,
    });

    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, []);
    await apiMock.mockAIStatus(false);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトを選択
    await page.getByText('AI無効テスト').click();

    // AIボタンが表示されない
    await expect(page.locator('button:has-text("AIに質問")')).not.toBeVisible();
  });

  test('会社を展開するとプロジェクトが表示される', async ({ page, apiMock }) => {
    const company = createSampleCompany({ id: 1, name: '展開テスト会社', project_count: 2 });
    const projects = [
      createSampleProject({
        id: 1,
        name: '子プロジェクト1',
        company_id: 1,
        company: { id: 1, name: '展開テスト会社' },
      }),
      createSampleProject({
        id: 2,
        name: '子プロジェクト2',
        company_id: 1,
        company: { id: 1, name: '展開テスト会社' },
      }),
    ];

    await apiMock.mockCompaniesList([company]);
    await apiMock.mockProjectsList(projects);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 会社が表示されることを確認
    await expect(page.getByText('展開テスト会社')).toBeVisible({ timeout: 10000 });

    // 会社をクリックして展開
    await page.getByText('展開テスト会社').click();

    // プロジェクトが表示される
    await expect(page.getByText('子プロジェクト1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('子プロジェクト2')).toBeVisible();
  });

  test('複数の会社とプロジェクトが正しく表示される', async ({ page, apiMock }) => {
    const companies = [
      createSampleCompany({ id: 1, name: 'A社', project_count: 1 }),
      createSampleCompany({ id: 2, name: 'B社', project_count: 2 }),
    ];
    const projects = [
      createSampleProject({
        id: 1,
        name: 'A社プロジェクト',
        company_id: 1,
        company: { id: 1, name: 'A社' },
      }),
      createSampleProject({
        id: 2,
        name: 'B社プロジェクト1',
        company_id: 2,
        company: { id: 2, name: 'B社' },
      }),
      createSampleProject({
        id: 3,
        name: 'B社プロジェクト2',
        company_id: 2,
        company: { id: 2, name: 'B社' },
      }),
    ];

    await apiMock.mockCompaniesList(companies);
    await apiMock.mockProjectsList(projects);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 両方の会社が表示される
    await expect(page.getByText('A社').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('B社').first()).toBeVisible();
  });
});

test.describe('プロジェクトAI機能', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    await apiMock.mockTagsList([]);
    await apiMock.mockAIStatus(true);
  });

  test('プロジェクトAIパネルが開閉できる', async ({ page, apiMock }) => {
    const project = createSampleProject({
      id: 1,
      name: 'AIパネルテスト',
      note_count: 1,
    });
    const notes = [createSampleNote({ id: 1, title: 'ノート1', project_id: 1 })];

    await apiMock.mockCompaniesList([]);
    await apiMock.mockProjectsList([project]);
    await apiMock.mockProjectNotes(1, notes);
    await apiMock.mockAIProjectAsk('これはAIの回答です。');

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // プロジェクトを選択
    await page.getByText('AIパネルテスト').click();

    // AIボタンをクリック
    await page.locator('button:has-text("AIに質問")').click();

    // AIパネルが開く
    await expect(page.locator('.ai-panel, .ai-ask-panel')).toBeVisible({ timeout: 10000 });
  });
});
