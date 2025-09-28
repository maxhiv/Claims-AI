type Entry = { id: string; ts: string; who: string; channel: 'sms'|'email'|'voice'; preview: string };
export default function CommsLog({ items = [] as Entry[] }) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <h2 className="text-lg font-semibold mb-2">Communication Log</h2>
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="p-2 rounded-lg border bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{new Date(e.ts).toLocaleString()}</span>
              <span className="uppercase">{e.channel}</span>
            </div>
            <p className="text-sm text-gray-800 mt-1"><strong>{e.who}:</strong> {e.preview}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No communications yet.</p>}
      </div>
    </div>
  );
}
