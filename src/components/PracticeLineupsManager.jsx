import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLineupStore } from '../store/lineupStore'
import { useRosterStore } from '../store/rosterStore'
import toast from 'react-hot-toast'
import LineupViewer from './LineupViewer'
import Icon from './Icon'

export default function PracticeLineupsManager({ practice }) {
  const navigate = useNavigate()
  const { members, fetchMembers } = useRosterStore()
  const {
    lineups: allLineups,
    fetchLineups,
    fetchPracticeLineups,
    linkLineupToPractice,
    unlinkLineupFromPractice
  } = useLineupStore()

  const [practiceLineups, setPracticeLineups] = useState([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedLineupId, setSelectedLineupId] = useState('')
  const [boatName, setBoatName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPracticeLineups()
    fetchLineups() // Load all lineups for linking
    fetchMembers() // Load members for lineup display
  }, [practice.id, fetchMembers])

  const loadPracticeLineups = async () => {
    const result = await fetchPracticeLineups(practice.id)
    if (result.success) {
      setPracticeLineups(result.data)
    }
  }

  const handleLinkLineup = async () => {
    if (!selectedLineupId) {
      toast.error('Please select a lineup')
      return
    }

    setLoading(true)
    const result = await linkLineupToPractice(
      selectedLineupId,
      practice.id,
      boatName || `Boat ${practiceLineups.length + 1}`
    )
    setLoading(false)

    if (result.success) {
      await loadPracticeLineups()
      setShowLinkModal(false)
      setSelectedLineupId('')
      setBoatName('')
    }
  }

  const handleUnlinkLineup = async (lineupId) => {
    if (!confirm('Unlink this lineup from the practice?')) return

    const result = await unlinkLineupFromPractice(lineupId)
    if (result.success) {
      await loadPracticeLineups()
    }
  }

  const handleViewLineup = (lineupId) => {
    // Navigate to lineups page with this lineup selected
    navigate(`/lineups?lineup=${lineupId}`)
  }

  const getPositionSummary = (positions) => {
    if (!positions) return 'No positions set'

    const filledCount = [
      positions.drummer,
      positions.steersperson,
      ...(positions.paddlers?.left || []),
      ...(positions.paddlers?.right || [])
    ].filter(Boolean).length

    return `${filledCount}/22`
  }

  // Filter out lineups already linked to this practice
  const availableLineups = allLineups.filter(
    lineup => !lineup.practice_id || lineup.practice_id === practice.id
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
            <Icon name="boat" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Boat Lineups</h3>
            <p className="text-sm text-slate-500">
              {practiceLineups.length} {practiceLineups.length === 1 ? 'boat' : 'boats'} configured
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            <Icon name="plus" size={16} /> Link Existing
          </button>
          <button
            onClick={() => navigate('/lineups')}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            <Icon name="plus" size={16} /> Create New
          </button>
        </div>
      </div>

      {/* Practice Lineups List */}
      {practiceLineups.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
            <Icon name="lineups" size={32} className="text-slate-300" />
          </div>
          <h4 className="text-lg font-semibold text-slate-900 mb-1">No Lineups Linked</h4>
          <p className="text-slate-500 max-w-sm text-sm">
            Link an existing lineup or create a new one to assign paddlers to boats for this practice.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {practiceLineups.map((lineup, index) => (
            <div key={lineup.id} className="card p-0 overflow-hidden border border-slate-200 hover:border-primary-200 transition-colors">
              {/* Lineup Header */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm">
                    {lineup.boat_name || `Boat ${index + 1}`}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">{lineup.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        <Icon name="roster" size={12} /> {getPositionSummary(lineup.positions)}
                      </span>
                      <span>•</span>
                      <span>Created by {lineup.created_by_profile?.full_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewLineup(lineup.id)}
                    className="btn btn-sm btn-secondary flex items-center gap-1.5"
                    title="Edit in lineup builder"
                  >
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleUnlinkLineup(lineup.id)}
                    className="btn btn-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-1.5"
                    title="Remove from this practice"
                  >
                    <Icon name="close" size={14} /> Unlink
                  </button>
                </div>
              </div>

              {/* Embedded Lineup Viewer */}
              <div className="p-4">
                <LineupViewer lineup={lineup} isOpen={true} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Lineup Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Link Lineup</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lineup Selection */}
              <div>
                <label className="label">Select Lineup</label>
                <select
                  value={selectedLineupId}
                  onChange={(e) => setSelectedLineupId(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a lineup...</option>
                  {availableLineups
                    .filter(l => l.practice_id !== practice.id)
                    .map((lineup) => (
                      <option key={lineup.id} value={lineup.id}>
                        {lineup.name} ({getPositionSummary(lineup.positions)})
                      </option>
                    ))}
                </select>
                {availableLineups.length === 0 && (
                   <p className="text-xs text-slate-500 mt-2">No available lineups found.</p>
                )}
              </div>

              {/* Boat Name */}
              <div>
                <label className="label">Boat Name</label>
                <input
                  type="text"
                  value={boatName}
                  onChange={(e) => setBoatName(e.target.value)}
                  placeholder={`e.g. Boat ${practiceLineups.length + 1}`}
                  className="input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional identifier if you have multiple boats.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLinkModal(false)
                  setSelectedLineupId('')
                  setBoatName('')
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkLineup}
                className="btn btn-primary"
                disabled={loading || !selectedLineupId}
              >
                {loading ? 'Linking...' : 'Link Lineup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}