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
  
  // Common date patterns (German format DD.MM.YYYY)
  const datePatterns = [
    /\b(\d{1,2})[.\s]+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})\b/gi,
    /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/g,  // DD.MM.YYYY, DD/MM/YYYY
    /\b(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/g,     // YYYY-MM-DD
  ];
  
  // Amount patterns (EUR with German formatting: 1.234,56 or 22,50)
  const amountPatterns = [
    /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)/gi,  // German: 1.234,56 EUR
    /(?:EUR|€)\s*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,  // EUR 1.234,56
    /(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:USD|\$)/gi,  // US: 1,234.56 USD
    /(?:USD|\$)\s*(\d{1,3}(?:,\d{3})*\.\d{2})/gi,
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
        // Extract just the number part
        let amountStr = match[1] || match[0];
        // Convert German format (1.234,56) to standard (1234.56)
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
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
    
    // Extract description (look for merchant name)
    let description = line;
    
    // Remove date
    description = description.replace(/\b\d{1,2}[.\s]+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}\b/gi, '');
    description = description.replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, '');
    description = description.replace(/\b\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}\b/g, '');
    
    // Remove amount
    description = description.replace(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g, '');
    description = description.replace(/EUR|€|USD|\$|GBP|£|CHF/gi, '');
    
    description = description.trim();
    
    if (!description) {
      // Try to find merchant name in surrounding lines
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // Look for common merchant indicators
      if (prevLine.match(/\b(invoice|rechnung|bill|from|von)\b/i)) {
        description = prevLine.replace(/\b(invoice|rechnung|bill|from|von)\b/gi, '').trim();
      } else if (nextLine.match(/\b(total|gesamt|summe)\b/i)) {
        description = prevLine.trim();
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
  const monthNames: Record<string, string> = {
    'januar': '01', 'februar': '02', 'märz': '03', 'april': '04',
    'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
  };
  
  // Try German date format: 19. Dezember 2025
  const germanMatch = dateStr.match(/(\d{1,2})[.\s]+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})/i);
  if (germanMatch) {
    const day = germanMatch[1].padStart(2, '0');
    const month = monthNames[germanMatch[2].toLowerCase()];
    const year = germanMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try different numeric formats
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

// Parse PDF buffer - FIXED to use correct pdf-parse API
export async function parsePDFBuffer(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  try {
    // Dynamically import pdf-parse - it exports PDFParse as a named export
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;
    
    // PDFParse is a function that takes the buffer
    const data = await PDFParse(buffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
    };
  } catch (error: any) {
    console.error('[DEV] PDF parsing error details:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

// Detect if PDF is scanned (image-based)
export function isScannedPDF(text: string, numPages: number): boolean {
  // If very little text extracted relative to number of pages, likely scanned
  const avgCharsPerPage = text.length / numPages;
  return avgCharsPerPage < 100; // Less than 100 chars per page = likely scanned
}
