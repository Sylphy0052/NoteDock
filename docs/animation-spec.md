# NoteDock アニメーション仕様書

## 概要

本ドキュメントは、NoteDockのUI/UXを向上させるためのアニメーション実装計画を定義します。
パフォーマンスとアクセシビリティを考慮した、控えめで効果的なアニメーションを目指します。

## 基本方針

### 1. パフォーマンス
- `transform` と `opacity` のみを使用（GPUアクセラレーション対象）
- 60fps を維持できるアニメーションのみ採用
- `will-change` の適切な使用

### 2. アクセシビリティ
- `prefers-reduced-motion: reduce` の尊重
- 必要な場合のみアニメーションを適用
- フォーカス状態の明確な視覚フィードバック

### 3. 一貫性
- 統一されたイージング関数とduration
- 意味のあるアニメーション（純粋な装飾は避ける）

---

## CSS変数定義

```css
:root {
  /* Duration */
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 250ms;
  --animation-duration-slow: 350ms;

  /* Easing */
  --animation-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --animation-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --animation-ease-in: cubic-bezier(0.4, 0, 1, 1);
  --animation-ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## アニメーション一覧

### Phase 1: 基本トランジション（必須）

#### 1.1 モーダル表示/非表示
**対象**: すべてのモーダル（KeyboardShortcutsModal, QuickOpenModal, etc.）

```css
/* オーバーレイ */
.modal-overlay {
  opacity: 0;
  transition: opacity var(--animation-duration-normal) var(--animation-ease-out);
}

.modal-overlay.visible {
  opacity: 1;
}

/* モーダル本体 */
.modal {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
  transition:
    opacity var(--animation-duration-normal) var(--animation-ease-out),
    transform var(--animation-duration-normal) var(--animation-ease-out);
}

.modal-overlay.visible .modal {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

**実装ポイント**:
- CSSトランジションを使用（JavaScript制御不要）
- `visible` クラスのトグルで制御
- React側で `useState` + 遅延による非表示処理

#### 1.2 ボタンホバー/クリック
**対象**: すべてのボタン（.btn, .icon-button）

```css
.btn,
.icon-button {
  transition:
    background-color var(--animation-duration-fast) var(--animation-ease-in-out),
    transform var(--animation-duration-fast) var(--animation-ease-in-out),
    box-shadow var(--animation-duration-fast) var(--animation-ease-in-out);
}

.btn:hover,
.icon-button:hover {
  transform: translateY(-1px);
}

.btn:active,
.icon-button:active {
  transform: translateY(0) scale(0.98);
}
```

#### 1.3 ナビゲーションアイテム
**対象**: サイドバーの各ナビゲーションリンク

```css
.nav-item {
  transition:
    background-color var(--animation-duration-fast) var(--animation-ease-in-out),
    color var(--animation-duration-fast) var(--animation-ease-in-out),
    padding-left var(--animation-duration-fast) var(--animation-ease-in-out);
}

.nav-item:hover {
  padding-left: calc(var(--spacing-md) + 4px);
}

.nav-item.active {
  position: relative;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
  animation: slideIn var(--animation-duration-fast) var(--animation-ease-out);
}

@keyframes slideIn {
  from {
    transform: translateY(-50%) scaleY(0);
  }
  to {
    transform: translateY(-50%) scaleY(1);
  }
}
```

---

### Phase 2: リスト・カードアニメーション

#### 2.1 ノートカードの出現
**対象**: ノート一覧ページのカード

```css
.note-card {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp var(--animation-duration-normal) var(--animation-ease-out) forwards;
}

/* Staggered animation */
.note-card:nth-child(1) { animation-delay: 0ms; }
.note-card:nth-child(2) { animation-delay: 50ms; }
.note-card:nth-child(3) { animation-delay: 100ms; }
.note-card:nth-child(4) { animation-delay: 150ms; }
.note-card:nth-child(5) { animation-delay: 200ms; }
.note-card:nth-child(6) { animation-delay: 250ms; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**React実装**:
```tsx
// useStaggeredAnimation.ts
import { useEffect, useState } from 'react';

export function useStaggeredAnimation(itemCount: number, baseDelay = 50) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleItems(prev => [...prev, i]);
        }, i * baseDelay)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [itemCount, baseDelay]);

  return visibleItems;
}
```

#### 2.2 ノートカードホバー
**対象**: ノートカード

```css
.note-card {
  transition:
    transform var(--animation-duration-fast) var(--animation-ease-out),
    box-shadow var(--animation-duration-fast) var(--animation-ease-out);
}

.note-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

#### 2.3 クイックアクションカード
**対象**: ホームページのクイックアクションカード

```css
.quick-action-card {
  transition:
    transform var(--animation-duration-fast) var(--animation-ease-out),
    box-shadow var(--animation-duration-fast) var(--animation-ease-out),
    border-color var(--animation-duration-fast) var(--animation-ease-in-out);
}

.quick-action-card:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
}

.quick-action-card:hover .quick-action-icon {
  transform: scale(1.1);
}

.quick-action-icon {
  transition: transform var(--animation-duration-fast) var(--animation-ease-bounce);
}
```

