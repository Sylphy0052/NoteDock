import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface XlsxViewerProps {
  fileUrl: string
}

interface SheetData {
  name: string
  data: string[][]
}

export function XlsxViewer({ fileUrl }: XlsxViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadXlsx = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch spreadsheet')
        }

        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })

        const sheetsData: SheetData[] = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name]
          const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
          return { name, data: data as string[][] }
        })

        setSheets(sheetsData)
        setActiveSheet(0)
      } catch (err) {
        console.error('Error loading xlsx:', err)
        setError(err instanceof Error ? err.message : 'Failed to load spreadsheet')
      } finally {
        setLoading(false)
      }
    }

    loadXlsx()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="xlsx-viewer-loading">
        <div className="spinner" />
        <span>スプレッドシートを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="xlsx-viewer-error">
        <p>スプレッドシートの読み込みに失敗しました</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  }

  const currentSheet = sheets[activeSheet]

  return (
    <div className="xlsx-viewer">
      {sheets.length > 1 && (
        <div className="xlsx-tabs">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              className={`xlsx-tab ${index === activeSheet ? 'active' : ''}`}
              onClick={() => setActiveSheet(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="xlsx-table-container">
        {currentSheet && currentSheet.data.length > 0 ? (
          <table className="xlsx-table">
            <tbody>
              {currentSheet.data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="xlsx-empty">シートにデータがありません</div>
        )}
      </div>
    </div>
  )
}
