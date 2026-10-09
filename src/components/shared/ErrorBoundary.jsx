import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// Keeps a crash in one page from blanking the whole app: the nav stays
// usable and the page shows a retry instead.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-2xl p-5 text-center space-y-2">
        <AlertTriangle size={22} className="text-accent-danger mx-auto" />
        <p className="text-text-primary text-sm font-semibold">This page hit an error</p>
        <p className="text-text-muted text-xs">{String(this.state.error?.message || this.state.error)}</p>
        <button onClick={() => this.setState({ error: null })}
          className="text-xs font-semibold bg-accent-primary text-white rounded-lg px-3 py-1.5">
          Try again
        </button>
      </div>
    )
  }
}
