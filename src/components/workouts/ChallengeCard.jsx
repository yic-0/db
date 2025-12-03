import { useMemo } from 'react'
import { format, differenceInDays, isAfter, isBefore } from 'date-fns'
import Icon from '../Icon'

const TIER_CONFIG = {
  starter: {
    label: 'Starter',
    color: 'emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    progressClass: 'from-emerald-400 to-emerald-500'
  },
  committed: {
    label: 'Committed',
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    progressClass: 'from-blue-400 to-blue-500'
  },
  intense: {
    label: 'Intense',
    color: 'rose',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    progressClass: 'from-rose-400 to-rose-500'
  }
}

export default function ChallengeCard({
  challenge,
  userEnrollment,
  userProgress = 0,
  teamProgress = { total: 0, goal: 200, percentage: 0 },
  onJoin,
  onChangeTier,
  onLeave,
  compact = false
}) {
  const tier = userEnrollment?.tier
  const tierConfig = tier ? TIER_CONFIG[tier] : null

  const status = useMemo(() => {
    const now = new Date()
    const start = new Date(challenge.start_date)
    const end = new Date(challenge.end_date)

    if (isBefore(now, start)) {
      return { label: 'Upcoming', daysText: `Starts in ${differenceInDays(start, now)} days`, color: 'slate' }
    }
    if (isAfter(now, end)) {
      return { label: 'Ended', daysText: 'Challenge complete', color: 'slate' }
    }
    const daysLeft = differenceInDays(end, now)
    return { label: 'Active', daysText: `${daysLeft} days left`, color: 'success' }
  }, [challenge.start_date, challenge.end_date])

  const tierTarget = tier
    ? challenge[`${tier}_target`] || 4
    : challenge.committed_target || 4

  const userPercentage = Math.min(100, Math.round((userProgress / tierTarget) * 100))

  if (compact) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{challenge.emoji || ''}</span>
            <span className="font-bold text-slate-800 text-sm">{challenge.title}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            status.color === 'success' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {status.daysText}
          </span>
        </div>

        {userEnrollment ? (
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${tierConfig?.bgClass} ${tierConfig?.textClass}`}>
              {tierConfig?.label}
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierConfig?.progressClass} transition-all duration-500`}
                style={{ width: `${userPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700">{userProgress}/{tierTarget}</span>
          </div>
        ) : (
          <button
            onClick={onJoin}
            className="w-full py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            Join Challenge
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 overflow-hidden shadow-sm"
      style={{ borderTopColor: challenge.color || '#0891b2', borderTopWidth: '3px' }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{challenge.emoji || ''}</span>
            <div>
              <h3 className="font-bold text-slate-900">{challenge.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d')}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            status.color === 'success' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {status.daysText}
          </span>
        </div>

        {challenge.description && (
          <p className="text-sm text-slate-600 mt-3">{challenge.description}</p>
        )}

        {challenge.dragon_boat_relevance && (
          <div className="flex items-start gap-2 mt-3 p-2 bg-cyan-50/50 rounded-lg">
            <span className="text-sm">🚣</span>
            <p className="text-xs text-cyan-700">{challenge.dragon_boat_relevance}</p>
          </div>
        )}
      </div>

      {/* User Progress (if enrolled) */}
      {userEnrollment && (
        <div className={`p-4 ${tierConfig?.bgClass} border-t ${tierConfig?.borderClass}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${tierConfig?.textClass}`}>Your Progress</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-white/60 ${tierConfig?.textClass}`}>
                {tierConfig?.label} Tier
              </span>
            </div>
            <span className={`text-sm font-bold ${tierConfig?.textClass}`}>
              {userProgress}/{tierTarget} this week
            </span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tierConfig?.progressClass} transition-all duration-500`}
              style={{ width: `${userPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={onChangeTier}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              Change tier
            </button>
            <button
              onClick={onLeave}
              className="text-[10px] font-semibold text-red-500 hover:text-red-600"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Team Progress */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Icon name="roster" size={12} />
            Team Progress
          </span>
          <span className="text-sm font-bold text-slate-800">
            {teamProgress.total}/{teamProgress.goal}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
            style={{ width: `${teamProgress.percentage}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">
          {challenge.enrollments?.length || 0} teammates participating
        </p>
      </div>

      {/* Join Button (if not enrolled) */}
      {!userEnrollment && status.label !== 'Ended' && (
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onJoin}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-sm shadow-primary-500/20 transition-all"
          >
            Join This Challenge
          </button>
        </div>
      )}
    </div>
  )
}
