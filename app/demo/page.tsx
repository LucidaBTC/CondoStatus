'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Sample data from real TSCC 1511 certificate
const DEMO_ANALYSIS = {
  corporation: "Toronto Standard Condominium Corporation No. 1511",
  address: "650 Lawrence Avenue West, Unit 519, Toronto, ON M6A 3E8",
  certificate_date: "April 21, 2021",
  expiry_date: "July 21, 2021",
  risk_rating: "GREEN" as const,
  page_count: 47,
  summary: { total: 28, verified: 22, warnings: 3, missing: 3 },
  sections: {
    common_expenses: {
      title: "Common Expenses",
      items: [
        { id: "ce-1", key: "monthly_common_expenses", label: "Monthly Common Expenses", value: "$635.86", status: "ok" as const, confidence: "high" as const, page: 3, quote: null, reason: "" },
        { id: "ce-2", label: "Unit Arrears", value: "$0.00 (NIL)", status: "ok" as const, confidence: "high" as const, page: 4, quote: null, reason: "" },
        { id: "ce-3", label: "Parking Unit", value: "B092", status: "ok" as const, confidence: "high" as const, page: 2, quote: null, reason: "" },
        { id: "ce-4", label: "Common Interest", value: "0.3086294%", status: "ok" as const, confidence: "high" as const, page: 2, quote: null, reason: "" },
      ]
    },
    reserve_fund: {
      title: "Reserve Fund",
      items: [
        { id: "rf-1", key: "reserve_fund_balance", label: "Reserve Fund Balance", value: "$3,304,327.04", status: "ok" as const, confidence: "high" as const, page: 12, quote: null, reason: "" },
        { id: "rf-2", key: "reserve_per_unit", label: "Reserve Per Unit", value: "$7,667.58", status: "ok" as const, confidence: "high" as const, page: 12, quote: null, reason: "Healthy - above $5,000/unit threshold" },
        { id: "rf-3", label: "Reserve Study Date", value: "November 27, 2018", status: "warning" as const, confidence: "high" as const, page: 12, quote: "Reserve Fund Study dated November 27, 2018", reason: "Study is 2.5 years old - approaching 3-year limit" },
        { id: "rf-4", label: "Study Preparer", value: "R and C Engineering Ltd.", status: "ok" as const, confidence: "high" as const, page: 12, quote: null, reason: "" },
        { id: "rf-5", label: "Annual Contribution", value: "$542,849.00", status: "ok" as const, confidence: "high" as const, page: 12, quote: null, reason: "" },
        { id: "rf-6", label: "Adequacy", value: "Adequate (per Board)", status: "ok" as const, confidence: "medium" as const, page: 12, quote: null, reason: "" },
      ]
    },
    insurance: {
      title: "Insurance Coverage",
      items: [
        { id: "ins-1", label: "Building Coverage", value: "$114,908,821.00", status: "ok" as const, confidence: "high" as const, page: 15, quote: null, reason: "" },
        { id: "ins-2", label: "Standard Deductible", value: "$10,000", status: "ok" as const, confidence: "high" as const, page: 15, quote: null, reason: "" },
        { id: "ins-3", label: "Water Damage Deductible", value: "$10,000", status: "ok" as const, confidence: "high" as const, page: 15, quote: null, reason: "Below $25k threshold" },
        { id: "ins-4", label: "Flood Deductible", value: "$25,000", status: "warning" as const, confidence: "high" as const, page: 15, quote: "Flood deductible: $25,000", reason: "At threshold - verify coverage" },
        { id: "ins-5", label: "Liability Coverage", value: "$10,000,000", status: "ok" as const, confidence: "high" as const, page: 15, quote: null, reason: "" },
      ]
    },
    legal_proceedings: {
      title: "Legal & Compliance",
      items: [
        { id: "leg-1", label: "Outstanding Judgments", value: "None", status: "ok" as const, confidence: "high" as const, page: 8, quote: null, reason: "" },
        { id: "leg-2", label: "Current Litigation", value: "None", status: "ok" as const, confidence: "high" as const, page: 8, quote: null, reason: "" },
        { id: "leg-3", label: "Administrator Appointed", value: "No", status: "ok" as const, confidence: "high" as const, page: 9, quote: null, reason: "" },
      ]
    },
    management: {
      title: "Management & Governance",
      items: [
        { id: "mgmt-1", label: "Property Manager", value: "360 Community Management Ltd.", status: "ok" as const, confidence: "high" as const, page: 1, quote: null, reason: "" },
        { id: "mgmt-2", label: "Manager Contact", value: "(905) 604-3602", status: "ok" as const, confidence: "high" as const, page: 1, quote: null, reason: "" },
        { id: "mgmt-3", label: "Board of Directors", value: "7 directors", status: "ok" as const, confidence: "medium" as const, page: 20, quote: null, reason: "" },
        { id: "mgmt-4", label: "Total Units", value: "431 units", status: "ok" as const, confidence: "high" as const, page: 2, quote: null, reason: "" },
      ]
    },
    building_notes: {
      title: "Building-Specific Notes",
      items: [
        { id: "bn-1", label: "Kitec Plumbing", value: "Replacement substantially completed", status: "ok" as const, confidence: "high" as const, page: 18, quote: null, reason: "Positive - known issue proactively addressed" },
      ]
    }
  },
  issues: [
    {
      id: 1,
      severity: "warning" as const,
      title: "Reserve Fund Study Approaching Expiry",
      finding: "The most recent reserve fund study is dated November 27, 2018, which is 2.5 years old at the certificate date.",
      regulation: "Ontario Regulation 48/01 requires reserve fund studies to be updated every 3 years.",
      recommendation: "Confirm the next study is scheduled for November 2021 as indicated in the certificate.",
      quote: "Reserve Fund Study dated November 27, 2018",
      page: 12
    },
    {
      id: 2,
      severity: "low" as const,
      title: "Flood Deductible at Threshold",
      finding: "The flood damage deductible is $25,000, which is at the typical warning threshold.",
      regulation: "No specific regulation, but higher deductibles may result in unit owner liability.",
      recommendation: "Advise client about potential liability for flood-related claims.",
      quote: "Flood deductible: $25,000",
      page: 15
    },
    {
      id: 3,
      severity: "low" as const, 
      title: "COVID-19 Disclosure",
      finding: "Certificate includes standard COVID-19 impact disclosure regarding potential delays.",
      regulation: "Standard disclosure during pandemic period.",
      recommendation: "No action required - informational only.",
      quote: "Due to COVID-19, certain deadlines may be affected",
      page: 2
    }
  ]
};

