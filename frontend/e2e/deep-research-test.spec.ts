import { test, expect } from '@playwright/test'

test.describe('DeepResearch Multi-turn Conversation', () => {
  test('should show progress messages and stream response', async ({ page }) => {
    // Go to any page first to set localStorage
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')

    // Set display name in localStorage
    await page.evaluate(() => {
      localStorage.setItem('notedock_display_name', 'テストユーザー')
    })

    // Go to new note page (edit mode)
    await page.goto('http://localhost:3000/notes/new')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take a screenshot to see current state
    await page.screenshot({ path: 'test-results/before-click.png' })

    // Wait for editor toolbar to load
    await page.waitForSelector('.editor-toolbar, .toolbar-btn, [title="AIで生成"]', { timeout: 10000 })

    // Close any modal that might be open (like template selection)
    const modalOverlay = page.locator('.modal-overlay')
    if (await modalOverlay.isVisible()) {
      // Try clicking close button or pressing Escape multiple times
      const closeButton = page.locator('.modal-close, button:has-text("閉じる"), button:has-text("キャンセル")').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
      // Try again if still visible
      if (await modalOverlay.isVisible()) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    }

    // Wait for modal to close
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // Ignore if still visible, we'll try force click
    })

    // Click on AI Generate button (Sparkles icon with title "AIで生成")
    const aiButton = page.locator('button[title="AIで生成"]')
    await expect(aiButton).toBeVisible({ timeout: 5000 })
    // Use force click if modal is still blocking
    await aiButton.click({ force: true })

    // Wait for modal to appear
    await page.waitForSelector('.ai-generate-modal', { timeout: 5000 })

    // Take screenshot of modal
    await page.screenshot({ path: 'test-results/modal-opened.png' })

    // Click on DeepResearch tab
    const deepResearchTab = page.locator('button:has-text("DeepResearch")')
    await deepResearchTab.click()

    // Wait for tab to become active
    await page.waitForTimeout(500)

    // Verify DeepResearch tab is active by checking the class
    await expect(deepResearchTab).toHaveClass(/active/)
    console.log('DeepResearch tab is now active')

    // Take screenshot after tab switch
    await page.screenshot({ path: 'test-results/after-tab-switch.png' })

    // Verify placeholder changed to DeepResearch placeholder
    const promptTextarea = page.locator('textarea#ai-prompt')
    await expect(promptTextarea).toHaveAttribute('placeholder', /調査したいトピック/)
    console.log('Placeholder verified for DeepResearch')

    // Enter a prompt
    await promptTextarea.fill('テスト')

    // Verify prompt was filled
    const promptValue = await promptTextarea.inputValue()
    console.log('Prompt value after fill:', promptValue)

    // Take screenshot before clicking generate
    await page.screenshot({ path: 'test-results/before-generate.png' })

    // Add console listener to capture React state
    page.on('console', msg => {
      if (msg.text().includes('[DeepResearch]')) {
        console.log('Browser console:', msg.text())
      }
    })

    // Inject debugging into handleGenerate by checking button state
    // Use exact match to avoid matching "AI生成" tab
    const generateButton = page.getByRole('button', { name: '生成', exact: true })
    const isDisabled = await generateButton.isDisabled()
    console.log('Generate button disabled:', isDisabled)

    if (isDisabled) {
      console.log('ERROR: Generate button is disabled!')
      await page.screenshot({ path: 'test-results/button-disabled.png' })
    }

    // Click generate button
    await generateButton.click()
    console.log('Clicked generate button')

    // Take screenshot immediately after clicking
    await page.screenshot({ path: 'test-results/after-generate-click.png' })

    // Wait for conversation view to appear
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/after-generate-wait.png' })

    // Wait for user message to appear (increase timeout since async request may take time)
    await expect(page.locator('.ai-conversation-messages')).toBeVisible({ timeout: 10000 })
    console.log('Conversation messages container appeared')

    // Verify user message is shown
    await expect(page.locator('.ai-message-user').first()).toBeVisible({ timeout: 5000 })
    console.log('User message appeared')

    // Take screenshot after submitting
    await page.screenshot({ path: 'test-results/after-submit.png' })

    // Wait for assistant response (loading state)
    await expect(page.locator('.ai-message-assistant')).toBeVisible({ timeout: 10000 })
    console.log('Assistant message bubble appeared')

    // Take screenshot of loading state
    await page.screenshot({ path: 'test-results/loading-state.png' })

    // Check for loading indicator (spinner)
    const loadingIndicator = page.locator('.ai-message-assistant .animate-spin')
    const hasSpinner = await loadingIndicator.isVisible()
    console.log('Loading spinner visible:', hasSpinner)

    // Check for progress message or loading text
    const progressOrLoading = page.locator('.ai-message-loading')
    if (await progressOrLoading.isVisible()) {
      const progressText = await progressOrLoading.textContent()
      console.log('Progress/Loading text:', progressText)
    }

    // Wait for actual content (this may take 30+ seconds for DeepResearch)
    console.log('Waiting for response content (may take up to 90 seconds)...')
    await expect(page.locator('.ai-message-assistant .ai-streaming-text, .ai-message-assistant .ai-message-text')).toBeVisible({ timeout: 120000 })

    // Take screenshot of streaming response
    await page.screenshot({ path: 'test-results/streaming-response.png' })

    // Wait a bit for content to stream
    await page.waitForTimeout(3000)

    // Verify content has been streamed
    const contentLocator = page.locator('.ai-message-assistant .ai-streaming-text, .ai-message-assistant .ai-message-text')
    const contentText = await contentLocator.textContent()
    console.log('Response content (first 300 chars):', contentText?.slice(0, 300))
    expect(contentText?.length).toBeGreaterThan(10)

    // Wait for loading to complete
    await expect(page.locator('.ai-message-assistant .animate-spin')).not.toBeVisible({ timeout: 60000 })
    console.log('Loading completed')

    // Take screenshot of completed response
    await page.screenshot({ path: 'test-results/completed-response.png' })

    // Verify follow-up input is shown
    await expect(page.locator('.ai-followup-section')).toBeVisible({ timeout: 5000 })
    console.log('Follow-up input section is visible')

    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png' })

    console.log('Test passed! DeepResearch multi-turn conversation is working.')
  })
})
