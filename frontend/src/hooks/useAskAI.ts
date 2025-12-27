import { useState, useCallback, useRef } from 'react'
import {
  generateContent,
  deepResearch,
  summarizeNote,
  askQuestion,
  assistContent,
  summarizeFolder,
  askFolderQuestion,
  askProjectQuestion,
} from '../api/ai'
import type {
  AssistMode,
  AssistOptions,
  AskOptions,
  BotResponseSource,
  FolderAskOptions,
  FolderSummarizeOptions,
  GenerateOptions,
  ProjectAskOptions,
  StreamEvent,
  SummarizeOptions,
} from '../api/types'

interface UseAskAIState {
  isLoading: boolean
  content: string
  error: string | null
  sources: BotResponseSource[]
  messageId: string | null
  chatId: string | null
  progressMessage: string | null
}

interface UseAskAIReturn extends UseAskAIState {
  generate: (prompt: string, options?: GenerateOptions) => Promise<void>
  deepResearchFn: (prompt: string, options?: GenerateOptions) => Promise<void>
  summarize: (noteId: number, options?: SummarizeOptions) => Promise<void>
  ask: (noteId: number, question: string, options?: AskOptions) => Promise<void>
  assist: (
    content: string,
    mode: AssistMode,
    options?: AssistOptions
  ) => Promise<void>
  summarizeFolderFn: (
    folderId: number,
    options?: FolderSummarizeOptions
  ) => Promise<void>
  askFolderFn: (
    folderId: number,
    question: string,
    options?: FolderAskOptions
  ) => Promise<void>
  askProjectFn: (
    projectId: number,
    question: string,
    options?: ProjectAskOptions
  ) => Promise<void>
  cancel: () => void
  reset: () => void
}

const initialState: UseAskAIState = {
  isLoading: false,
  content: '',
  error: null,
  sources: [],
  messageId: null,
  chatId: null,
  progressMessage: null,
}

/**
 * Hook for AI operations with streaming support.
 *
 * Note: ASK API has rate limiting of 1 request per second.
 */
export function useAskAI(): UseAskAIReturn {
  const [state, setState] = useState<UseAskAIState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const processStream = useCallback(
    async (generator: AsyncGenerator<StreamEvent>) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        content: '',
        error: null,
        sources: [],
        messageId: null,
        progressMessage: null,
      }))

      try {
        for await (const event of generator) {
          if (event.type === 'add_message_token' && event.token) {
            setState((prev) => ({
              ...prev,
              content: prev.content + event.token,
              progressMessage: null, // Clear progress when content starts
            }))
          } else if (event.type === 'add_progress_message' && event.message) {
            setState((prev) => ({
              ...prev,
              progressMessage: event.message.trim() || null,
            }))
          } else if (event.type === 'replace_message' && event.message) {
            setState((prev) => ({
              ...prev,
              content: event.message || '',
            }))
          } else if (event.type === 'add_bot_message_id' && event.id) {
            setState((prev) => ({
              ...prev,
              messageId: event.id || null,
            }))
          } else if (event.type === 'add_used_sources' && event.sources) {
            setState((prev) => ({
              ...prev,
              sources: event.sources || [],
            }))
          } else if (event.type === 'error' && event.message) {
            setState((prev) => ({
              ...prev,
              error: event.message || 'Unknown error',
            }))
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled - not an error
          return
        }
        const errorMessage =
          err instanceof Error ? err.message : 'AI処理中にエラーが発生しました'
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }))
      } finally {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }))
        abortControllerRef.current = null
      }
    },
    []
  )

  const generate = useCallback(
    async (prompt: string, options?: GenerateOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = generateContent(
        prompt,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const deepResearchFn = useCallback(
    async (prompt: string, options?: GenerateOptions) => {
      abortControllerRef.current = new AbortController()
      // Generate or reuse chatId for conversation continuity
      // Use crypto.randomUUID if available, otherwise fallback to manual UUID generation
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID()
        }
        // Fallback for browsers that don't support crypto.randomUUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }
      const currentChatId = state.chatId || generateUUID()
      // Use messageId from previous response as parentId
      const parentId = state.messageId || undefined

      // Update chatId immediately if it's new
      if (!state.chatId) {
        setState((prev) => ({ ...prev, chatId: currentChatId }))
      }

      const generator = deepResearch(
        prompt,
        {
          ...options,
          chatId: currentChatId,
          parentId,
        },
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream, state.chatId, state.messageId]
  )

  const summarize = useCallback(
    async (noteId: number, options?: SummarizeOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = summarizeNote(
        noteId,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const ask = useCallback(
    async (noteId: number, question: string, options?: AskOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = askQuestion(
        noteId,
        question,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const assist = useCallback(
    async (content: string, mode: AssistMode, options?: AssistOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = assistContent(
        content,
        mode,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const summarizeFolderFn = useCallback(
    async (folderId: number, options?: FolderSummarizeOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = summarizeFolder(
        folderId,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const askFolderFn = useCallback(
    async (folderId: number, question: string, options?: FolderAskOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = askFolderQuestion(
        folderId,
        question,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const askProjectFn = useCallback(
    async (projectId: number, question: string, options?: ProjectAskOptions) => {
      abortControllerRef.current = new AbortController()
      const generator = askProjectQuestion(
        projectId,
        question,
        options,
        abortControllerRef.current.signal
      )
      await processStream(generator)
    },
    [processStream]
  )

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }))
    }
  }, [])

  const reset = useCallback(() => {
    cancel()
    setState(initialState)
  }, [cancel])

  return {
    ...state,
    generate,
    deepResearchFn,
    summarize,
    ask,
    assist,
    summarizeFolderFn,
    askFolderFn,
    askProjectFn,
    cancel,
    reset,
  }
}
