import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import PageTransition from './PageTransition'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Restore from localStorage if available
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem('sidebar-collapsed', String(newValue))
      return newValue
    })
  }, [])

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
        <main className="main-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
