import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Network } from 'lucide-react'
import { getLinkmap, getNoteLinkmap } from '../api/linkmap'
import { getNoteSummary } from '../api/notes'
import type { LinkmapNode, LinkmapEdge, NoteSummary } from '../api/types'

interface NodePosition {
  x: number
  y: number
  vx: number
  vy: number
}

// Helper function to count shared tags between two nodes
function countSharedTags(tags1: number[], tags2: number[]): number {
  const set1 = new Set(tags1)
  return tags2.filter((t) => set1.has(t)).length
}

// Helper function to check if two nodes are in the same folder
function isSameFolder(folder1: number | null, folder2: number | null): boolean {
  if (folder1 === null || folder2 === null) return false
  return folder1 === folder2
}

// Simple force-directed graph layout - runs once and caches result
function useForceLayout(
  nodes: LinkmapNode[],
  edges: LinkmapEdge[],
  width: number,
  height: number,
  nodeIds: string
) {
  const [positions, setPositions] = useState<Map<number, NodePosition>>(new Map())
  const lastRunKeyRef = useRef('')

  useEffect(() => {
    // Only run if we have valid data
    if (nodes.length === 0 || width === 0 || height === 0) return

    // Create a unique key for this configuration
    const runKey = `${nodeIds}-${width}-${height}`
    if (lastRunKeyRef.current === runKey) return

    lastRunKeyRef.current = runKey

    // Create a map from node id to node data for quick lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Calculate final positions synchronously (no animation)
    const posMap = new Map<number, NodePosition>()
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length
      const radius = Math.min(width, height) * 0.3
      posMap.set(node.id, {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      })
    })

    // Run simulation synchronously for fixed iterations
    const maxIterations = 100
    for (let iter = 0; iter < maxIterations; iter++) {
      const nodeArray = Array.from(posMap.entries())

      // Repulsion between nodes (reduced based on relationships)
      // Priority: linked > same folder > shared tags
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const [id1, p1] = nodeArray[i]
          const [id2, p2] = nodeArray[j]
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          const node1 = nodeMap.get(id1)
          const node2 = nodeMap.get(id2)

          // Check relationships
          const sameFolder = node1 && node2 ? isSameFolder(node1.folder_id, node2.folder_id) : false
          const sharedTags = node1 && node2 ? countSharedTags(node1.tag_ids || [], node2.tag_ids || []) : 0

          // Repulsion force (reduced based on relationships)
          let repulsionStrength = 15000
          if (sameFolder) {
            repulsionStrength = 6000 // Much less repulsion for same folder
          } else if (sharedTags > 0) {
            repulsionStrength = 10000 // Less repulsion for shared tags
          }

          const force = repulsionStrength / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          p1.vx -= fx
          p1.vy -= fy
          p2.vx += fx
          p2.vy += fy

          // Attraction force for nodes in same folder (priority 2)
          if (sameFolder) {
            const idealDist = 150 // Closer for same folder
            const attractionForce = (dist - idealDist) * 0.05
            const afx = (dx / dist) * attractionForce
            const afy = (dy / dist) * attractionForce
            p1.vx += afx
            p1.vy += afy
            p2.vx -= afx
            p2.vy -= afy
          }
          // Attraction force for nodes sharing tags (priority 3, weaker)
          else if (sharedTags > 0) {
            const idealDist = 200 - sharedTags * 20
            const attractionForce = (dist - Math.max(140, idealDist)) * 0.02 * sharedTags
            const afx = (dx / dist) * attractionForce
            const afy = (dy / dist) * attractionForce
            p1.vx += afx
            p1.vy += afy
            p2.vx -= afx
            p2.vy -= afy
          }
        }
      }

      // Attraction along edges (priority 1 - strongest)
      // Linked nodes should be closest together
      edges.forEach((edge) => {
        const p1 = posMap.get(edge.from_note_id)
        const p2 = posMap.get(edge.to_note_id)
        if (p1 && p2) {
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const idealDist = 120 // Linked nodes should be close but readable
          const force = (dist - idealDist) * 0.08 // Stronger attraction
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          p1.vx += fx
          p1.vy += fy
          p2.vx -= fx
          p2.vy -= fy
        }
      })

      // Center gravity and apply velocity
      nodeArray.forEach(([, p]) => {
        p.vx += (width / 2 - p.x) * 0.01
        p.vy += (height / 2 - p.y) * 0.01
        p.vx *= 0.8
        p.vy *= 0.8
        p.x += p.vx
        p.y += p.vy
        p.x = Math.max(50, Math.min(width - 50, p.x))
        p.y = Math.max(50, Math.min(height - 50, p.y))
      })
    }

    setPositions(posMap)
  }, [nodes, edges, width, height, nodeIds])

  return positions
}

