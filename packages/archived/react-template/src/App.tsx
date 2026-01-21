import './app.css'
import RemoteCard from './RemoteCard'

export default function App() {
  return (
    <div className="app">
      <h1>@dev-to/react-template</h1>
      <p>Vite Dev Server + @dev-to/react-plugin</p>
      <RemoteCard title="Local Render" />
    </div>
  )
}
