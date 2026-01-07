'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

// Types
interface ExtractedItem {
  id: string;
  key?: string;
  label: string;
  value: string;
  page: number | null;
  status: 'ok' | 'warning' | 'error' | 'missing';
  confidence: 'high' | 'medium' | 'low';
  quote: string | null;
  reason: string;
}

interface Section {
  title: string;
  items: ExtractedItem[];
}

interface Issue {
  id: number;
  severity: 'high' | 'warning' | 'low';
  title: string;
  page: number;
  finding: string;
  regulation: string;
  recommendation: string;
  quote: string;
}

interface Analysis {
  summary: { verified: number; warnings: number; missing: number; total: number };
  sections: Record<string, Section>;
  issues: Issue[];
  corporation: string;
  address: string;
  certificate_date: string;
  expiry_date: string;
  risk_rating: 'GREEN' | 'YELLOW' | 'RED';
  page_count: number;
}

// Components
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
  const config = {
    ok: { icon: '✓', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    warning: { icon: '!', color: 'text-amber-600', bg: 'bg-amber-100' },
    error: { icon: '✗', color: 'text-red-600', bg: 'bg-red-100' },
    missing: { icon: '?', color: 'text-gray-400', bg: 'bg-gray-100' },
  }[status] || { icon: '?', color: 'text-gray-400', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${config.color} ${config.bg}`}>
      {config.icon}
    </span>
  );
};

const ConfidenceBar = ({ level }: { level: string }) => {
  const width = { high: 'w-full', medium: 'w-2/3', low: 'w-1/3' }[level] || 'w-1/3';
  const color = { high: 'bg-emerald-500', medium: 'bg-amber-500', low: 'bg-red-500' }[level] || 'bg-gray-300';
  return (
    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden" title={`${level} confidence`}>
      <div className={`h-full ${width} ${color} rounded-full`} />
    </div>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config = {
    high: { bg: 'bg-red-100', text: 'text-red-800', icon: '🚨' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⚠️' },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'ℹ️' },
  }[severity] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '•' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>{severity.toUpperCase()}
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

const ItemRow = ({ item, onViewPDF }: { item: ExtractedItem; onViewPDF: (page: number | null, quote: string | null) => void }) => (
  <div className={`group flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-gray-50 ${item.status === 'warning' || item.status === 'error' ? 'bg-amber-50/50' : ''}`}>
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
    {item.page && (
      <button
        onClick={() => onViewPDF(item.page, item.quote)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-opacity"
        title="View in PDF"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    )}
  </div>
);

const IssueCard = ({ issue, onViewPDF }: { issue: Issue; onViewPDF: (page: number, quote: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const borderColor = { high: 'border-red-200 bg-red-50', warning: 'border-amber-200 bg-amber-50', low: 'border-blue-200 bg-blue-50' }[issue.severity] || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${borderColor}`}>
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
          {issue.quote && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source</div>
              <blockquote className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">&ldquo;{issue.quote}&rdquo;</blockquote>
            </div>
          )}
          <button onClick={() => onViewPDF(issue.page, issue.quote)} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View on Page {issue.page}
          </button>
        </div>
      )}
    </div>
  );
};

const generateClientLetter = (analysis: Analysis) => {
  const riskText = { GREEN: 'no significant concerns', YELLOW: 'some items requiring attention', RED: 'serious concerns that require immediate attention' }[analysis.risk_rating];
  const issues = analysis.issues.filter(i => i.severity === 'high' || i.severity === 'warning').map(i => `• ${i.title}: ${i.finding}`).join('\n');
  return `Dear Client,

We have completed our review of the Status Certificate for ${analysis.corporation} located at ${analysis.address}.

SUMMARY
The certificate dated ${analysis.certificate_date} (expiring ${analysis.expiry_date}) indicates ${riskText}.

KEY FINDINGS
${issues || '• No significant issues identified'}

EXTRACTED DATA SUMMARY
• Total items reviewed: ${analysis.summary.total}
• Items verified: ${analysis.summary.verified}
• Items requiring attention: ${analysis.summary.warnings}
• Information not found: ${analysis.summary.missing}

Please contact us if you have any questions about these findings.

Best regards,
[Your Name]`;
};

