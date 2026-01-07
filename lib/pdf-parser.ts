import pdf from 'pdf-parse';

export interface PDFParseResult {
  text: string;
  pageCount: number;
  pages: string[];
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
  };
}

/**
 * Parse a PDF file and extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdf(buffer, {
      // Custom page renderer to get page-by-page text
      pagerender: renderPage,
    });

    // Split text by page markers we add during rendering
    const pages = data.text
      .split('---PAGE_BREAK---')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    return {
      text: data.text.replace(/---PAGE_BREAK---/g, '\n\n'),
      pageCount: data.numpages,
      pages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
      },
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error}`);
  }
}

/**
 * Custom page renderer that preserves page boundaries
 */
function renderPage(pageData: any): Promise<string> {
  return pageData.getTextContent().then((textContent: any) => {
    let lastY: number | null = null;
    let text = '';

    for (const item of textContent.items) {
      if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
        text += '\n';
      }
      text += item.str;
      lastY = item.transform[5];
    }

    return text + '\n---PAGE_BREAK---';
  });
}

/**
 * Find which page contains a specific quote
 */
export function findPageForQuote(pages: string[], quote: string): number | null {
  if (!quote) return null;
  
  const normalizedQuote = quote.toLowerCase().trim();
  
  for (let i = 0; i < pages.length; i++) {
    const normalizedPage = pages[i].toLowerCase();
    if (normalizedPage.includes(normalizedQuote)) {
      return i + 1; // 1-indexed pages
    }
  }
  
  // Try partial matching if exact match fails
  const words = normalizedQuote.split(' ').filter(w => w.length > 4);
  if (words.length >= 3) {
    for (let i = 0; i < pages.length; i++) {
      const normalizedPage = pages[i].toLowerCase();
      const matchCount = words.filter(w => normalizedPage.includes(w)).length;
      if (matchCount >= words.length * 0.7) {
        return i + 1;
      }
    }
  }
  
  return null;
}

/**
 * Extract text around a specific position for context
 */
export function extractContext(text: string, searchTerm: string, contextLength: number = 200): string | null {
  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  
  const index = lowerText.indexOf(lowerSearch);
  if (index === -1) return null;
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);
  
  let context = text.substring(start, end);
  
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}
