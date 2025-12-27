/**
 * CollaboratorCursors - Display other collaborators' cursors on the canvas
 */

import { Layer, Group, Line, Text, Circle } from 'react-konva'
import type { CursorPosition } from '../../hooks/useDrawingCollaboration'

interface CollaboratorCursorsProps {
  cursors: Map<string, CursorPosition>
  currentUserId?: string
  zoom?: number
}

export function CollaboratorCursors({
  cursors,
  currentUserId,
  zoom = 1,
}: CollaboratorCursorsProps) {
  const cursorArray = Array.from(cursors.values()).filter(
    (cursor) => cursor.user_id !== currentUserId
  )

  if (cursorArray.length === 0) {
    return null
  }

  return (
    <Layer listening={false}>
      {cursorArray.map((cursor) => (
        <Group key={cursor.user_id} x={cursor.x} y={cursor.y}>
          {/* Cursor arrow */}
          <Line
            points={[0, 0, 0, 16 / zoom, 12 / zoom, 12 / zoom]}
            fill={cursor.user_color}
            closed
            stroke={cursor.user_color}
            strokeWidth={1 / zoom}
          />
          {/* Name label */}
          <Group x={14 / zoom} y={10 / zoom}>
            {/* Label background */}
            <Circle
              x={0}
              y={0}
              radius={0}
              fill="transparent"
            />
            <Text
              text={cursor.user_name}
              fontSize={12 / zoom}
              fontFamily="sans-serif"
              fill="#fff"
              padding={4 / zoom}
              x={0}
              y={0}
            />
            {/* Background rectangle for label */}
            <Line
              points={[
                -4 / zoom,
                -2 / zoom,
                (cursor.user_name.length * 7 + 8) / zoom,
                -2 / zoom,
                (cursor.user_name.length * 7 + 8) / zoom,
                16 / zoom,
                -4 / zoom,
                16 / zoom,
              ]}
              fill={cursor.user_color}
              closed
              opacity={0.9}
            />
            <Text
              text={cursor.user_name}
              fontSize={12 / zoom}
              fontFamily="sans-serif"
              fill="#fff"
              x={0}
              y={0}
            />
          </Group>
        </Group>
      ))}
    </Layer>
  )
}
