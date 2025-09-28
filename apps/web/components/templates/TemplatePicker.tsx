'use client';
import { useState } from 'react';

const templates: Record<string,string> = {
  'Initial outreach (SMS)': 'Hi {{POLICYHOLDER_NAME}}, this is {{ADJUSTER_NAME}} with {{CARRIER}} regarding claim {{CLAIM_NUMBER}}. I can meet {{DATE}} at {{TIME}} at {{ADDRESS}}. Reply C to confirm or R to reschedule.',
  'Confirmation (SMS)': 'Your inspection is confirmed for {{DATE}} at {{TIME}}. Reply R to reschedule.',
  '24-hour reminder (SMS)': 'Reminder: Your inspection is tomorrow at {{TIME}}. Reply R to reschedule.'
};

export default function TemplatePicker() {
  const [key, setKey] = useState<string>('');
  const preview = key ? templates[key] : '— Select a template —';
  const copy = () => navigator.clipboard.writeText(preview);
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <h2 className="text-lg font-semibold mb-3">Quick-Send Templates</h2>
      <select className="border rounded-lg p-2 text-sm" value={key} onChange={(e)=>setKey(e.target.value)}>
        <option value="">— Select a template —</option>
        {Object.keys(templates).map(k => <option key={k}>{k}</option>)}
      </select>
      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mt-3">
        <p className="font-semibold mb-1">Preview</p>
        <p>{preview}</p>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={copy} className="px-3 py-1.5 rounded-lg border text-sm">Copy</button>
        <button className="px-3 py-1.5 rounded-lg border text-sm" disabled>Send SMS</button>
        <button className="px-3 py-1.5 rounded-lg border text-sm" disabled>Send Email</button>
      </div>
    </div>
  );
}
