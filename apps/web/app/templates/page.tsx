'use client';
import { useMemo, useState } from 'react';

const MERGE_FIELDS = [
  'POLICYHOLDER_NAME','ADJUSTER_NAME','CARRIER','CLAIM_NUMBER','DATE','TIME','ADDRESS','UPLOAD_LINK'
] as const;

type CarrierKey = 'Generic' | 'NFIP_WYO' | 'Liberty' | 'Allianz';

const PRESETS: Record<CarrierKey, Record<string,string>> = {
  Generic: {
    'Initial outreach (SMS)': 'Hi {{POLICYHOLDER_NAME}}, this is {{ADJUSTER_NAME}} with {{CARRIER}} regarding claim {{CLAIM_NUMBER}}. I can meet {{DATE}} at {{TIME}} at {{ADDRESS}}. Reply C to confirm or R to reschedule.',
    'Confirmation (SMS)': 'Your inspection is confirmed for {{DATE}} at {{TIME}}. Reply R to reschedule.',
    '24-hour reminder (SMS)': 'Reminder: Your inspection is tomorrow at {{TIME}}. Reply R to reschedule.',
    '1-hour ETA (SMS)': 'We’re on our way. ETA {{TIME}}. Please ensure access to all damaged areas.'
  },
  NFIP_WYO: {
    'Confirmation (SMS)': 'Your flood inspection is confirmed for {{DATE}} at {{TIME}}. Please have your SFIP policy, photo ID, and any mitigation receipts available. We only evaluate direct physical loss by or from flood.',
  },
  Liberty: {
    'Confirmation (Email)': 'Appointment set for {{DATE}} at {{TIME}}. For faster processing, upload photos via {{UPLOAD_LINK}} before the visit.'
  },
  Allianz: {
    'Reminder (SMS)': 'Reminder for {{DATE}} at {{TIME}}. If access changes, reply R. Have contractor estimates handy if available.'
  }
};

export default function TemplatesPage() {
  const [carrier, setCarrier] = useState<CarrierKey>('Generic');
  const [selected, setSelected] = useState<string>('');

  const templates = PRESETS[carrier];
  const preview = selected ? templates[selected] : '— Select a template —';

  const chips = useMemo(() => MERGE_FIELDS.map(mf => (
    <span key={mf} className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs mr-2 mb-2 inline-block">
      {{}}{`{{${mf}}}`}
    </span>
  )), []);

  const copy = () => navigator.clipboard.writeText(preview);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Templates</h1>

      <div className="border rounded-2xl p-4 bg-white space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['Generic','NFIP_WYO','Liberty','Allianz'] as CarrierKey[]).map(k => (
            <button
              key={k}
              onClick={() => { setCarrier(k); setSelected(''); }}
              className={`px-3 py-1.5 rounded-lg border text-sm ${carrier===k ? 'bg-blue-600 text-white' : ''}`}
            >
              {k.replace('_',' / ')}
            </button>
          ))}
        </div>

        <select className="border rounded-lg p-2 text-sm" value={selected} onChange={(e)=>setSelected(e.target.value)}>
          <option value="">— Select a template —</option>
          {Object.keys(templates).map(k => <option key={k}>{k}</option>)}
        </select>

        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
          <p className="font-semibold mb-1">Preview</p>
          <p>{preview}</p>
        </div>

        <div className="flex flex-wrap gap-2">{chips}</div>

        <div className="flex gap-2">
          <button onClick={copy} className="px-3 py-1.5 rounded-lg border text-sm">Copy</button>
          <button className="px-3 py-1.5 rounded-lg border text-sm" disabled>Send SMS</button>
          <button className="px-3 py-1.5 rounded-lg border text-sm" disabled>Send Email</button>
        </div>
      </div>
    </main>
  );
}
