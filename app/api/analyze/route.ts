import { NextRequest, NextResponse } from 'next/server';
import { analyzeStatusCertificate } from '@/lib/claude-analyzer';

export const maxDuration = 60; // Allow up to 60 seconds for analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, fileName } = body;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check for Venice API key
    if (!process.env.VENICE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API not configured. Please set VENICE_API_KEY.' },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(file, 'base64');

    // Extract text from PDF
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.length < 100) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from PDF. The file may be scanned or image-based.' },
        { status: 400 }
      );
    }

    // Analyze with Claude via Venice
    const analysis = await analyzeStatusCertificate(extractedText);

    // Generate a simple report ID (no database, just for URL)
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      reportId,
      analysis,
      fileName,
      extractedTextLength: extractedText.length,
      pageCount: pdfData.numpages,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide helpful error messages
    if (message.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'API configuration error. Please check VENICE_API_KEY.' },
        { status: 500 }
      );
    }
    
    if (message.includes('rate limit')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
