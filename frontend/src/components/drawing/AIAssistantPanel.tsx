/**
 * AIAssistantPanel - AI drawing assistance panel
 */

import { useState, useCallback } from 'react'
import { Wand2, LayoutGrid, Loader2, Sparkles, X } from 'lucide-react'
import { suggestShapes, optimizeLayout, type Shape } from '../../api/drawings'
import Button from '../common/Button'

interface AIAssistantPanelProps {
  canvasWidth: number
  canvasHeight: number
  shapes: Shape[]
  onAddShapes: (shapes: Shape[]) => void
  onReplaceShapes: (shapes: Shape[]) => void
}

export function AIAssistantPanel({
  canvasWidth,
  canvasHeight,
  shapes,
  onAddShapes,
  onReplaceShapes,
}: AIAssistantPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<{
    type: 'suggestion' | 'optimization'
    message: string
    shapes?: Shape[]
    changes?: string[]
  } | null>(null)

  const handleSuggestShapes = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setResult(null)

    try {
      const response = await suggestShapes({
        prompt: prompt.trim(),
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        existing_shapes: shapes,
      })

      setResult({
        type: 'suggestion',
        message: response.explanation,
        shapes: response.shapes,
      })
    } catch (error) {
      console.error('Failed to suggest shapes:', error)
      setResult({
        type: 'suggestion',
        message: '図形の生成に失敗しました。もう一度お試しください。',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, canvasWidth, canvasHeight, shapes])

  const handleOptimizeLayout = useCallback(async () => {
    if (shapes.length === 0) {
      setResult({
        type: 'optimization',
        message: '最適化する図形がありません。',
      })
      return
    }

    setIsOptimizing(true)
    setResult(null)

    try {
      const response = await optimizeLayout({
        shapes,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        optimization_type: 'auto',
      })

      setResult({
        type: 'optimization',
        message: response.changes.join('\n'),
        shapes: response.shapes,
        changes: response.changes,
      })
    } catch (error) {
      console.error('Failed to optimize layout:', error)
      setResult({
        type: 'optimization',
        message: 'レイアウトの最適化に失敗しました。',
      })
    } finally {
      setIsOptimizing(false)
    }
  }, [shapes, canvasWidth, canvasHeight])

  const handleApplyResult = useCallback(() => {
    if (!result?.shapes) return

    if (result.type === 'suggestion') {
      onAddShapes(result.shapes)
    } else {
      onReplaceShapes(result.shapes)
    }

    setResult(null)
    setPrompt('')
  }, [result, onAddShapes, onReplaceShapes])

  return (
    <div className="ai-assistant-panel">
      <button
        className="ai-assistant-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="AI アシスタント"
      >
        <Sparkles size={16} />
        <span>AI</span>
      </button>

      {isExpanded && (
        <div className="ai-assistant-content">
          <div className="ai-assistant-header">
            <h4>
              <Sparkles size={14} />
              AI アシスタント
            </h4>
            <button
              className="ai-assistant-close"
              onClick={() => setIsExpanded(false)}
            >
              <X size={14} />
            </button>
          </div>

          {/* Shape Suggestion */}
          <div className="ai-assistant-section">
            <label>図形を生成</label>
            <div className="ai-assistant-input-group">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: フローチャート、四角と円..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleSuggestShapes()
                  }
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSuggestShapes}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
              </Button>
            </div>
            <div className="ai-assistant-hints">
              使用可能なキーワード: 四角、円、矢印、線、テキスト、フローチャート、ダイアグラム
            </div>
          </div>

          {/* Layout Optimization */}
          <div className="ai-assistant-section">
            <label>レイアウト最適化</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOptimizeLayout}
              disabled={isOptimizing || shapes.length === 0}
              leftIcon={
                isOptimizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LayoutGrid size={14} />
                )
              }
              className="ai-optimize-btn"
            >
              図形を整列・中央配置
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="ai-assistant-result">
              <div className="ai-result-message">
                {result.message.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              {result.shapes && result.shapes.length > 0 && (
                <div className="ai-result-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyResult}
                  >
                    {result.type === 'suggestion' ? '追加する' : '適用する'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setResult(null)}
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
