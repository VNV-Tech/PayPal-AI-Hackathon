import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import { Copilot } from './pages/Copilot'
import { Invoices } from './pages/Invoices'
import { Overview } from './pages/Overview'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="copilot" element={<Copilot />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="*" element={<EmptyState title="Page not found" description="This page doesn't exist." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
