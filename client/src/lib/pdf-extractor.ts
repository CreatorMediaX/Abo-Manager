import { createWorker } from 'tesseract.js';

export interface PDFTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
  raw: string;
}

// Client-side OCR for scanned PDFs
export async function extractTextFromImage(imageData: string): Promise<string> {
  const worker = await createWorker('deu+eng'); // German + English
  
  try {
    const { data: { text } } = await worker.recognize(imageData);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Parse PDF on server via API
export async function parsePDFFile(file: File): Promise<{
  transactions: PDFTransaction[];
  isScanned: boolean;
  rawText: string;
  numPages: number;
}> {
  const formData = new FormData();
  formData.append('pdf', file);
  
  const response = await fetch('/api/import/parse-pdf', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse PDF');
  }
  
  return response.json();
}

// Perform OCR on scanned PDF
export async function performOCROnPDF(file: File, onProgress?: (progress: number) => void): Promise<string> {
  // For now, we'll use the server-side approach
  // Client-side OCR would require converting PDF pages to images first
  const formData = new FormData();
  formData.append('pdf', file);
  
  const response = await fetch('/api/import/ocr-pdf', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'OCR failed');
  }
  
  const data = await response.json();
  return data.text;
}
