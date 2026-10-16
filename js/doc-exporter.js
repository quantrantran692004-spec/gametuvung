// Word (.docx) and Excel/JSON/CSV Document Exporter using docx.js and Blob
export class DocExporter {
  static exportJSON(vocabList, filename = 'word_shooter_backup.json') {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vocabList, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", filename);
    dlAnchorElem.click();
  }

  static exportCSV(vocabList, filename = 'vocabulary.csv') {
    let csv = "English,Vietnamese,IPA,Unit,Mastery\n";
    vocabList.forEach(w => {
      const en = `"${(w.english || '').replace(/"/g, '""')}"`;
      const vi = `"${(w.vietnamese || '').replace(/"/g, '""')}"`;
      const ipa = `"${(w.ipa || '').replace(/"/g, '""')}"`;
      const unit = `"${(w.unit || '').replace(/"/g, '""')}"`;
      csv += `${en},${vi},${ipa},${unit},${w.masteryLevel || 0}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  }

  static async exportWord(vocabList, title = "TÀI LIỆU ÔN TẬP TỪ VỰNG - WORD SHOOTER") {
    if (typeof docx === 'undefined') {
      throw new Error('Thư viện docx.js chưa được tải!');
    }

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType, BorderStyle } = docx;

    // Header cells
    const tableHeader = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 800, type: WidthType.DXA },
          children: [new Paragraph({ text: "STT", alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          children: [new Paragraph({ text: "Từ Tiếng Anh", alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 2400, type: WidthType.DXA },
          children: [new Paragraph({ text: "Phiên Âm IPA", alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          children: [new Paragraph({ text: "Nghĩa Tiếng Việt", alignment: AlignmentType.CENTER })],
        }),
      ],
    });

    // Content rows
    const rows = [tableHeader];
    vocabList.forEach((word, idx) => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: word.english, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ text: word.ipa || "-" })],
            }),
            new TableCell({
              children: [new Paragraph({ text: word.vietnamese })],
            }),
          ],
        })
      );
    });

    const table = new Table({
      rows: rows,
      width: { size: 9600, type: WidthType.DXA },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: `Tạo ngày: ${new Date().toLocaleDateString('vi-VN')} | Tổng số từ: ${vocabList.length}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          table,
          new Paragraph({
            text: "\nChúc bạn học tập hiệu quả cùng WORD SHOOTER!",
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 }
          })
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Tai_Lieu_Tu_Vung_${Date.now()}.docx`;
    link.click();
  }
}
