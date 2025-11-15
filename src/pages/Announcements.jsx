export default function Announcements() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
        <button className="btn btn-primary">
          + New Announcement
        </button>
      </div>

      <div className="card">
        <p className="text-gray-600">
          Team announcements coming soon...
        </p>
      </div>
    </div>
  )
}
