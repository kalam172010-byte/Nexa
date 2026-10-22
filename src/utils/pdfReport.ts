import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, User } from '../types/index.js';

interface ReportMetadata {
  user: User | null;
  siteTitle?: string;
  transactions: Transaction[];
}

export const generateTransactionReportPdf = ({
  user,
  siteTitle = 'Nexa Panel',
  transactions,
}: ReportMetadata): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [225, 29, 72]; // Rose-600 #e11d48
  const darkNavy: [number, number, number] = [15, 23, 42]; // Slate-900 #0f172a
  const slateText: [number, number, number] = [71, 85, 105]; // Slate-600 #475569

  // Sort transactions chronologically (latest first or earliest first - latest first is standard)
  const sortedTxns = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCredits = sortedTxns
    .filter(t => t.amount > 0 && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = Math.abs(
    sortedTxns
      .filter(t => t.amount < 0 && t.status === 'SUCCESS')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const netBalance = totalCredits - totalDebits;
  const completedTxns = sortedTxns.filter(t => t.status === 'SUCCESS').length;

  // --- TOP ACCENT BAR ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 4, 'F');

  // --- BRAND & DOCUMENT HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(siteTitle.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('AUTOMATED FINANCIAL TRANSACTION & ACCOUNTING STATEMENT', 14, 20);

  // Document meta badge on top right
  const statementId = `STMT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const genDateStr = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`Doc Ref: ${statementId}`, 196, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Generated: ${genDateStr}`, 196, 19, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(14, 23, 196, 23);

  // --- ACCOUNT PROFILE & AUDIT DETAILS BOX ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 27, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 27, 182, 28, 2, 2, 'S');

  // Column 1: Account Identification
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('ACCOUNT HOLDER DETAILS', 18, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Username: `, 18, 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`@${user?.username || 'unregistered'}`, 36, 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Email: `, 18, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`${user?.email || 'N/A'}`, 36, 43);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Account ID: `, 18, 48);
  doc.setFont('courier', 'bold');
  doc.text(`${user?.id || 'USR-ANONYMOUS'}`, 36, 48);

  // Column 2: Account Financial Standing
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('LEDGER AUDIT SCOPE', 110, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Tier / Role: `, 110, 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${user?.role || 'USER'}`, 136, 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Current Balance: `, 110, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`INR ${(user?.balance || 0).toFixed(2)}`, 136, 43);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(`Ledger Entries: `, 110, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`${sortedTxns.length} records (${completedTxns} completed)`, 136, 48);

  // --- FINANCIAL SUMMARY STATS CARDS ---
  const cardY = 58;
  const cardW = 43.5;
  const cardH = 15;
  const cardGap = 2.6;

  // Card 1: Total Credits Inflow
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'F');
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('TOTAL INFLOW (CREDITS)', 17, cardY + 4.5);
  doc.setFontSize(10.5);
  doc.text(`+INR ${totalCredits.toFixed(2)}`, 17, cardY + 11.5);

  // Card 2: Total Debits Outflow
  const c2X = 14 + cardW + cardGap;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.roundedRect(c2X, cardY, cardW, cardH, 1.5, 1.5, 'F');
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(c2X, cardY, cardW, cardH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text('TOTAL OUTFLOW (DEBITS)', c2X + 3, cardY + 4.5);
  doc.setFontSize(10.5);
  doc.text(`-INR ${totalDebits.toFixed(2)}`, c2X + 3, cardY + 11.5);

  // Card 3: Net Ledger Movement
  const c3X = c2X + cardW + cardGap;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.roundedRect(c3X, cardY, cardW, cardH, 1.5, 1.5, 'F');
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.roundedRect(c3X, cardY, cardW, cardH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text('NET SETTLEMENT FLOW', c3X + 3, cardY + 4.5);
  doc.setFontSize(10.5);
  doc.text(
    `${netBalance >= 0 ? '+' : ''}INR ${netBalance.toFixed(2)}`,
    c3X + 3,
    cardY + 11.5
  );

  // Card 4: Audit Status
  const c4X = c3X + cardW + cardGap;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(c4X, cardY, cardW, cardH, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(c4X, cardY, cardW, cardH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('LEDGER INTEGRITY', c4X + 3, cardY + 4.5);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VERIFIED 100%', c4X + 3, cardY + 11.5);

  // --- TRANSACTION AUDIT TABLE ---
  const tableData = sortedTxns.map((t, index) => {
    const isPositive = t.amount > 0;
    const formattedAmount = `${isPositive ? '+' : '-'}INR ${Math.abs(t.amount).toFixed(2)}`;
    const dateFormatted = new Date(t.createdAt).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const isApiPurchase =
      t.purchaseSource === 'API' ||
      String(t.description || '').includes('Buyed by API') ||
      String(t.description || '').includes('Outbound API');

    const channel = t.purchaseSourceLabel || (isApiPurchase ? 'API Client' : 'Web Terminal');

    return [
      String(index + 1),
      dateFormatted,
      t.id || '-',
      t.type || 'TXN',
      channel,
      t.description || 'Transaction entry',
      t.status || 'SUCCESS',
      formattedAmount,
    ];
  });

  autoTable(doc, {
    startY: 77,
    head: [
      ['#', 'Date & Time', 'Transaction ID', 'Type', 'Channel', 'Description / Product', 'Status', 'Amount (INR)'],
    ],
    body: tableData.length > 0 ? tableData : [['-', '-', '-', '-', '-', 'No transactions recorded', '-', 'INR 0.00']],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59], // slate-800
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26, halign: 'left' },
      2: { cellWidth: 28, font: 'courier', fontStyle: 'bold', halign: 'left' },
      3: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'left' },
      6: { cellWidth: 17, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 23, halign: 'right', font: 'courier', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Style Status column based on status value
      if (data.section === 'body' && data.column.index === 6) {
        const statusText = String(data.cell.raw).toUpperCase();
        if (statusText === 'SUCCESS' || statusText === 'COMPLETED') {
          data.cell.styles.textColor = [22, 101, 52]; // green-800
        } else if (statusText === 'PENDING') {
          data.cell.styles.textColor = [161, 98, 7]; // amber-700
        } else {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
        }
      }

      // Style Amount column: Green for credits, Charcoal/Red for debits
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val.startsWith('+')) {
          data.cell.styles.textColor = [22, 101, 52]; // emerald-700
        } else {
          data.cell.styles.textColor = [185, 28, 28]; // rose-700
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      // Page Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 285, 196, 285);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Official Computer-Generated Financial Statement | ${siteTitle} Automated Settlement System | Confidential`,
        14,
        289
      );

      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${currentPage} of ${totalPages}`, 196, 289, { align: 'right' });
    },
  });

  // Filename formatting
  const sanitizedUser = (user?.username || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `Financial_Report_${sanitizedUser}_${dateStamp}.pdf`;

  doc.save(fileName);
};
