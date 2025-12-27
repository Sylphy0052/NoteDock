/**
 * AI API functions.
 *
 * Note: ASK API has rate limiting of 1 request per second.
 */

import type {
  AIFileUploadResponse,
  AIStatusResponse,
  AssistMode,
  AssistOptions,
  AskOptions,
  FolderAskOptions,
  FolderSummarizeOptions,
  GenerateOptions,
  ProjectAskOptions,
  StreamEvent,
  SuggestTagsRequest,
  SuggestTagsResponse,
  SummarizeOptions,
} from './types'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Check if AI features are enabled.
 */
export async function checkAIStatus(): Promise<AIStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/status`)
  if (!response.ok) {
    throw new Error('Failed to check AI status')
  }
  return response.json()
}

/**
 * Parse NDJSON stream and yield StreamEvent objects.
 */
async function* parseNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')

    // Process all complete lines except the last (which may be incomplete)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (line) {
        try {
          const event: StreamEvent = JSON.parse(line)
          yield event
        } catch {
          console.warn('Failed to parse stream line:', line)
        }
      }
    }

    // Keep the last incomplete line in the buffer
    buffer = lines[lines.length - 1]
  }

  // Process any remaining content in the buffer
  if (buffer.trim()) {
    try {
      const event: StreamEvent = JSON.parse(buffer.trim())
      yield event
    } catch {
      console.warn('Failed to parse final stream content:', buffer)
    }
  }
}

/**
 * Make a streaming POST request and yield StreamEvent objects.
 */
async function* streamRequest(
  endpoint: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is empty')
  }

  const reader = response.body.getReader()
  yield* parseNDJSONStream(reader)
}

/**
 * Generate content from a prompt.
 * Yields StreamEvent objects as they arrive.
 */
export async function* generateContent(
  prompt: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    prompt,
    template: options?.template,
    fileIds: options?.fileIds,
    modelVariant: options?.modelVariant,
  }

  yield* streamRequest('/ai/generate', body, signal)
}

/**
 * Generate content using DeepResearch.
 * Uses the DeepResearch project for enhanced research capabilities.
 * Yields StreamEvent objects as they arrive.
 */
export async function* deepResearch(
  prompt: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    prompt,
    template: options?.template,
    fileIds: options?.fileIds,
    modelVariant: options?.modelVariant,
    chatId: options?.chatId,
    parentId: options?.parentId,
  }

  yield* streamRequest('/ai/deep-research', body, signal)
}

/**
 * Summarize a note's content.
 * Yields StreamEvent objects as they arrive.
 */
export async function* summarizeNote(
  noteId: number,
  options?: SummarizeOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    noteId,
    length: options?.length || 'medium',
    style: options?.style || 'paragraph',
    focus: options?.focus,
    additionalFileIds: options?.additionalFileIds,
  }

  yield* streamRequest('/ai/summarize', body, signal)
}

/**
 * Ask a question about a note's content.
 * Supports multi-turn conversation via chatId and parentId.
 * Yields StreamEvent objects as they arrive.
 */
export async function* askQuestion(
  noteId: number,
  question: string,
  options?: AskOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    noteId,
    question,
    fileIds: options?.fileIds,
    chatId: options?.chatId,
    parentId: options?.parentId,
  }

  yield* streamRequest('/ai/ask', body, signal)
}

/**
 * Summarize all notes in a folder (including subfolders).
 * Yields StreamEvent objects as they arrive.
 */
export async function* summarizeFolder(
  folderId: number,
  options?: FolderSummarizeOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    folderId,
    length: options?.length || 'medium',
    style: options?.style || 'paragraph',
    focus: options?.focus,
    additionalFileIds: options?.additionalFileIds,
  }

  yield* streamRequest('/ai/folder/summarize', body, signal)
}

/**
 * Ask a question about all notes in a folder (including subfolders).
 * Supports multi-turn conversation via chatId and parentId.
 * Yields StreamEvent objects as they arrive.
 */
export async function* askFolderQuestion(
  folderId: number,
  question: string,
  options?: FolderAskOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    folderId,
    question,
    fileIds: options?.fileIds,
    chatId: options?.chatId,
    parentId: options?.parentId,
  }

  yield* streamRequest('/ai/folder/ask', body, signal)
}

/**
 * Ask a question about all notes in a project.
 * Supports multi-turn conversation via chatId and parentId.
 * Yields StreamEvent objects as they arrive.
 */
export async function* askProjectQuestion(
  projectId: number,
  question: string,
  options?: ProjectAskOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    projectId,
    question,
    fileIds: options?.fileIds,
    chatId: options?.chatId,
    parentId: options?.parentId,
  }

  yield* streamRequest('/ai/project/ask', body, signal)
}

/**
 * Assist with content editing.
 * Yields StreamEvent objects as they arrive.
 */
export async function* assistContent(
  content: string,
  mode: AssistMode,
  options?: AssistOptions,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    content,
    mode,
    customInstructions: options?.customInstructions,
    targetLanguage: options?.targetLanguage,
    fileIds: options?.fileIds,
    context: options?.context,
  }

  yield* streamRequest('/ai/assist', body, signal)
}

/**
 * Upload a file for use in AI chat.
 * Returns the file ID to use in subsequent requests.
 */
export async function uploadFileForAI(
  file: File,
  chatId: string
): Promise<AIFileUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('chat_id', chatId)

  const response = await fetch(`${API_BASE_URL}/ai/upload-file`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'File upload failed')
  }

  return response.json()
}

/**
 * Helper to collect full response from streaming.
 * Useful for non-streaming use cases.
 */
export async function collectStreamResponse(
  generator: AsyncGenerator<StreamEvent>
): Promise<{
  content: string
  messageId?: string
  sources?: StreamEvent['sources']
}> {
  let content = ''
  let messageId: string | undefined
  let sources: StreamEvent['sources']

  for await (const event of generator) {
    if (event.type === 'add_message_token' && event.token) {
      content += event.token
    } else if (event.type === 'replace_message' && event.message) {
      content = event.message
    } else if (event.type === 'add_bot_message_id' && event.id) {
      messageId = event.id
    } else if (event.type === 'add_used_sources' && event.sources) {
      sources = event.sources
    } else if (event.type === 'error' && event.message) {
      throw new Error(event.message)
    }
  }

  return { content, messageId, sources }
}

/**
 * Suggest tags for a note based on its content.
 * Returns tag suggestions with reasons and existing/new status.
 */
export async function suggestTags(
  request: SuggestTagsRequest
): Promise<SuggestTagsResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/suggest-tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: request.title,
      content: request.content,
      maxSuggestions: request.maxSuggestions ?? 5,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to suggest tags')
  }

  return response.json()
}
