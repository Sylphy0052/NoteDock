import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/common'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
