// Use dynamic import for pdf-parse due to ESM/CJS compatibility
let pdfParse: any;
(async () => {
  pdfParse = (await import('pdf-parse')).default;
})();

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
  raw: string;
}

// Extract transactions from PDF text
export function extractTransactionsFromPDFText(text: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Common date patterns
  const datePatterns = [
    /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/g,  // DD.MM.YYYY, DD/MM/YYYY
    /\b(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/g,     // YYYY-MM-DD
  ];
  
  // Amount patterns (EUR, USD, GBP with various formats)
  const amountPatterns = [
    /(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:EUR|€)/gi,
    /(?:EUR|€)\s*(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
    /(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:USD|\$)/gi,
    /(?:USD|\$)\s*(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
    /(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:GBP|£)/gi,
    /(?:GBP|£)\s*(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
  ];
  
  // Try to detect table-like structures
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for date in line
    let foundDate = '';
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        foundDate = normalizeDate(match[0]);
        break;
      }
    }
    
    if (!foundDate) continue;
    
    // Look for amount in line
    let foundAmount = 0;
    let foundCurrency = 'EUR';
    
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amountStr = match[0].replace(/[^\d.,-]/g, '').replace(',', '.');
        foundAmount = parseFloat(amountStr);
        
        // Detect currency
        if (line.includes('USD') || line.includes('$')) foundCurrency = 'USD';
        else if (line.includes('GBP') || line.includes('£')) foundCurrency = 'GBP';
        else if (line.includes('CHF')) foundCurrency = 'CHF';
        else foundCurrency = 'EUR';
        
        break;
      }
    }
    
    if (!foundAmount || isNaN(foundAmount)) continue;
    
    // Extract description (everything between date and amount)
    let description = line;
    
    // Remove date
    description = description.replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, '');
    description = description.replace(/\b\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}\b/g, '');
    
    // Remove amount
    description = description.replace(/[-]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g, '');
    description = description.replace(/EUR|€|USD|\$|GBP|£|CHF/gi, '');
    
    description = description.trim();
    
    if (!description) {
      // Try to get description from next line
      if (i + 1 < lines.length) {
        description = lines[i + 1];
      }
    }
    
    if (description.length > 2) {
      transactions.push({
        date: foundDate,
        description,
        amount: foundAmount,
        currency: foundCurrency,
        raw: line,
      });
    }
  }
  
  return transactions;
}

// Normalize date to YYYY-MM-DD
function normalizeDate(dateStr: string): string {
  // Try different formats
  const patterns = [
    { regex: /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/, format: 'DD.MM.YYYY' },
    { regex: /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})$/, format: 'DD.MM.YY' },
    { regex: /^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/, format: 'YYYY-MM-DD' },
  ];
  
  for (const { regex, format } of patterns) {
    const match = dateStr.match(regex);
    if (match) {
      if (format === 'YYYY-MM-DD') {
        const [_, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === 'DD.MM.YYYY') {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === 'DD.MM.YY') {
        const [_, day, month, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return dateStr;
}

// Parse PDF buffer
export async function parsePDFBuffer(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  try {
    // Dynamically import pdf-parse to handle ESM/CJS compatibility
    const pdfParseModule = await import('pdf-parse');
    const parse = pdfParseModule.default || pdfParseModule;
    
    const data = await parse(buffer);
    return {
      text: data.text,
      numPages: data.numpages,
    };
  } catch (error: any) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

// Detect if PDF is scanned (image-based)
export function isScannedPDF(text: string, numPages: number): boolean {
  // If very little text extracted relative to number of pages, likely scanned
  const avgCharsPerPage = text.length / numPages;
  return avgCharsPerPage < 100; // Less than 100 chars per page = likely scanned
}
