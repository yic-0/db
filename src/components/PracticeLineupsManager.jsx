import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLineupStore } from '../store/lineupStore'
import { useRosterStore } from '../store/rosterStore'
import toast from 'react-hot-toast'
import LineupViewer from './LineupViewer'

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

    return `${filledCount}/22 positions filled`
  }

  // Filter out lineups already linked to this practice
  const availableLineups = allLineups.filter(
    lineup => !lineup.practice_id || lineup.practice_id === practice.id
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Practice Lineups</h3>
          <p className="text-sm text-gray-600">
            {practiceLineups.length} {practiceLineups.length === 1 ? 'boat' : 'boats'} configured
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="btn-secondary text-sm"
          >
            + Link Existing Lineup
          </button>
          <button
            onClick={() => navigate('/lineups')}
            className="btn-primary text-sm"
          >
            + Create New Lineup
          </button>
        </div>
      </div>

      {/* Practice Lineups List */}
      {practiceLineups.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600 mb-4">No lineups linked to this practice yet</p>
          <p className="text-sm text-gray-500">
            Link an existing lineup or create a new one to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {practiceLineups.map((lineup, index) => (
            <div key={lineup.id} className="border rounded-lg overflow-hidden">
              {/* Lineup Header */}
              <div className="bg-gray-50 p-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm font-medium">
                    {lineup.boat_name || `Boat ${index + 1}`}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{lineup.name}</h4>
                    <p className="text-sm text-gray-600">
                      {getPositionSummary(lineup.positions)}
                      <span className="mx-2">•</span>
                      Created by {lineup.created_by_profile?.full_name}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewLineup(lineup.id)}
                    className="btn-secondary text-sm"
                    title="Edit in lineup builder"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleUnlinkLineup(lineup.id)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1"
                    title="Remove from this practice"
                  >
                    Unlink
                  </button>
                </div>
              </div>

              {/* Embedded Lineup Viewer */}
              <div className="bg-white p-4">
                <LineupViewer lineup={lineup} isOpen={true} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Lineup Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Link Lineup to Practice
              </h3>

              <div className="space-y-4">
                {/* Lineup Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lineup
                  </label>
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
                </div>

                {/* Boat Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Boat Name/Number
                  </label>
                  <input
                    type="text"
                    value={boatName}
                    onChange={(e) => setBoatName(e.target.value)}
                    placeholder={`Boat ${practiceLineups.length + 1}`}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - used to identify boats when you have multiple
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setSelectedLineupId('')
                    setBoatName('')
                  }}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkLineup}
                  className="btn-primary flex-1"
                  disabled={loading || !selectedLineupId}
                >
                  {loading ? 'Linking...' : 'Link Lineup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
