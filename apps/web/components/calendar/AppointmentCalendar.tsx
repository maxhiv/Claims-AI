type Item = { id: string; title: string; start: string; end: string; status: 'confirmed'|'pending'|'canceled' };
function statusColor(s: Item['status']) {
  return s === 'confirmed' ? 'bg-green-500' : s === 'pending' ? 'bg-yellow-500' : 'bg-red-500';
}
export default function AppointmentCalendar({ items = [] as Item[] }) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Appointment Calendar</h2>
        <div className="text-xs text-gray-500">({items.length})</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.id} className="p-3 rounded-xl border bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="font-medium">{it.title}</p>
              <span className={`inline-block w-2 h-2 rounded-full ${statusColor(it.status)}`} />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(it.start).toLocaleString()} → {new Date(it.end).toLocaleTimeString()}
            </p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No appointments yet.</p>}
      </div>
    </div>
  );
}
