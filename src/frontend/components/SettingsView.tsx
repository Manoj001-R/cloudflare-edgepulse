import React, { useState } from 'react';

export default function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [cloudflareToken, setCloudflareToken] = useState('cf_ai_••••••••••••••••••••••••••••••••');
  const [alertWebhook, setAlertWebhook] = useState('https://hooks.slack.com/services/T00/B00/XXXXX');
  const [aiModel, setAiModel] = useState('@cf/meta/llama-3.1-8b-instruct');
  const [autoRemediate, setAutoRemediate] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-scroll-area fade-in">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Platform Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure Workers AI inference parameters, alert webhooks, and automated incident triage thresholds.
          </p>
        </div>

        {saved && (
          <div className="mb-5 p-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Platform configuration saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* AI Settings */}
          <div className="white-card p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Workers AI Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Inference Model
                </label>
                <select
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-indigo-400"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                >
                  <option value="@cf/meta/llama-3.1-8b-instruct">@cf/meta/llama-3.1-8b-instruct (Recommended)</option>
                  <option value="@cf/meta/llama-3.1-70b-instruct">@cf/meta/llama-3.1-70b-instruct</option>
                  <option value="@cf/mistral/mistral-7b-instruct-v0.2">@cf/mistral/mistral-7b-instruct-v0.2</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Cloudflare API Token
                </label>
                <input
                  type="password"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-indigo-400"
                  value={cloudflareToken}
                  onChange={(e) => setCloudflareToken(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="white-card p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Alerts & Notification Webhooks</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Slack / PagerDuty Webhook URL
                </label>
                <input
                  type="url"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-indigo-400"
                  value={alertWebhook}
                  onChange={(e) => setAlertWebhook(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">Auto-Generate Remediation Playbooks</div>
                  <div className="text-[11px] text-slate-500">Automatically synthesize Terraform and Worker rules for P1/P2 incidents</div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  checked={autoRemediate}
                  onChange={(e) => setAutoRemediate(e.target.checked)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
