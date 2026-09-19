import React from 'react';

interface Step {
  id: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface IncidentTimelineProps {
  steps: Step[];
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'AI Triage': '🧠 AI Triage',
  'check_dns': '🌐 DNS Check',
  'check_http': '📡 HTTP Check',
  'check_latency': '⏱️ Latency Check',
  'check_security_headers': '🛡️ Security Headers',
  'check_https_reachability': '🔒 HTTPS Reachability',
  'AI Analysis': '🔬 AI Analysis',
};

export default function IncidentTimeline({ steps }: IncidentTimelineProps) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-medium mb-2">
        Investigation Progress
      </p>
      <div className="space-y-0.5">
        {steps.map((step) => (
          <div key={step.id} className={`step-item step-${step.status}`}>
            <div className="step-icon">
              {step.status === 'pending' && '○'}
              {step.status === 'running' && (
                <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
              )}
              {step.status === 'completed' && '✓'}
              {step.status === 'failed' && '✗'}
              {step.status === 'skipped' && '—'}
            </div>
            <span className="flex-1 truncate">
              {TOOL_DISPLAY_NAMES[step.stepName] || step.stepName}
            </span>
            {step.status === 'failed' && step.error && (
              <span className="text-xs text-[var(--color-critical)] truncate max-w-[150px]" title={step.error}>
                {step.error}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
