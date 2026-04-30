/**
 * Feature 1: Export / Share
 * - JSON export (instant, no deps)
 * - PDF export (jsPDF + html2canvas of the card element)
 */
import { useState, useRef } from 'react';
import { Download, FileJson, FileText, ChevronDown, Loader2 } from 'lucide-react';

export default function ExportButton({ data, repoName, cardRef }) {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportPDF = async () => {
    setPdfLoading(true);
    setOpen(false);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const el = cardRef?.current;
      if (!el) throw new Error('Card element not found');

      const canvas = await html2canvas(el, {
        backgroundColor: '#111827',
        scale: 1.5,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;

      pdf.addImage(imgData, 'PNG', (pageW - imgW) / 2, 10, imgW, imgH);
      pdf.save(`${repoName}-analysis.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={pdfLoading}
        className="btn-ghost text-sm flex items-center gap-1.5"
        title="Export analysis"
      >
        {pdfLoading
          ? <Loader2 size={14} className="animate-spin" />
          : <Download size={14} />
        }
        Export
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <FileJson size={14} className="text-green-400" />
              Export JSON
            </button>
            <button
              onClick={exportPDF}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <FileText size={14} className="text-red-400" />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
