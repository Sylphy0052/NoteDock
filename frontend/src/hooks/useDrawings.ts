/**
 * useDrawings - 描画API用カスタムフック
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDrawings,
  getDrawing,
  createDrawing,
  updateDrawing,
  deleteDrawing,
  createShare,
  getShares,
  deleteShare,
  getSharedDrawing,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getHistory,
  rollbackDrawing,
  type DrawingCreate,
  type DrawingUpdate,
  type ShareCreate,
  type CommentCreate,
  type CommentUpdate,
  type DrawingResponse,
  type DrawingListResponse,
  type ShareResponse,
  type CommentResponse,
  type HistoryResponse,
  type SharedDrawingResponse,
} from '../api/drawings'

// クエリキー
export const drawingKeys = {
  all: ['drawings'] as const,
  lists: () => [...drawingKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...drawingKeys.lists(), params] as const,
  details: () => [...drawingKeys.all, 'detail'] as const,
  detail: (id: string) => [...drawingKeys.details(), id] as const,
  shares: (id: string) => [...drawingKeys.detail(id), 'shares'] as const,
  comments: (id: string) => [...drawingKeys.detail(id), 'comments'] as const,
  history: (id: string) => [...drawingKeys.detail(id), 'history'] as const,
  shared: (token: string) => ['shared-drawing', token] as const,
}

/**
 * 描画一覧を取得するフック
 */
export function useDrawingsList(params?: {
  page?: number
  per_page?: number
  q?: string
  is_public?: boolean
}) {
  return useQuery<DrawingListResponse>({
    queryKey: drawingKeys.list(params ?? {}),
    queryFn: () => getDrawings(params),
  })
}

/**
 * 単一の描画を取得するフック
 */
export function useDrawing(drawingId: string | undefined) {
  return useQuery<DrawingResponse>({
    queryKey: drawingKeys.detail(drawingId ?? ''),
    queryFn: () => getDrawing(drawingId!),
    enabled: !!drawingId,
  })
}

/**
 * 共有リンクから描画を取得するフック
 */
export function useSharedDrawing(token: string | undefined, password?: string) {
  return useQuery<SharedDrawingResponse>({
    queryKey: drawingKeys.shared(token ?? ''),
    queryFn: () => getSharedDrawing(token!, password),
    enabled: !!token,
  })
}

/**
 * 描画のコメントを取得するフック
 */
export function useDrawingComments(drawingId: string | undefined, includeResolved = true) {
  return useQuery<CommentResponse[]>({
    queryKey: drawingKeys.comments(drawingId ?? ''),
    queryFn: () => getComments(drawingId!, includeResolved),
    enabled: !!drawingId,
  })
}

/**
 * 描画の履歴を取得するフック
 */
export function useDrawingHistory(drawingId: string | undefined, limit = 100) {
  return useQuery<HistoryResponse[]>({
    queryKey: drawingKeys.history(drawingId ?? ''),
    queryFn: () => getHistory(drawingId!, limit),
    enabled: !!drawingId,
  })
}

/**
 * 描画の共有リンク一覧を取得するフック
 */
export function useDrawingShares(drawingId: string | undefined) {
  return useQuery<ShareResponse[]>({
    queryKey: drawingKeys.shares(drawingId ?? ''),
    queryFn: () => getShares(drawingId!),
    enabled: !!drawingId,
  })
}

/**
 * 描画CRUD操作用フック
 */
export function useDrawingMutations() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 描画作成
  const createDrawingMutation = useMutation({
    mutationFn: (data: DrawingCreate) => createDrawing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() })
    },
  })

  // 描画更新
  const updateDrawingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DrawingUpdate }) =>
      updateDrawing(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() })
    },
  })

  // 描画削除
  const deleteDrawingMutation = useMutation({
    mutationFn: (id: string) => deleteDrawing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() })
    },
  })

  // 便利なラッパー関数
  const create = useCallback(
    async (data: DrawingCreate): Promise<DrawingResponse> => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await createDrawingMutation.mutateAsync(data)
        return result
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [createDrawingMutation]
  )

  const update = useCallback(
    async (id: string, data: DrawingUpdate): Promise<DrawingResponse> => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await updateDrawingMutation.mutateAsync({ id, data })
        return result
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [updateDrawingMutation]
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true)
      setError(null)
      try {
        await deleteDrawingMutation.mutateAsync(id)
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [deleteDrawingMutation]
  )

  return {
    create,
    update,
    remove,
    isLoading:
      isLoading ||
      createDrawingMutation.isPending ||
      updateDrawingMutation.isPending ||
      deleteDrawingMutation.isPending,
    error,
  }
}

/**
 * 共有リンク操作用フック
 */
export function useShareMutations(drawingId: string) {
  const queryClient = useQueryClient()

  // 共有リンク作成
  const createShareMutation = useMutation({
    mutationFn: (data: ShareCreate) => createShare(drawingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.shares(drawingId) })
    },
  })

  // 共有リンク削除
  const deleteShareMutation = useMutation({
    mutationFn: (shareId: string) => deleteShare(drawingId, shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.shares(drawingId) })
    },
  })

  return {
    createShare: createShareMutation.mutateAsync,
    deleteShare: deleteShareMutation.mutateAsync,
    isCreating: createShareMutation.isPending,
    isDeleting: deleteShareMutation.isPending,
  }
}

/**
 * コメント操作用フック
 */
export function useCommentMutations(drawingId: string) {
  const queryClient = useQueryClient()

  // コメント作成
  const createCommentMutation = useMutation({
    mutationFn: (data: CommentCreate) => createComment(drawingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.comments(drawingId) })
    },
  })

  // コメント更新
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: CommentUpdate }) =>
      updateComment(drawingId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.comments(drawingId) })
    },
  })

  // コメント削除
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(drawingId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.comments(drawingId) })
    },
  })

  return {
    createComment: createCommentMutation.mutateAsync,
    updateComment: (commentId: string, data: CommentUpdate) =>
      updateCommentMutation.mutateAsync({ commentId, data }),
    deleteComment: deleteCommentMutation.mutateAsync,
    isCreating: createCommentMutation.isPending,
    isUpdating: updateCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
  }
}

/**
 * 履歴・ロールバック操作用フック
 */
export function useHistoryMutations(drawingId: string) {
  const queryClient = useQueryClient()

  // ロールバック
  const rollbackMutation = useMutation({
    mutationFn: (version: number) => rollbackDrawing(drawingId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(drawingId) })
      queryClient.invalidateQueries({ queryKey: drawingKeys.history(drawingId) })
    },
  })

  return {
    rollback: rollbackMutation.mutateAsync,
    isRollingBack: rollbackMutation.isPending,
  }
}
