import { useState, useEffect } from 'react'

interface CsvViewerProps {
  fileUrl: string
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  const result: string[][] = []

  for (const line of lines) {
    if (line.trim() === '') continue

    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          row.push(current)
          current = ''
        } else {
          current += char
        }
      }
    }
    row.push(current)
    result.push(row)
  }

  return result
}

export function CsvViewer({ fileUrl }: CsvViewerProps) {
  const [data, setData] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCsv = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch CSV file')
        }

        const text = await response.text()
        const parsedData = parseCsv(text)

        setData(parsedData)
      } catch (err) {
        console.error('Error loading CSV:', err)
        setError(err instanceof Error ? err.message : 'Failed to load CSV')
      } finally {
        setLoading(false)
      }
    }

    loadCsv()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="csv-viewer-loading">
        <div className="spinner" />
        <span>CSVを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="csv-viewer-error">
        <p>CSVの読み込みに失敗しました</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  }

  return (
    <div className="csv-viewer">
      <div className="csv-table-container">
        {data.length > 0 ? (
          <table className="csv-table">
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="csv-empty">CSVにデータがありません</div>
        )}
      </div>
    </div>
  )
}