---

### Phase 3: インタラクティブアニメーション

#### 3.1 クイックオープンモーダル
**対象**: QuickOpenModal

```css
.quick-open-overlay {
  opacity: 0;
  transition: opacity var(--animation-duration-fast) var(--animation-ease-out);
}

.quick-open-overlay.visible {
  opacity: 1;
}

.quick-open-content {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
  transition:
    opacity var(--animation-duration-normal) var(--animation-ease-out),
    transform var(--animation-duration-normal) var(--animation-ease-out);
}

.quick-open-overlay.visible .quick-open-content {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* 検索結果アイテム */
.quick-open-result {
  transition: background-color var(--animation-duration-fast) var(--animation-ease-in-out);
}

.quick-open-result.highlighted {
  background-color: var(--color-primary-50);
}
```

#### 3.2 トースト通知
**対象**: 新規追加予定のトースト通知コンポーネント

```css
.toast {
  position: fixed;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  opacity: 0;
  transform: translateX(100%);
  transition:
    opacity var(--animation-duration-normal) var(--animation-ease-out),
    transform var(--animation-duration-normal) var(--animation-ease-out);
}

.toast.visible {
  opacity: 1;
  transform: translateX(0);
}

.toast.exiting {
  opacity: 0;
  transform: translateX(100%);
}
```

#### 3.3 ローディングスケルトン
**対象**: データ読み込み中の表示

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 25%,
    var(--color-gray-200) 50%,
    var(--color-gray-100) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

### Phase 4: 高度なアニメーション

#### 4.1 ページトランジション
**対象**: ルート間の遷移

```tsx
// PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**依存関係**: `framer-motion` ライブラリの追加が必要

#### 4.2 リンクマップアニメーション
**対象**: D3.jsによるリンクマップ

```tsx
// リンクマップのノード追加時
const nodeEnter = node.enter()
  .append('g')
  .attr('class', 'node')
  .attr('opacity', 0)
  .attr('transform', d => `translate(${d.x}, ${d.y})`);

nodeEnter.transition()
  .duration(300)
  .attr('opacity', 1);

// ノード移動時
node.transition()
  .duration(500)
  .ease(d3.easeCubicOut)
  .attr('transform', d => `translate(${d.x}, ${d.y})`);
```

#### 4.3 サイドバー折りたたみ
**対象**: サイドバーのcollapsed状態

```css
.sidebar {
  width: 240px;
  transition: width var(--animation-duration-normal) var(--animation-ease-in-out);
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar .nav-item span {
  opacity: 1;
  transition: opacity var(--animation-duration-fast) var(--animation-ease-in-out);
}

.sidebar.collapsed .nav-item span {
  opacity: 0;
  pointer-events: none;
}
```

---

## アクセシビリティ対応

すべてのアニメーションは `prefers-reduced-motion` を尊重する必要があります。

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 実装優先度

| Phase | 項目 | 工数 | 優先度 |
|-------|------|------|--------|
| 1 | モーダル表示/非表示 | 2h | 高 |
| 1 | ボタンホバー/クリック | 1h | 高 |
| 1 | ナビゲーションアイテム | 1h | 高 |
| 2 | ノートカード出現 | 2h | 中 |
| 2 | ノートカードホバー | 1h | 中 |
| 2 | クイックアクションカード | 1h | 中 |
| 3 | クイックオープンモーダル | 2h | 中 |
| 3 | トースト通知 | 3h | 中 |
| 3 | ローディングスケルトン | 2h | 中 |
| 4 | ページトランジション | 4h | 低 |
| 4 | リンクマップアニメーション | 3h | 低 |
| 4 | サイドバー折りたたみ | 2h | 低 |

---

## テスト計画

### E2Eテスト
```typescript
test('モーダルアニメーションが正しく動作する', async ({ page }) => {
  await page.goto('/');

  // モーダルを開く
  await page.getByRole('button', { name: /キーボードショートカット/ }).click();

  // アニメーション完了を待つ
  const modal = page.getByRole('dialog');
  await expect(modal).toHaveCSS('opacity', '1');
  await expect(modal).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('reduced-motion設定でアニメーションが無効化される', async ({ page }) => {
  // reduced-motion を有効化
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // アニメーションが即座に完了することを確認
  // ...
});
```

### 視覚回帰テスト
- Chromatic または Percy を使用したスナップショットテスト
- アニメーション前後の状態をキャプチャ

---

## 注意事項

1. **パフォーマンス監視**: Lighthouse のパフォーマンススコアを監視
2. **バンドルサイズ**: framer-motion 追加時のバンドルサイズ増加に注意（約15KB gzipped）
3. **ブラウザ互換性**: Safari での transform アニメーションの挙動を確認
4. **モバイル対応**: タッチデバイスでのホバー状態の代替表現を検討

---

## 参考リンク

- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [Framer Motion](https://www.framer.com/motion/)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.1 - Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
