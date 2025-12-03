import Icon from '../Icon'

export default function TeamProgressCard({
  weeklyTotal = 0,
  weeklyGoal = 50,
  topContributors = [],
  streak = 0,
  personalCount = 0,
  tierTarget = 4
}) {
  const weeklyPercentage = Math.min(100, Math.round((weeklyTotal / weeklyGoal) * 100))
  const personalPercentage = Math.min(100, Math.round((personalCount / tierTarget) * 100))

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
      {/* Personal Progress */}
      <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-50/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-lg">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-amber-700">{streak} day streak</span>
              </div>
            )}
          </div>
          <span className="text-sm font-bold text-primary-700">
            {personalCount}/{tierTarget} this week
          </span>
        </div>

        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
            style={{ width: `${personalPercentage}%` }}
          />
        </div>

        <p className="text-xs text-primary-600 mt-2">
          {personalCount >= tierTarget
            ? '🎉 You hit your weekly target!'
            : `${tierTarget - personalCount} more to reach your goal`}
        </p>
      </div>

      {/* Team Progress */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Icon name="roster" size={14} className="text-slate-500" />
            Team This Week
          </span>
          <span className="text-sm font-bold text-slate-800">{weeklyTotal} exercises</span>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${weeklyPercentage}%` }}
          />
        </div>

        {/* Top Contributors */}
        {topContributors.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Top Contributors</span>
            <div className="flex flex-wrap gap-2">
              {topContributors.slice(0, 5).map((contributor, idx) => (
                <div
                  key={contributor.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                  <span className="text-xs font-medium text-slate-700">{contributor.name?.split(' ')[0]}</span>
                  <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                    {contributor.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
