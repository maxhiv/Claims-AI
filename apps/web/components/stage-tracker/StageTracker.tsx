type Props = { stage: string };
const order = ['Intake','Inspection Scheduled','Inspection Complete','Estimate Written','Carrier Approval Pending','Closed'];
export default function StageTracker({ stage }: Props) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
      <ol className="flex flex-wrap gap-2">
        {order.map(s => (
          <li key={s} className={`px-3 py-1.5 rounded-full text-sm border ${s===stage ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1.5 rounded-lg border text-sm">Update</button>
        <button className="px-3 py-1.5 rounded-lg border text-sm">Mark Complete</button>
      </div>
    </div>
  );
}
