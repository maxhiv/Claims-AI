export default function RouteSummary({ legs = [] as { from: string; to: string; driveTime: string }[] }) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <h2 className="text-lg font-semibold mb-2">Optimized Route</h2>
      {legs.length === 0 ? (
        <p className="text-sm text-gray-500">No route yet. Add two or more appointments.</p>
      ) : (
        <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
          {legs.map((l, i) => (
            <li key={i}>{l.from} → {l.to} • {l.driveTime}</li>
          ))}
        </ol>
      )}
      <button className="mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Open in Maps</button>
    </div>
  );
}
