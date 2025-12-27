import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  X,
  List,
  CheckCircle,
  Circle,
  Lightbulb,
  Play,
  GripHorizontal,
} from 'lucide-react'
import {
  tutorialChapters,
  getTotalSteps,
  getStepIndex,
  TutorialChapter,
  TutorialStep,
} from './tutorialSteps'

interface TutorialOverlayProps {
  chapterIndex: number
  stepIndex: number
  onNavigate: (chapterIndex: number, stepIndex: number) => void
  onClose: () => void
  onComplete: () => void
}

export default function TutorialOverlay({
  chapterIndex,
  stepIndex,
  onNavigate,
  onClose,
  onComplete,
}: TutorialOverlayProps) {
  const [showChapterList, setShowChapterList] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const panel = panelRef.current
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: rect.left,
      posY: rect.top,
    }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const currentChapter = tutorialChapters[chapterIndex]
  const currentStep = currentChapter?.steps[stepIndex]
  const totalSteps = getTotalSteps()
  const currentGlobalStep = getStepIndex(chapterIndex, stepIndex)
  const progress = ((currentGlobalStep + 1) / totalSteps) * 100

  const isFirstStep = chapterIndex === 0 && stepIndex === 0
  const isLastStep =
    chapterIndex === tutorialChapters.length - 1 &&
    stepIndex === currentChapter.steps.length - 1

  const handlePrev = () => {
    if (stepIndex > 0) {
      onNavigate(chapterIndex, stepIndex - 1)
    } else if (chapterIndex > 0) {
      const prevChapter = tutorialChapters[chapterIndex - 1]
      onNavigate(chapterIndex - 1, prevChapter.steps.length - 1)
    }
  }

  const handleNext = () => {
    if (stepIndex < currentChapter.steps.length - 1) {
      onNavigate(chapterIndex, stepIndex + 1)
    } else if (chapterIndex < tutorialChapters.length - 1) {
      onNavigate(chapterIndex + 1, 0)
    } else {
      onComplete()
    }
  }

  const handleChapterSelect = (newChapterIndex: number) => {
    onNavigate(newChapterIndex, 0)
    setShowChapterList(false)
  }

  if (!currentChapter || !currentStep) {
    return null
  }

  return (
    <div className="tutorial-overlay">
      {/* Progress bar */}
      <div className="tutorial-progress-bar">
        <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Main panel */}
      <div
        ref={panelRef}
        className={`tutorial-panel ${isDragging ? 'dragging' : ''}`}
        style={position ? {
          position: 'fixed',
          left: position.x,
          top: position.y,
          bottom: 'auto',
          transform: 'none',
        } : undefined}
      >
        {/* Header */}
        <div className="tutorial-header">
          <div
            className="tutorial-drag-handle"
            onMouseDown={handleDragStart}
            title="ドラッグして移動"
          >
            <GripHorizontal size={16} />
          </div>
          <button
            className="tutorial-chapter-btn"
            onClick={() => setShowChapterList(!showChapterList)}
            title="章を選択"
          >
            <List size={18} />
            <span>
              第{chapterIndex + 1}章: {currentChapter.title}
            </span>
          </button>
          <button className="tutorial-close-btn" onClick={onClose} title="チュートリアルを終了">
            <X size={18} />
          </button>
        </div>

        {/* Chapter list dropdown */}
        {showChapterList && (
          <ChapterListDropdown
            chapters={tutorialChapters}
            currentChapterIndex={chapterIndex}
            onSelect={handleChapterSelect}
            onClose={() => setShowChapterList(false)}
          />
        )}

        {/* Step content */}
        <div className="tutorial-content">
          <div className="tutorial-step-indicator">
            ステップ {stepIndex + 1} / {currentChapter.steps.length}
          </div>

          <h3 className="tutorial-step-title">{currentStep.title}</h3>
          <p className="tutorial-step-description">{currentStep.description}</p>

          <div className="tutorial-instructions">
            <h4>
              <Play size={16} /> やってみよう
            </h4>
            <ol>
              {currentStep.instructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          </div>

          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="tutorial-tips">
              <h4>
                <Lightbulb size={16} /> ヒント
              </h4>
              <ul>
                {currentStep.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {currentStep.targetTool && (
            <div className="tutorial-tool-hint">
              使用ツール: <kbd>{currentStep.targetTool.toUpperCase()}</kbd>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="tutorial-navigation">
          <button
            className="tutorial-nav-btn"
            onClick={handlePrev}
            disabled={isFirstStep}
          >
            <ChevronLeft size={18} />
            前へ
          </button>

          <div className="tutorial-step-dots">
            {currentChapter.steps.map((_, i) => (
              <button
                key={i}
                className={`tutorial-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
                onClick={() => onNavigate(chapterIndex, i)}
                title={`ステップ ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="tutorial-nav-btn primary"
            onClick={handleNext}
          >
            {isLastStep ? '完了' : '次へ'}
            {!isLastStep && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChapterListDropdownProps {
  chapters: TutorialChapter[]
  currentChapterIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}

function ChapterListDropdown({
  chapters,
  currentChapterIndex,
  onSelect,
  onClose,
}: ChapterListDropdownProps) {
  return (
    <>
      <div className="tutorial-dropdown-backdrop" onClick={onClose} />
      <div className="tutorial-chapter-list">
        <h4>章を選択</h4>
        <ul>
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                className={`tutorial-chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
                onClick={() => onSelect(index)}
              >
                <span className="chapter-icon">
                  {index < currentChapterIndex ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                </span>
                <span className="chapter-number">第{index + 1}章</span>
                <span className="chapter-title">{chapter.title}</span>
                <span className="chapter-steps">{chapter.steps.length}ステップ</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
