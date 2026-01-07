'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  reportId: string;
  page: number;
  highlight: string | null;
  darkMode: boolean;
  onClose: () => void;
  onPageChange: (page: number) => void;
}

export default function PDFViewer({
  reportId,
  page,
  highlight,
  darkMode,
  onClose,
  onPageChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  // Sync with parent page
  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  // Fetch PDF URL from API
  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        const response = await fetch(`/api/reports/pdf?id=${reportId}`);
        const data = await response.json();
        
        if (data.success && data.url) {
          setPdfUrl(data.url);
        } else {
          // For demo, use a placeholder
          setError('PDF preview not available in demo mode');
        }
      } catch (err) {
        setError('Failed to load PDF');
      }
      setLoading(false);
    };

    fetchPdfUrl();
  }, [reportId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const goToPage = (newPage: number) => {
    const validPage = Math.max(1, Math.min(numPages, newPage));
    setCurrentPage(validPage);
    onPageChange(validPage);
  };

  // Highlight text function
  const highlightPattern = (text: string, pattern: string | null) => {
    if (!pattern) return text;
    const regex = new RegExp(`(${pattern})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
  };

  // Demo mode fallback
  if (error || !pdfUrl) {
    return (
      <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : ''}`}>PDF Viewer</span>
            <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>
              Page {currentPage}
            </span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700 text-gray-400' : ''}`}>
            ✕
          </button>
        </div>

        {/* Demo Content */}
        <div className={`flex-1 overflow-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <div className={`max-w-xl mx-auto p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`text-xs mb-4 pb-2 border-b ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              STATUS CERTIFICATE — PAGE {currentPage}
            </div>
            
            <div className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {currentPage === 1 && (
                <div>
                  <h2 className="font-bold mb-3">STATUS CERTIFICATE</h2>
                  <p className="mb-2">Condominium Act, 1998</p>
                  <p className="mb-4">This is to certify that the information contained in this certificate is accurate as of the date shown below.</p>
                  <p><strong>Corporation:</strong> TSCC 1234</p>
                  <p><strong>Address:</strong> 123 Main Street</p>
                  <p><strong>Unit:</strong> 507</p>
                </div>
              )}
              
              {currentPage === 3 && (
                <div>
                  <h3 className="font-bold mb-3">SECTION 4: COMMON EXPENSES</h3>
                  <p className={`mb-3 ${highlight ? 'bg-yellow-100 p-1 -mx-1 rounded' : ''}`}>
                    The monthly common expense contribution for the Unit is $485.00, payable on the first day of each month.
                  </p>
                  <p className="mb-3">
                    Common expenses include water, building insurance, and monthly reserve fund contribution.
                  </p>
                  <p>
                    No increase to common expenses is currently contemplated by the Board of Directors.
                  </p>
                </div>
              )}
              
              {currentPage === 12 && (
                <div>
                  <h3 className="font-bold mb-3">SECTION 13: RESERVE FUND</h3>
                  <p className={`mb-3 ${highlight?.includes('1,245,000') ? 'bg-yellow-100 p-1 -mx-1 rounded' : ''}`}>
                    The Reserve Fund balance as at December 31, 2024 was $1,245,000.00 as confirmed by the Corporation's audited financial statements.
                  </p>
                  <p className={`mb-3 ${highlight?.includes('2021') ? 'bg-yellow-100 p-1 -mx-1 rounded' : ''}`}>
                    Reserve Fund Study dated January 15, 2021.
                  </p>
                  <p>
                    Monthly reserve fund contribution per unit: $127.00
                  </p>
                </div>
              )}
              
              {currentPage === 15 && (
                <div>
                  <h3 className="font-bold mb-3">SECTION 16: INSURANCE</h3>
                  <p className="mb-3">
                    The Corporation maintains insurance for full replacement value of the common elements and units.
                  </p>
                  <p className={`mb-3 ${highlight?.includes('50,000') ? 'bg-yellow-100 p-1 -mx-1 rounded' : ''}`}>
                    Deductible of $50,000 for water damage and $25,000 for all other claims.
                  </p>
                  <p>
                    Current policy expires June 30, 2025.
                  </p>
                </div>
              )}
              
              {![1, 3, 12, 15].includes(currentPage) && (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <p>Page {currentPage} content</p>
                  <p className="text-xs mt-2">(Demo mode - actual PDF would display here)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
            >
              ← Prev
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= 47}
              className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
            >
              Next →
            </button>
          </div>
          <input
            type="number"
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            min={1}
            max={47}
            className={`w-16 px-2 py-1 rounded border text-sm text-center ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`}
          />
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            of 47 pages
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${darkMode ? 'text-white' : ''}`}>PDF Viewer</span>
          {numPages > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>
              Page {currentPage} of {numPages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className={`px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
          >
            −
          </button>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className={`px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
          >
            +
          </button>
          <button onClick={onClose} className={`ml-2 p-1.5 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700 text-gray-400' : ''}`}>
            ✕
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className={`flex-1 overflow-auto p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading PDF...</div>
          </div>
        ) : (
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col items-center">
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
          >
            ← Prev
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
          >
            Next →
          </button>
        </div>
        <input
          type="number"
          value={currentPage}
          onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
          min={1}
          max={numPages}
          className={`w-16 px-2 py-1 rounded border text-sm text-center ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`}
        />
      </div>
    </div>
  );
}
