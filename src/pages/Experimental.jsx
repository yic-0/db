import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useRosterStore } from '../store/rosterStore'
import { useLineupStore } from '../store/lineupStore'
import CompactLineupEditor from '../components/CompactLineupEditor'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

export default function Experimental() {
  const { hasRole } = useAuthStore()
  const { members, fetchMembers } = useRosterStore()
  const { createLineup } = useLineupStore()

  const [activeTab, setActiveTab] = useState('compact')
  const [lineupName, setLineupName] = useState('')
  const [currentPositions, setCurrentPositions] = useState(null)

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Access check
  if (!hasRole('admin') && !hasRole('coach')) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <Icon name="close" size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-500">This page is only accessible to coaches and admins.</p>
      </div>
    )
  }

  const handleSave = async (positions) => {
    if (!lineupName.trim()) {
      toast.error('Enter a lineup name')
      return
    }

    // Convert compact format to standard format
    const standardPositions = {
      drummer: positions.drum?.id || null,
      steersperson: positions.steer?.id || null,
      paddlers: {
        left: positions.L.map(m => m?.id || null),
        right: positions.R.map(m => m?.id || null)
      },
      alternates: positions.alt.map(m => m?.id || null)
    }

    const result = await createLineup({
      name: lineupName,
      notes: 'Created in Lab',
      positions: standardPositions
    })

    if (result.success) {
      toast.success('Lineup saved!')
      setLineupName('')
    } else {
      toast.error('Failed to save')
    }
  }

  const tabs = [
    { id: 'compact', label: 'Compact Editor', icon: '⚡' },
    { id: 'info', label: 'Info', icon: 'ℹ️' },
  ]

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          <div>
            <h1 className="text-lg font-bold">Experimental Lab</h1>
            <p className="text-white/70 text-xs">Test new features</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'compact' && (
        <div className="space-y-3">
          {/* Name input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Lineup name..."
              value={lineupName}
              onChange={(e) => setLineupName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={() => currentPositions && handleSave(currentPositions)}
              disabled={!lineupName.trim()}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Icon name="check" size={14} />
              Save
            </button>
          </div>

          {/* Compact Editor */}
          <CompactLineupEditor
            members={members}
            boatSize={10}
            onPositionsChange={setCurrentPositions}
          />
        </div>
      )}

      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-bold text-slate-800">Compact Lineup Editor</h2>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-lg">🎯</span>
              <div>
                <p className="font-medium text-slate-800">Drag & Drop</p>
                <p className="text-xs">Drag pill-shaped member badges into boat positions</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-lg">🎨</span>
              <div>
                <p className="font-medium text-slate-800">Weight Colors</p>
                <p className="text-xs">
                  <span className="inline-block w-3 h-3 rounded-full bg-sky-400 mr-1" /> Light →
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 mx-1" /> →
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mx-1" /> →
                  <span className="inline-block w-3 h-3 rounded-full bg-rose-400 mx-1" /> Heavy
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-lg">⚖️</span>
              <div>
                <p className="font-medium text-slate-800">Balance Bar</p>
                <p className="text-xs">Visual L/R weight distribution with delta indicator</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-lg">👆</span>
              <div>
                <p className="font-medium text-slate-800">Hover for Details</p>
                <p className="text-xs">Hover over any member to see full info</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="font-medium text-slate-800 mb-2">Pill Format</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400 text-white">
                <span>John D.</span>
                <span className="opacity-80">165</span>
                <span className="w-3 h-3 rounded-full bg-blue-600 text-[8px] flex items-center justify-center font-bold">M</span>
              </div>
              <span className="text-xs text-slate-500">= Name, lb, M/F</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="font-medium text-slate-800 mb-2">Components</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="font-medium">CompactLineupEditor</p>
                <p className="text-slate-500">Minimal drag-drop builder</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg opacity-50">
                <p className="font-medium">CompactCompare</p>
                <p className="text-slate-500">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
