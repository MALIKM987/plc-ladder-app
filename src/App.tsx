import { BlockLibrary } from './components/BlockLibrary'
import { BottomPanel } from './components/BottomPanel'
import { LadderEditor } from './components/LadderEditor'
import { SimulationPanel } from './components/SimulationPanel'
import { TopBar } from './components/TopBar'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <TopBar />

      <main className="workspace" aria-label="Obszar roboczy edytora PLC">
        <BlockLibrary />
        <LadderEditor />
        <SimulationPanel />
      </main>

      <BottomPanel />
    </div>
  )
}

export default App
