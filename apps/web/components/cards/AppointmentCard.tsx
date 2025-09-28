type Props = {
  name: string; date: string; time: string; location: string;
  status: 'confirmed'|'pending'|'canceled';
  claimNumber: string; policyNumber?: string; carrier?: string;
  notes?: string[];
};
export default function AppointmentCard(p: Props) {
  const badge = p.status === 'confirmed' ? 'text-green-700 bg-green-100' :
                p.status === 'pending' ? 'text-yellow-700 bg-yellow-100' :
                'text-red-700 bg-red-100';
  return (
    <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{p.name}</h3>
        <span className={`px-2 py-0.5 text-xs rounded-full ${badge}`}>{p.status}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm bg-gray-50 p-2 rounded-xl">
        <div>Claim: {p.claimNumber}</div>
        {p.policyNumber && <div>Policy: {p.policyNumber}</div>}
        {p.carrier && <div>{p.carrier}</div>}
      </div>
      <p className="text-sm text-gray-700">{p.date} – {p.time}</p>
      <p className="text-sm text-gray-600">{p.location}</p>
      <div className="flex gap-2 flex-wrap">
        <button className="px-3 py-1.5 rounded-lg border text-sm">Open Claim</button>
        <button className="px-3 py-1.5 rounded-lg border text-sm">Reschedule</button>
      </div>
      {p.notes?.length ? (
        <div className="text-sm text-gray-700 border-t pt-2">
          <div className="font-semibold mb-1">Communication Log</div>
          <ul className="space-y-1">{p.notes.map((n,i)=>(<li key={i}>• {n}</li>))}</ul>
        </div>
      ) : null}
    </div>
  );
}
