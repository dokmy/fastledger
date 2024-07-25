import React, { useState } from "react";
import Spreadsheet from "react-spreadsheet";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FileData } from "@/types/fileData";

// Add this line to properly extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface IncomeStatementProps {
  files: FileData[];
}

export function IncomeStatement({ files }: IncomeStatementProps) {
  const revenues = files.filter((file) => file.type === "revenue");
  const expenses = files.filter((file) => file.type === "expense");

  const totalRevenue = revenues.reduce(
    (sum, file) => sum + parseFloat(file.amount),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, file) => sum + parseFloat(file.amount),
    0
  );
  const netProfit = totalRevenue - totalExpenses;

  const initialData = [
    [{ value: "Description" }, { value: "Amount" }],
    [{ value: "Revenues" }, { value: "" }],
    ...revenues.map((file) => [
      { value: file.description },
      { value: file.amount },
    ]),
    [{ value: "Total Revenue" }, { value: totalRevenue.toFixed(2) }],
    [{ value: "Expenses" }, { value: "" }],
    ...expenses.map((file) => [
      { value: file.description },
      { value: file.amount },
    ]),
    [{ value: "Total Expenses" }, { value: totalExpenses.toFixed(2) }],
    [{ value: "Net Profit/Loss" }, { value: netProfit.toFixed(2) }],
  ];

  const [data, setData] = useState(initialData);

  const exportToExcel = () => {
    const ws = utils.aoa_to_sheet(
      data.map((row) => row.map((cell) => cell.value))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Income Statement");
    writeFile(wb, "income_statement.xlsx");
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
    doc.save("income_statement.pdf");
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Income Statement</h2>
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
        onChange={(newData) => setData(newData as { value: string }[][])}
        className="income-statement-spreadsheet"
      />
    </div>
  );
}
