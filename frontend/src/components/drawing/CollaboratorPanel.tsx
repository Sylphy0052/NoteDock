/**
 * CollaboratorPanel - Display list of collaborators and connection status
 */

import { Users, Wifi, WifiOff, MessageCircle, X, Send } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Collaborator, ChatMessage } from '../../hooks/useDrawingCollaboration'

interface CollaboratorPanelProps {
  isConnected: boolean
  isConnecting: boolean
  collaborators: Collaborator[]
  currentUserId?: string
  chatMessages: ChatMessage[]
  onSendMessage: (message: string) => void
}

export function CollaboratorPanel({
  isConnected,
  isConnecting,
  collaborators,
  currentUserId,
  chatMessages,
  onSendMessage,
}: CollaboratorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [message, setMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, showChat])

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const otherCollaborators = collaborators.filter(
    (c) => c.user_id !== currentUserId
  )

  return (
    <div className="collaborator-panel">
      {/* Connection status and collaborator count */}
      <button
        className="collaborator-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isConnected ? '接続中' : isConnecting ? '接続中...' : '未接続'}
      >
        <span className="collaborator-status">
          {isConnected ? (
            <Wifi size={14} className="status-connected" />
          ) : isConnecting ? (
            <Wifi size={14} className="status-connecting" />
          ) : (
            <WifiOff size={14} className="status-disconnected" />
          )}
        </span>
        <Users size={14} />
        <span className="collaborator-count">
          {collaborators.length}
        </span>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="collaborator-panel-content">
          <div className="collaborator-panel-header">
            <h4>コラボレーター</h4>
            <div className="collaborator-panel-actions">
              <button
                className="collaborator-action-btn"
                onClick={() => setShowChat(!showChat)}
                title="チャット"
              >
                <MessageCircle size={14} />
              </button>
              <button
                className="collaborator-action-btn"
                onClick={() => setIsExpanded(false)}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Collaborator list */}
          <div className="collaborator-list">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.user_id}
                className="collaborator-item"
              >
                <span
                  className="collaborator-color"
                  style={{ backgroundColor: collaborator.user_color }}
                />
                <span className="collaborator-name">
                  {collaborator.user_name}
                  {collaborator.user_id === currentUserId && ' (あなた)'}
                </span>
              </div>
            ))}
            {otherCollaborators.length === 0 && (
              <div className="collaborator-empty">
                他のユーザーはいません
              </div>
            )}
          </div>

          {/* Chat section */}
          {showChat && (
            <div className="collaborator-chat">
              <div className="collaborator-chat-messages">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="chat-message">
                    <span
                      className="chat-message-author"
                      style={{ color: msg.user_color }}
                    >
                      {msg.user_name}:
                    </span>
                    <span className="chat-message-text">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="collaborator-chat-input">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                />
                <button onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