// Main Component
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showPDF, setShowPDF] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfHighlight, setPdfHighlight] = useState<string | null>(null);
  
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const letterRef = useRef<HTMLTextAreaElement>(null);

  // Load from sessionStorage
  useEffect(() => {
    const cached = sessionStorage.getItem('currentAnalysis');
    const cachedFile = sessionStorage.getItem('currentFile');
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setAnalysis(data.analysis);
        setFileName(cachedFile || 'Certificate.pdf');
      } catch {
        setError('Failed to load report data');
      }
    } else {
      setError('No report found. Please upload a certificate first.');
    }
    setLoading(false);
  }, []);

  const viewPDF = useCallback((page: number | null, highlight?: string | null) => {
    if (page) {
      setPdfPage(page);
      setPdfHighlight(highlight || null);
      setShowPDF(true);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gray-600">Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            ← Upload a Certificate
          </button>
        </div>
      </div>
    );
  }

  const reserveSection = analysis.sections.reserve_fund;
  const reservePerUnit = parseFloat(reserveSection?.items.find(i => i.key === 'reserve_per_unit')?.value.replace(/[^0-9.]/g, '') || '0');
  const getSectionWarnings = (section: Section) => section.items.filter(i => i.status === 'warning' || i.status === 'error').length;
  const sectionIcons: Record<string, string> = { common_expenses: '💰', reserve_fund: '🏦', special_assessments: '📋', legal_proceedings: '⚖️', insurance: '🛡️', management: '👥', rules: '📜', building_notes: '🏢' };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 print:static">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700 print:hidden">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">{analysis.corporation}</h1>
              <p className="text-sm text-gray-500">{analysis.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setShowPDF(!showPDF)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${showPDF ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {showPDF ? 'Hide PDF' : 'Show PDF'}
            </button>
            <button onClick={() => setShowLetterModal(true)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              📧 Client Letter
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              🖨️ Print
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-64px)] print:h-auto print:block">
        {/* Left Panel - Analysis */}
        <div className={`${showPDF ? 'w-1/2' : 'w-full'} overflow-auto print:w-full`}>
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            
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

              {reservePerUnit > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Financial Overview</h3>
                  <div className="flex items-center gap-6">
                    <DonutChart value={reservePerUnit} max={10000} label="Reserve/Unit Health" color={reservePerUnit > 5000 ? 'emerald' : reservePerUnit > 2000 ? 'amber' : 'red'} />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">${reservePerUnit.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">per unit</div>
                      <div className={`text-xs mt-1 ${reservePerUnit > 5000 ? 'text-emerald-600' : reservePerUnit > 2000 ? 'text-amber-600' : 'text-red-600'}`}>
                        {reservePerUnit > 5000 ? 'Healthy' : reservePerUnit > 2000 ? 'Adequate' : 'Low'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🚩</span>
                  <h2 className="text-lg font-semibold text-gray-900">Issues Flagged ({analysis.issues.length})</h2>
                </div>
                <div className="space-y-3">
                  {analysis.issues.map(issue => <IssueCard key={issue.id} issue={issue} onViewPDF={viewPDF} />)}
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-4">
              {Object.entries(analysis.sections).map(([key, section]) => (
                <CollapsibleSection
                  key={key}
                  title={section.title}
                  icon={sectionIcons[key] || '📄'}
                  itemCount={section.items.length}
                  warningCount={getSectionWarnings(section)}
                  defaultOpen={getSectionWarnings(section) > 0}
                >
                  <div className="divide-y divide-gray-100">
                    {section.items.map(item => <ItemRow key={item.id} item={item} onViewPDF={viewPDF} />)}
                  </div>
                </CollapsibleSection>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 py-8">
              Generated by CertAnalyzer • {new Date().toLocaleDateString()}
              <br />
              <span className="text-gray-300">This tool assists with information extraction only. Always verify against the source document.</span>
            </div>
          </div>
        </div>

        {/* Right Panel - PDF Viewer */}
        {showPDF && (
          <div className="w-1/2 border-l border-gray-200 print:hidden">
            <PDFViewer
              reportId={reportId}
              page={pdfPage}
              highlight={pdfHighlight}
              darkMode={false}
              onClose={() => setShowPDF(false)}
              onPageChange={setPdfPage}
            />
          </div>
        )}
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
              <textarea ref={letterRef} defaultValue={generateClientLetter(analysis)} className="w-full h-80 p-4 border border-gray-200 rounded-lg text-sm font-mono resize-none" />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => copyToClipboard(letterRef.current?.value || '')} className={`flex-1 py-2 px-4 rounded-lg font-medium ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
              </button>
              <button onClick={() => {
                const blob = new Blob([letterRef.current?.value || ''], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `client-letter-${analysis.corporation}.txt`;
                a.click();
              }} className="flex-1 py-2 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700">
                💾 Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:h-auto { height: auto !important; }
          .print\\:block { display: block !important; }
          .print\\:bg-white { background-color: white !important; }
        }
      `}</style>
    </div>
  );
}
