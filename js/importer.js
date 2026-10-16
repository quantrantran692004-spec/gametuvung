// Parser for TXT, CSV, and Excel (via SheetJS)
export class FileImporter {
  static parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const results = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if contains 'english' or 'tiếng anh'
      if (i === 0 && (line.toLowerCase().includes('english') || line.toLowerCase().includes('từ'))) {
        continue;
      }
      
      // Split by comma or semicolon or tab
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        results.push({
          english: parts[0],
          vietnamese: parts[1],
          ipa: parts[2] || '',
          unit: parts[3] || 'Imported'
        });
      }
    }
    return results;
  }

  static parseTXT(text) {
    // Supports formats like:
    // english - vietnamese
    // english : vietnamese
    // english = vietnamese
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const results = [];

    for (const line of lines) {
      const match = line.match(/^(.+?)\s*[-:=–—]\s*(.+)$/);
      if (match) {
        results.push({
          english: match[1].trim(),
          vietnamese: match[2].trim(),
          ipa: '',
          unit: 'TXT-Import'
        });
      } else {
        // Fallback split by tab or multiple spaces
        const parts = line.split(/\t|\s{2,}/);
        if (parts.length >= 2) {
          results.push({
            english: parts[0].trim(),
            vietnamese: parts[1].trim(),
            ipa: '',
            unit: 'TXT-Import'
          });
        }
      }
    }
    return results;
  }

  static parseExcel(data) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Thư viện XLSX chưa sẵn sàng!');
    }
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const results = [];
    for (let i = 0; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length < 2) continue;
      
      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      
      if (i === 0 && (col0.toLowerCase().includes('english') || col0.toLowerCase().includes('từ'))) {
        continue;
      }

      if (col0 && col1) {
        results.push({
          english: col0,
          vietnamese: col1,
          ipa: String(row[2] || '').trim(),
          unit: String(row[3] || 'Excel-Import').trim()
        });
      }
    }
    return results;
  }
}
