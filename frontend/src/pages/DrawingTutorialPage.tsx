import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ArrowLeft, RotateCcw } from 'lucide-react'
import { DrawingProvider } from '../components/drawing/context/DrawingContext'
import { DrawingToolbar } from '../components/drawing/DrawingToolbar'
import { DrawingCanvas } from '../components/drawing/DrawingCanvas'
import { DrawingStylePanel } from '../components/drawing/DrawingStylePanel'
import { DrawingStatusBar } from '../components/drawing/DrawingStatusBar'
import { LayerPanel } from '../components/drawing/LayerPanel'
import { PropertyPanel } from '../components/drawing/PropertyPanel'
import TutorialOverlay from '../components/drawing/tutorial/TutorialOverlay'
import { tutorialChapters, getTotalSteps } from '../components/drawing/tutorial/tutorialSteps'
import '../styles/drawing.css'

type TutorialState = 'start' | 'active' | 'complete'

export function DrawingTutorialPage() {
  const navigate = useNavigate()
  const [tutorialState, setTutorialState] = useState<TutorialState>('start')
  const [chapterIndex, setChapterIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // キャンバスサイズの監視
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    // ResizeObserver でコンテナのサイズ変更を監視
    const resizeObserver = new ResizeObserver(updateSize)
    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      resizeObserver.disconnect()
    }
  }, [])

  const handleStart = () => {
    setTutorialState('active')
    setChapterIndex(0)
    setStepIndex(0)
  }

  const handleNavigate = useCallback((newChapterIndex: number, newStepIndex: number) => {
    setChapterIndex(newChapterIndex)
    setStepIndex(newStepIndex)
  }, [])

  const handleClose = () => {
    navigate('/drawings')
  }

  const handleComplete = () => {
    setTutorialState('complete')
  }

  const handleRestart = () => {
    setTutorialState('start')
    setChapterIndex(0)
    setStepIndex(0)
  }

  const handleGoToDrawings = () => {
    navigate('/drawings')
  }

  const handleStartDrawing = () => {
    navigate('/drawing')
  }

  return (
    <DrawingProvider>
      <div className="drawing-tutorial-page">
        {/* Start overlay */}
        {tutorialState === 'start' && (
          <div className="tutorial-start-overlay">
            <div className="tutorial-start-card">
              <h2>図形描画チュートリアル</h2>
              <p>
                図形描画ツールの使い方を学びましょう。
                <br />
                各章で説明を読んで、実際に操作を試すことができます。
              </p>
              <div className="chapter-count">
                全{tutorialChapters.length}章 / {getTotalSteps()}ステップ
              </div>
              <button className="tutorial-start-btn" onClick={handleStart}>
                <Play size={20} />
                チュートリアルを始める
              </button>
            </div>
          </div>
        )}

        {/* Complete overlay */}
        {tutorialState === 'complete' && (
          <div className="tutorial-start-overlay">
            <div className="tutorial-complete-card">
              <h2>チュートリアル完了！</h2>
              <p>
                おめでとうございます！
                <br />
                図形描画の基本機能をすべて学びました。
                <br />
                さっそく図面を作成してみましょう。
              </p>
              <div className="tutorial-complete-actions">
                <button className="btn btn-secondary" onClick={handleRestart}>
                  <RotateCcw size={18} />
                  もう一度
                </button>
                <button className="btn btn-primary" onClick={handleStartDrawing}>
                  図形描画を始める
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drawing page with tutorial overlay */}
        <div className="drawing-page">
          {/* Header */}
          <div className="drawing-header">
            <div className="drawing-header-left">
              <button
                className="btn btn-ghost btn-icon"
                onClick={handleGoToDrawings}
                title="図形描画一覧に戻る"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="drawing-header-title">チュートリアル</span>
            </div>
            <div className="drawing-header-actions">
              {tutorialState === 'active' && (
                <span className="tutorial-progress-text">
                  第{chapterIndex + 1}章: {tutorialChapters[chapterIndex]?.title}
                </span>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <DrawingToolbar />

          {/* Main content */}
          <div className="drawing-main">
            <div className="drawing-canvas-area" ref={canvasContainerRef}>
              <DrawingCanvas width={canvasSize.width} height={canvasSize.height} />
            </div>
            <div className="drawing-sidebar">
              <LayerPanel />
              <PropertyPanel />
              <DrawingStylePanel />
            </div>
          </div>

          {/* Status bar */}
          <DrawingStatusBar />
        </div>

        {/* Tutorial overlay */}
        {tutorialState === 'active' && (
          <TutorialOverlay
            chapterIndex={chapterIndex}
            stepIndex={stepIndex}
            onNavigate={handleNavigate}
            onClose={handleClose}
            onComplete={handleComplete}
          />
        )}
      </div>
    </DrawingProvider>
  )
}