// Components (same as report page)
const RiskBadge = ({ rating }: { rating: 'GREEN' | 'YELLOW' | 'RED' }) => {
  const config = {
    GREEN: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✓', label: 'Low Risk' },
    YELLOW: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠', label: 'Medium Risk' },
    RED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '✗', label: 'High Risk' },
  }[rating];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${config.bg} ${config.border}`}>
      <span className={`text-xl font-bold ${config.text}`}>{config.icon}</span>
      <span className={`font-semibold ${config.text}`}>{config.label}</span>
    </div>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  const config: Record<string, { icon: string; color: string; bg: string }> = {
    ok: { icon: '✓', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    warning: { icon: '!', color: 'text-amber-600', bg: 'bg-amber-100' },
    error: { icon: '✗', color: 'text-red-600', bg: 'bg-red-100' },
    missing: { icon: '?', color: 'text-gray-400', bg: 'bg-gray-100' },
  };
  const c = config[status] || config.missing;
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${c.color} ${c.bg}`}>
      {c.icon}
    </span>
  );
};

const ConfidenceBar = ({ level }: { level: string }) => {
  const width: Record<string, string> = { high: 'w-full', medium: 'w-2/3', low: 'w-1/3' };
  const color: Record<string, string> = { high: 'bg-emerald-500', medium: 'bg-amber-500', low: 'bg-red-500' };
  return (
    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden" title={`${level} confidence`}>
      <div className={`h-full ${width[level] || 'w-1/3'} ${color[level] || 'bg-gray-300'} rounded-full`} />
    </div>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    high: { bg: 'bg-red-100', text: 'text-red-800', icon: '🚨' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⚠️' },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'ℹ️' },
  };
  const c = config[severity] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '•' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>{severity.toUpperCase()}
    </span>
  );
};

