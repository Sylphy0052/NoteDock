import { useCallback, useEffect, RefObject } from 'react'

interface EditorShortcutsOptions {
  textareaRef: RefObject<HTMLTextAreaElement>
  onSave?: () => void
  onBold?: () => void
  onItalic?: () => void
  onHeading?: () => void
  onList?: () => void
  onCodeBlock?: () => void
  onLink?: () => void
}

export function useEditorShortcuts({
  textareaRef,
  onSave,
  onBold,
  onItalic,
  onHeading,
  onList,
  onCodeBlock,
  onLink,
}: EditorShortcutsOptions) {
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = prefix, placeholder: string = '') => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const selectedText = text.substring(start, end) || placeholder

      const newText =
        text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)

      textarea.value = newText
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // Set cursor position
      const newCursorPos = start + prefix.length + selectedText.length
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
      textarea.focus()
    },
    [textareaRef]
  )

  const handleBold = useCallback(() => {
    insertMarkdown('**', '**', '太字')
    onBold?.()
  }, [insertMarkdown, onBold])

  const handleItalic = useCallback(() => {
    insertMarkdown('*', '*', '斜体')
    onItalic?.()
  }, [insertMarkdown, onItalic])

  const handleHeading = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value

    // Find the start of the current line
    let lineStart = start
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--
    }

    // Insert ## at the start of the line
    const newText = text.substring(0, lineStart) + '## ' + text.substring(lineStart)

    textarea.value = newText
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.setSelectionRange(start + 3, start + 3)
    textarea.focus()
    onHeading?.()
  }, [textareaRef, onHeading])

  const handleList = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value

    // Find the start of the current line
    let lineStart = start
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--
    }

    // Insert - at the start of the line
    const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart)

    textarea.value = newText
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.setSelectionRange(start + 2, start + 2)
    textarea.focus()
    onList?.()
  }, [textareaRef, onList])

  const handleCodeBlock = useCallback(() => {
    insertMarkdown('\n```\n', '\n```\n', 'コード')
    onCodeBlock?.()
  }, [insertMarkdown, onCodeBlock])

  const handleLink = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end) || 'リンクテキスト'

    const newText = text.substring(0, start) + `[${selectedText}](URL)` + text.substring(end)

    textarea.value = newText
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    // Position cursor on URL
    const urlStart = start + selectedText.length + 3
    textarea.setSelectionRange(urlStart, urlStart + 3)
    textarea.focus()
    onLink?.()
  }, [textareaRef, onLink])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when focused on the textarea
      if (document.activeElement !== textareaRef.current) {
        // Allow Ctrl+S to work globally for save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          onSave?.()
        }
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault()
            onSave?.()
            break
          case 'b':
            e.preventDefault()
            handleBold()
            break
          case 'i':
            e.preventDefault()
            handleItalic()
            break
        }
      }

      // Ctrl+Shift combinations
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault()
            handleHeading()
            break
          case 'l':
            e.preventDefault()
            handleList()
            break
          case 'c':
            e.preventDefault()
            handleCodeBlock()
            break
          case 'k':
            e.preventDefault()
            handleLink()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    textareaRef,
    onSave,
    handleBold,
    handleItalic,
    handleHeading,
    handleList,
    handleCodeBlock,
    handleLink,
  ])

  return {
    insertMarkdown,
    handleBold,
    handleItalic,
    handleHeading,
    handleList,
    handleCodeBlock,
    handleLink,
  }
}
