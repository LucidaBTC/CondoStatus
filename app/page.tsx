'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File too large (max 20MB)');
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    
    setAnalyzing(true);
    setProgress(10);
    setError(null);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(30);

      // Send to analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file: base64, 
          fileName: file.name 
        }),
      });

      setProgress(70);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setProgress(100);

      // Store in sessionStorage for report page
      sessionStorage.setItem('currentAnalysis', JSON.stringify(data));
      sessionStorage.setItem('currentFile', file.name);

      // Navigate to report
      router.push(`/report/${data.reportId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CA</span>
            </div>
            <span className="font-semibold text-gray-900">CertAnalyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/demo"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Demo Report
            </a>
            <a 
              href="#how-it-works"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              How it works →
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Review Status Certificates
            <br />
            <span className="text-blue-600">in Minutes, Not Hours</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            AI-powered extraction and analysis of Ontario condo status certificates. 
            Upload a PDF, get a detailed breakdown in under 2 minutes.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
          {!analyzing ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : file 
                      ? 'border-emerald-300 bg-emerald-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {file ? (
                  <div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">
                      Drop your status certificate here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to browse (PDF only, max 20MB)
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!file}
                className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-colors ${
                  file
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Analyze Certificate
              </button>
              
              {/* Demo Link */}
              <div className="mt-4 text-center">
                <a href="/demo" className="text-sm text-blue-600 hover:text-blue-700">
                  See an example report first →
                </a>
              </div>
            </>
          ) : (
            /* Progress State */
            <div className="py-8 text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Analyzing Certificate...
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {progress < 30 && 'Reading document...'}
                {progress >= 30 && progress < 70 && 'Extracting data with AI...'}
                {progress >= 70 && 'Generating report...'}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 mt-12" id="how-it-works">
          {[
            { icon: '⚡', title: 'Fast', desc: 'Results in under 2 minutes' },
            { icon: '🎯', title: 'Accurate', desc: 'AI extracts 28+ key data points' },
            { icon: '🛡️', title: 'Secure', desc: 'Documents not stored' },
          ].map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-medium text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* What You Get */}
        <div className="mt-16 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">What you get:</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Common expenses & arrears</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Reserve fund balance & health</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Special assessments</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Insurance deductibles</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Legal proceedings</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Risk assessment (RED/YELLOW/GREEN)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Side-by-side PDF viewer</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Client letter generator</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 mt-12">
          This tool assists with information extraction only. It does not constitute legal advice. 
          Always verify extracted data against the source document.
        </p>
      </main>
    </div>
  );
}