const DonutChart = ({ value, max, label, color = 'emerald' }: { value: number; max: number; label: string; color?: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const colors: Record<string, { stroke: string; bg: string }> = {
    emerald: { stroke: '#10b981', bg: '#d1fae5' },
    amber: { stroke: '#f59e0b', bg: '#fef3c7' },
    red: { stroke: '#ef4444', bg: '#fee2e2' },
  };
  const c = colors[color] || colors.emerald;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={c.bg} strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={c.stroke} strokeWidth="3" strokeDasharray={`${percentage} ${100 - percentage}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="mt-2 text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
};

const CollapsibleSection = ({ title, icon, children, defaultOpen = true, itemCount, warningCount = 0 }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-gray-900">{title}</span>
          {itemCount !== undefined && <span className="text-xs text-gray-500">({itemCount} items)</span>}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
};

const ItemRow = ({ item }: { item: any }) => (
  <div className={`flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-gray-50 ${item.status === 'warning' || item.status === 'error' ? 'bg-amber-50/50' : ''}`}>
    <StatusIcon status={item.status} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{item.label}</span>
        <ConfidenceBar level={item.confidence} />
      </div>
      <div className="mt-0.5 font-medium text-gray-900 break-words">{item.value}</div>
      {item.reason && item.status !== 'ok' && (
        <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">{item.reason}</div>
      )}
    </div>
  </div>
);

const IssueCard = ({ issue }: { issue: any }) => {
  const [expanded, setExpanded] = useState(false);
  const borderColor: Record<string, string> = { high: 'border-red-200 bg-red-50', warning: 'border-amber-200 bg-amber-50', low: 'border-blue-200 bg-blue-50' };
  return (
    <div className={`border rounded-lg overflow-hidden ${borderColor[issue.severity] || ''}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left flex items-start gap-3">
        <SeverityBadge severity={issue.severity} />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{issue.title}</h4>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{issue.finding}</p>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 pt-3">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Finding</div>
            <p className="text-sm text-gray-700">{issue.finding}</p>
          </div>
          {issue.regulation && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Regulation</div>
              <p className="text-sm text-gray-700">{issue.regulation}</p>
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recommendation</div>
            <p className="text-sm text-gray-700">{issue.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
export default function DemoPage() {
  const router = useRouter();
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const letterRef = useRef<HTMLTextAreaElement>(null);

  const analysis = DEMO_ANALYSIS;
  const reservePerUnit = 7667.58;
  const sectionIcons: Record<string, string> = { common_expenses: '💰', reserve_fund: '🏦', special_assessments: '📋', legal_proceedings: '⚖️', insurance: '🛡️', management: '👥', rules: '📜', building_notes: '🏢' };
  const getSectionWarnings = (section: any) => section.items.filter((i: any) => i.status === 'warning' || i.status === 'error').length;

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const generateClientLetter = () => {
    return `Dear Client,

We have completed our review of the Status Certificate for ${analysis.corporation} located at ${analysis.address}.

SUMMARY
The certificate dated ${analysis.certificate_date} (expiring ${analysis.expiry_date}) indicates no significant concerns.

KEY FINDINGS
• Reserve Fund Study Approaching Expiry: The study is 2.5 years old - approaching 3-year limit
• Flood Deductible at Threshold: $25,000 deductible may affect liability

EXTRACTED DATA SUMMARY
• Total items reviewed: ${analysis.summary.total}
• Items verified: ${analysis.summary.verified}
• Items requiring attention: ${analysis.summary.warnings}

Please contact us if you have any questions.

Best regards,
[Your Name]`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Banner */}
      <div className="bg-blue-600 text-white text-center py-2 px-4 text-sm">
        <span className="font-medium">📋 Demo Report</span> — This is a sample analysis from a real Ontario status certificate.{' '}
        <button onClick={() => router.push('/')} className="underline hover:no-underline">
          Upload your own →
        </button>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">{analysis.corporation}</h1>
              <p className="text-sm text-gray-500">{analysis.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLetterModal(true)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              📧 Client Letter
            </button>
            <button onClick={() => router.push('/')} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Try Your Own
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Executive Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
              <p className="text-sm text-gray-500 mt-1">Certificate dated {analysis.certificate_date} • Expires {analysis.expiry_date}</p>
            </div>
            <RiskBadge rating={analysis.risk_rating} />
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{analysis.summary.total}</div>
              <div className="text-xs text-gray-500">Items Analyzed</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{analysis.summary.verified}</div>
              <div className="text-xs text-emerald-700">Verified OK</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{analysis.summary.warnings}</div>
              <div className="text-xs text-amber-700">Warnings</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-400">{analysis.summary.missing}</div>
              <div className="text-xs text-gray-500">Not Found</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Financial Overview</h3>
            <div className="flex items-center gap-6">
              <DonutChart value={reservePerUnit} max={10000} label="Reserve/Unit Health" color="emerald" />
              <div>
                <div className="text-2xl font-bold text-gray-900">${reservePerUnit.toLocaleString()}</div>
                <div className="text-sm text-gray-500">per unit</div>
                <div className="text-xs text-emerald-600 mt-1">Healthy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🚩</span>
            <h2 className="text-lg font-semibold text-gray-900">Issues Flagged ({analysis.issues.length})</h2>
          </div>
          <div className="space-y-3">
            {analysis.issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {Object.entries(analysis.sections).map(([key, section]) => (
            <CollapsibleSection
              key={key}
              title={section.title}
              icon={sectionIcons[key] || '📄'}
              itemCount={section.items.length}
              warningCount={getSectionWarnings(section)}
              defaultOpen={getSectionWarnings(section) > 0 || key === 'common_expenses'}
            >
              <div className="divide-y divide-gray-100">
                {section.items.map((item: any) => <ItemRow key={item.id} item={item} />)}
              </div>
            </CollapsibleSection>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to analyze your own certificate?</h3>
          <p className="text-gray-600 mb-4">Upload a PDF and get a detailed breakdown in under 2 minutes.</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
            Upload Your Certificate
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          Demo report • Real data from TSCC 1511 certificate
        </div>
      </div>

      {/* Letter Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLetterModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Client Letter</h3>
              <button onClick={() => setShowLetterModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <textarea ref={letterRef} defaultValue={generateClientLetter()} className="w-full h-80 p-4 border border-gray-200 rounded-lg text-sm font-mono resize-none" />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => copyToClipboard(letterRef.current?.value || '')} className={`flex-1 py-2 px-4 rounded-lg font-medium ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