export default function LinkmapPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [hoverSummary, setHoverSummary] = useState<NoteSummary | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  // Get focused note from URL params
  const focusedNoteId = searchParams.get('focus') ? parseInt(searchParams.get('focus')!, 10) : null

  // Fetch linkmap data (full or nearby) - disable background refetch to prevent position reset
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['linkmap', focusedNoteId],
    queryFn: () => (focusedNoteId ? getNoteLinkmap(focusedNoteId) : getLinkmap()),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  })

  // Memoize nodes and edges based on their IDs to prevent unnecessary re-renders
  const nodeIds = data?.nodes?.map((n) => n.id).join(',') || ''
  const edgeKeys = data?.edges?.map((e) => `${e.from_note_id}-${e.to_note_id}`).join(',') || ''
  const nodes = useMemo(() => data?.nodes || [], [nodeIds])
  const edges = useMemo(() => data?.edges || [], [edgeKeys])

  // Get container dimensions - only on mount, not on resize
  const dimensionsSetRef = useRef(false)
  useEffect(() => {
    if (dimensionsSetRef.current) return
    if (containerRef.current) {
      dimensionsSetRef.current = true
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }
  }, [])

  // Force-directed layout
  const positions = useForceLayout(nodes, edges, dimensions.width, dimensions.height, nodeIds)

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Allow drag from anywhere in the container (not just the container itself)
      setDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    },
    [pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }
    },
    [dragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.3))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Mouse wheel zoom handler
  // Using native event listener to properly prevent default scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.min(Math.max(z * delta, 0.3), 3))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Node click handler
  const handleNodeClick = (nodeId: number) => {
    if (selectedNode === nodeId) {
      navigate(`/notes/${nodeId}`)
    } else {
      setSelectedNode(nodeId)
    }
  }

  // Node hover handlers
  const handleNodeMouseEnter = useCallback(async (nodeId: number, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setHoverPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
    }
    setHoveredNode(nodeId)

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Fetch summary after a short delay
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        const summary = await getNoteSummary(nodeId)
        setHoverSummary(summary)
      } catch (error) {
        console.error('Failed to fetch summary:', error)
      }
    }, 300)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredNode(null)
    setHoverSummary(null)
  }, [])

  // Toggle nearby view
  const handleToggleNearby = (nodeId: number | null) => {
    if (nodeId === null || focusedNoteId === nodeId) {
      setSearchParams({})
    } else {
      setSearchParams({ focus: String(nodeId) })
    }
  }

  return (
    <div className="linkmap-page">
      <header className="page-header">
        <h1>リンクマップ</h1>
        <p className="page-description">ノート間のリンク関係を可視化</p>
      </header>

      <div className="linkmap-toolbar">
        <button className="btn btn-icon" onClick={handleZoomIn} title="ズームイン">
          <ZoomIn size={18} />
        </button>
        <button className="btn btn-icon" onClick={handleZoomOut} title="ズームアウト">
          <ZoomOut size={18} />
        </button>
        <button className="btn btn-icon" onClick={handleReset} title="リセット">
          <Maximize2 size={18} />
        </button>
        <button className="btn btn-icon" onClick={() => refetch()} title="更新">
          <RefreshCw size={18} />
        </button>
        {focusedNoteId && (
          <button
            className="btn btn-icon active"
            onClick={() => handleToggleNearby(null)}
            title="全体表示に戻る"
          >
            <Network size={18} />
          </button>
        )}
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
      </div>

      <div
        ref={containerRef}
        className="linkmap-container"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="spinner" />
            <span>読み込み中...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="empty-state">
            <h2>リンクがありません</h2>
            <p>ノート間にリンクを作成すると、ここに表示されます</p>
          </div>
        ) : (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="linkmap-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="22"
                refY="3.5"
                orient="auto"
                className="linkmap-edge-arrow"
              >
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            </defs>
            {/* Edges */}
            <g className="linkmap-edges">
              {edges.map((edge, i) => {
                const from = positions.get(edge.from_note_id)
                const to = positions.get(edge.to_note_id)
                if (!from || !to) return null
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className="linkmap-edge"
                    markerEnd="url(#linkmap-arrowhead)"
                  />
                )
              })}
            </g>

            {/* Nodes */}
            <g className="linkmap-nodes">
              {nodes.map((node) => {
                const pos = positions.get(node.id)
                if (!pos) return null
                const isSelected = selectedNode === node.id
                const isFocused = focusedNoteId === node.id
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className={`linkmap-node ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                    onClick={() => handleNodeClick(node.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => handleNodeMouseEnter(node.id, e)}
                    onMouseLeave={handleNodeMouseLeave}
                    onDoubleClick={() => handleToggleNearby(node.id)}
                  >
                    {/* Larger invisible hit area for stable hover */}
                    <circle r={24} fill="transparent" style={{ cursor: 'pointer' }} />
                    <circle r={isSelected || isFocused ? 12 : 8} className="node-circle" />
                    <text y={25} textAnchor="middle" className="node-label">
                      {node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}

        {/* Hover tooltip */}
        {hoveredNode && hoverSummary && (
          <div
            className="linkmap-hover-card"
            style={{
              left: Math.min(hoverPosition.x + 10, dimensions.width - 280),
              top: Math.min(hoverPosition.y + 10, dimensions.height - 150),
            }}
          >
            <h4>{hoverSummary.title}</h4>
            {hoverSummary.summary && <p className="hover-summary">{hoverSummary.summary}</p>}
            <div className="hover-meta">
              <span>更新: {new Date(hoverSummary.updated_at).toLocaleDateString('ja-JP')}</span>
            </div>
            <div className="hover-hint">ダブルクリックで近傍を表示</div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="linkmap-tooltip">
          <span>ダブルクリックで近傍グラフ / クリックでノートを開く</span>
        </div>
      )}
      {focusedNoteId && (
        <div className="linkmap-focus-badge">
          近傍表示中: {nodes.find((n) => n.id === focusedNoteId)?.title || ''}
        </div>
      )}
    </div>
  )
}
