import React, { useState } from "react";
import Spreadsheet from "react-spreadsheet";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FileData } from "@/types/fileData";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface GeneralLedgerProps {
  files: FileData[];
}

export function GeneralLedger({ files }: GeneralLedgerProps) {
  const calculateRunningBalance = (
    data: { value: string }[][]
  ): { value: string }[][] => {
    let balance = 0;
    return data.map((row, index) => {
      if (index === 0) return [...row, { value: "Running Balance (HKD)" }];
      if (index === 1) return [...row, { value: "HK$0.00" }];

      const debit = parseFloat(row[4].value) || 0;
      const credit = parseFloat(row[5].value) || 0;
      balance += debit - credit;

      return [...row, { value: `HK$${balance.toFixed(2)}` }];
    });
  };

  const initialData = calculateRunningBalance(
    [
      [
        { value: "Date" },
        { value: "Num" },
        { value: "Description" },
        { value: "Account" },
        { value: "Debit (HKD)" },
        { value: "Credit (HKD)" },
      ],
      [
        { value: "Assets:Current Assets:Checking Account: Balance b/f" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
      ],
      ...files.map((file) => [
        { value: file.date },
        { value: file.invoiceNumber },
        { value: file.description },
        { value: "Assets:Current Assets:Checking Account" },
        { value: file.type === "revenue" ? file.amount : "" },
        { value: file.type === "expense" ? file.amount : "" },
      ]),
      [
        { value: "Total For Assets:Current Assets:Checking Account" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
      ],
    ].sort(
      (a, b) => new Date(a[0].value).getTime() - new Date(b[0].value).getTime()
    )
  );

  const [data, setData] = useState(initialData);

  const exportToExcel = () => {
    const ws = utils.aoa_to_sheet(
      data.map((row) => row.map((cell) => cell.value))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "General Ledger");
    writeFile(wb, "general_ledger.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.autoTable({
      head: [data[0].map((cell) => cell.value)],
      body: data.slice(1).map((row) => row.map((cell) => cell.value)),
      styles: { fontSize: 8 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold",
      },
    });
    doc.save("general_ledger.pdf");
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">General Ledger</h2>
      <div className="mb-4">
        <button
          onClick={exportToExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Export to Excel
        </button>
        <button
          onClick={exportToPDF}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Export to PDF
        </button>
      </div>
      <Spreadsheet
        data={data}
        onChange={(newData) =>
          setData(calculateRunningBalance(newData as { value: string }[][]))
        }
        className="general-ledger-spreadsheet"
      />
    </div>
  );
}
