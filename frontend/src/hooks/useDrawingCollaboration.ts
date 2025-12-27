/**
 * useDrawingCollaboration - WebSocket-based real-time collaboration hook
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Shape } from '../components/drawing/types'

// WebSocket message types
export interface Collaborator {
  user_id: string
  user_name: string
  user_color: string
  cursor_x?: number
  cursor_y?: number
}

export interface CursorPosition {
  user_id: string
  user_name: string
  user_color: string
  x: number
  y: number
}

export interface ChatMessage {
  user_id: string
  user_name: string
  user_color: string
  message: string
  timestamp: Date
}

export interface CollaborationState {
  isConnected: boolean
  isConnecting: boolean
  collaborators: Collaborator[]
  cursors: Map<string, CursorPosition>
  chatMessages: ChatMessage[]
  currentUser: {
    user_id: string
    user_name: string
    user_color: string
  } | null
}

interface UseDrawingCollaborationOptions {
  drawingId: string | null
  userName: string
  enabled?: boolean
  onShapeAdd?: (shape: Shape, userId: string) => void
  onShapeUpdate?: (shapeId: string, changes: Partial<Shape>, userId: string) => void
  onShapeDelete?: (shapeIds: string[], userId: string) => void
  onShapesSync?: (shapes: Shape[], userId: string) => void
}

export function useDrawingCollaboration({
  drawingId,
  userName,
  enabled = true,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  onShapesSync,
}: UseDrawingCollaborationOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    isConnecting: false,
    collaborators: [],
    cursors: new Map(),
    chatMessages: [],
    currentUser: null,
  })

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    if (!drawingId) return null

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '8000' // Backend port
    const encodedName = encodeURIComponent(userName)

    return `${protocol}//${host}:${port}/ws/drawing/${drawingId}?user_name=${encodedName}`
  }, [drawingId, userName])

  // Connect to WebSocket
  const connect = useCallback(() => {
    const url = getWsUrl()
    if (!url || !enabled) return

    setState((prev) => ({ ...prev, isConnecting: true }))

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
      }))

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        collaborators: [],
        cursors: new Map(),
      }))

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      // Attempt reconnect after 3 seconds
      if (enabled && drawingId) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [getWsUrl, enabled, drawingId])

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: { type: string; data?: Record<string, unknown>; collaborators?: Collaborator[] }) => {
      switch (message.type) {
        case 'connected':
          setState((prev) => ({
            ...prev,
            currentUser: message.data as CollaborationState['currentUser'],
            collaborators: message.collaborators || [],
          }))
          break

        case 'user_joined':
          setState((prev) => ({
            ...prev,
            collaborators: message.collaborators || prev.collaborators,
          }))
          break

        case 'user_left':
          setState((prev) => {
            const newCursors = new Map(prev.cursors)
            const userId = message.data?.user_id as string
            if (userId) {
              newCursors.delete(userId)
            }
            return {
              ...prev,
              collaborators: message.collaborators || prev.collaborators,
              cursors: newCursors,
            }
          })
          break

        case 'cursor_move':
          setState((prev) => {
            const newCursors = new Map(prev.cursors)
            const data = message.data as unknown as CursorPosition
            if (data && data.user_id) {
              newCursors.set(data.user_id, data)
            }
            return { ...prev, cursors: newCursors }
          })
          break

        case 'shape_add':
          if (onShapeAdd && message.data) {
            onShapeAdd(
              message.data.shape as Shape,
              message.data.user_id as string
            )
          }
          break

        case 'shape_update':
          if (onShapeUpdate && message.data) {
            onShapeUpdate(
              message.data.shape_id as string,
              message.data.changes as Partial<Shape>,
              message.data.user_id as string
            )
          }
          break

        case 'shape_delete':
          if (onShapeDelete && message.data) {
            onShapeDelete(
              message.data.shape_ids as string[],
              message.data.user_id as string
            )
          }
          break

        case 'shapes_sync':
          if (onShapesSync && message.data) {
            onShapesSync(
              message.data.shapes as Shape[],
              message.data.user_id as string
            )
          }
          break

        case 'chat':
          setState((prev) => ({
            ...prev,
            chatMessages: [
              ...prev.chatMessages,
              {
                user_id: message.data?.user_id as string,
                user_name: message.data?.user_name as string,
                user_color: message.data?.user_color as string,
                message: message.data?.message as string,
                timestamp: new Date(),
              },
            ].slice(-100), // Keep last 100 messages
          }))
          break

        case 'pong':
          // Ping response - no action needed
          break
      }
    },
    [onShapeAdd, onShapeUpdate, onShapeDelete, onShapesSync]
  )

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  // Send message to WebSocket
  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  // Send cursor position
  const sendCursorMove = useCallback(
    (x: number, y: number) => {
      send({ type: 'cursor_move', x, y })
    },
    [send]
  )

  // Send shape add
  const sendShapeAdd = useCallback(
    (shape: Shape) => {
      send({ type: 'shape_add', shape })
    },
    [send]
  )

  // Send shape update
  const sendShapeUpdate = useCallback(
    (shapeId: string, changes: Partial<Shape>) => {
      send({ type: 'shape_update', shape_id: shapeId, changes })
    },
    [send]
  )

  // Send shape delete
  const sendShapeDelete = useCallback(
    (shapeIds: string[]) => {
      send({ type: 'shape_delete', shape_ids: shapeIds })
    },
    [send]
  )

  // Send shapes sync
  const sendShapesSync = useCallback(
    (shapes: Shape[]) => {
      send({ type: 'shapes_sync', shapes })
    },
    [send]
  )

  // Send selection change
  const sendSelectionChange = useCallback(
    (selectedIds: string[]) => {
      send({ type: 'selection_change', selected_ids: selectedIds })
    },
    [send]
  )

  // Send chat message
  const sendChatMessage = useCallback(
    (message: string) => {
      send({ type: 'chat', message })
    },
    [send]
  )

  // Connect on mount and when drawingId changes
  useEffect(() => {
    if (enabled && drawingId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, drawingId, connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    sendCursorMove,
    sendShapeAdd,
    sendShapeUpdate,
    sendShapeDelete,
    sendShapesSync,
    sendSelectionChange,
    sendChatMessage,
  }
}
