import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { EmptyState } from './components/ui'
import { SessionProvider } from './lib/session'
import { About } from './pages/About'
import { IdsSimulator } from './pages/IdsSimulator'
import { Overview } from './pages/Overview'
import { RulesGuide } from './pages/RulesGuide'
import { WebScanner } from './pages/WebScanner'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="web-scanner" element={<WebScanner />} />
            <Route path="ids-simulator" element={<IdsSimulator />} />
            <Route path="rules-guide" element={<RulesGuide />} />
            <Route path="about" element={<About />} />
            <Route path="*" element={
              <EmptyState title="Page not found"><Link to="/" className="text-teal hover:underline">Go to the overview</Link></EmptyState>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
