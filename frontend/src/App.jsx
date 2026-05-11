import { useState } from 'react'
import Header from './components/Header'
import UploadArea from './components/UploadArea'
import ReportView from './components/ReportView'
import CompareView from './components/CompareView'

function App() {
  const [mode, setMode]       = useState('analyze')  // 'analyze' | 'compare'
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setReport(null)
    setError(null)
  }

  const handleFileUpload = async (file) => {
    setLoading(true)
    setError(null)
    setReport(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Analysis failed')
      }

      const data = await response.json()
      setReport(data)
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing the document')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setReport(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mode={mode} onModeChange={handleModeChange} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Analyze mode ─────────────────────────────────────────── */}
        {mode === 'analyze' && (
          <>
            {!report && !loading && (
              <div className="max-w-2xl mx-auto">
                <UploadArea onFileUpload={handleFileUpload} error={error} />
              </div>
            )}

            {loading && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                    <p className="text-gray-600 font-medium">Analyzing document metadata…</p>
                    <p className="text-sm text-gray-500">This may take a few moments</p>
                  </div>
                </div>
              </div>
            )}

            {report && (
              <ReportView report={report} onReset={handleReset} />
            )}
          </>
        )}

        {/* ── Compare mode ─────────────────────────────────────────── */}
        {mode === 'compare' && (
          <CompareView />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-gray-200">
        <p className="text-center text-sm text-gray-500">
          This tool provides analysis of document metadata patterns. It does not provide
          definitive proof of manipulation. Always verify document authenticity through
          multiple methods and appropriate expertise.
        </p>
      </footer>
    </div>
  )
}

export default App
