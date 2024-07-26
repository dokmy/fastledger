import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Tooltip } from "react-tooltip";
import Modal from "react-modal";
import { FileData } from "@/types/fileData";
import { FaMagic, FaTimes } from "react-icons/fa";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-hot-toast";
import { format, parse, isValid } from "date-fns";

const columnHelper = createColumnHelper<FileData>();

interface UploadedFilesTableProps {
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
}

const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsedDate = parse(dateString, "yyyy-MM-dd", new Date());
  return isValid(parsedDate) ? parsedDate : null;
};

const formatDate = (date: Date | null): string => {
  return date ? format(date, "yyyy-MM-dd") : "";
};

export function UploadedFilesTable({
  files,
  setFiles,
}: UploadedFilesTableProps) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [loadingRows, setLoadingRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const queueRef = useRef<number[]>([]);
  const processingRef = useRef<Set<number>>(new Set());
  const MAX_CONCURRENT_PROCESSES = 5;

  const truncateFileName = (fileName: string, maxLength: number = 20) => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + "...";
  };

  const formatUploadDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  };

  const addToQueue = (rowIndex: number) => {
    if (
      !queueRef.current.includes(rowIndex) &&
      !processingRef.current.has(rowIndex)
    ) {
      queueRef.current.push(rowIndex);
      if (processingRef.current.size >= MAX_CONCURRENT_PROCESSES) {
        toast(
          `We're currently processing ${MAX_CONCURRENT_PROCESSES} items. Your request has been added to the queue. Please wait.`,
          {
            icon: "🔔",
            duration: 4000,
          }
        );
      } else {
        processQueue();
      }
    }
  };

  const processReceiptAnalysis = async (rowIndex: number) => {
    const s3Url = files[rowIndex].s3Url;
    setLoadingRows((prev) => ({ ...prev, [rowIndex]: true }));

    try {
      const img = new Image();
      img.src = s3Url;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const imageDimensions = { width: img.width, height: img.height };

      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3Url, imageDimensions }),
      });
      const result = await response.json();

      if (response.ok && result.data) {
        setFiles((prevFiles) => {
          const newFiles = [...prevFiles];
          newFiles[rowIndex] = {
            ...newFiles[rowIndex],
            date: result.data.date,
            description: result.data.description,
            invoiceNumber: result.data.invoiceNumber,
            amount: result.data.amount.replace("$", ""),
          };
          return newFiles;
        });
        toast("Receipt analyzed successfully!", {
          icon: "✅",
          duration: 3000,
        });
      } else {
        console.error("Error analyzing receipt:", result.error);
        toast(result.error || "Error analyzing receipt", {
          icon: "❌",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error calling analyze-receipt API:", error);
      toast("Error analyzing receipt", {
        icon: "❌",
        duration: 3000,
      });
    } finally {
      setLoadingRows((prev) => ({ ...prev, [rowIndex]: false }));
      processingRef.current.delete(rowIndex);
      processQueue(); // Try to process next item in queue
    }
  };

  const processQueue = useCallback(() => {
    while (
      queueRef.current.length > 0 &&
      processingRef.current.size < MAX_CONCURRENT_PROCESSES
    ) {
      const rowIndex = queueRef.current.shift()!;
      processingRef.current.add(rowIndex);
      processReceiptAnalysis(rowIndex);
    }
  }, [files]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  const handleAIClick = (rowIndex: number) => {
    addToQueue(rowIndex);
  };

  const handleRemoveRow = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    toast.success("Row removed successfully");
  };

  const columns = [
    columnHelper.accessor("s3Url", {
      id: "image",
      header: "Image",
      cell: (info) => (
        <div className="w-16 h-16">
          <img
            src={info.getValue()}
            alt={info.row.original.fileName}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => {
              setSelectedImage(info.getValue());
              setModalIsOpen(true);
            }}
            data-tooltip-id={`tooltip-${info.row.id}`}
          />
          <Tooltip id={`tooltip-${info.row.id}`} place="top">
            <img
              src={info.getValue()}
              alt={info.row.original.fileName}
              className="max-w-xs max-h-xs"
            />
          </Tooltip>
        </div>
      ),
    }),
    columnHelper.accessor("fileName", {
      header: "File Name",
      cell: (info) => (
        <div className="text-sm whitespace-normal">
          {truncateFileName(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("uploadedAt", {
      header: "Uploaded At",
      cell: (info) => (
        <div className="text-sm whitespace-normal">
          {formatUploadDate(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => (
        <div
          className={`text-sm font-semibold px-2 py-1 rounded-full ${
            info.getValue() === "revenue"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {info.getValue() === "revenue" ? "Revenue" : "Expense"}
        </div>
      ),
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) => {
        const value = info.getValue();
        return (
          <DatePicker
            selected={parseDate(value)}
            onChange={(date: Date | null) => {
              const newFiles = [...files];
              newFiles[info.row.index] = {
                ...newFiles[info.row.index],
                date: date ? format(date, "yyyy-MM-dd") : "",
              };
              setFiles(newFiles);
            }}
            dateFormat="yyyy-MM-dd"
            className="text-sm w-full"
          />
        );
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <textarea
          value={info.getValue()}
          onChange={(e) => {
            const newFiles = [...files];
            newFiles[info.row.index].description = e.target.value;
            setFiles(newFiles);
          }}
          className="w-full p-1 border rounded text-xs min-h-[60px] resize-vertical"
        />
      ),
    }),
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
      cell: (info) => (
        <input
          value={info.getValue()}
          onChange={(e) => {
            const newFiles = [...files];
            newFiles[info.row.index].invoiceNumber = e.target.value;
            setFiles(newFiles);
          }}
          className="w-full p-1 border rounded text-sm"
        />
      ),
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => (
        <input
          value={info.getValue()}
          onChange={(e) => {
            const newFiles = [...files];
            newFiles[info.row.index].amount = e.target.value;
            setFiles(newFiles);
          }}
          className="w-full p-1 border rounded text-sm"
        />
      ),
    }),
    columnHelper.accessor("s3Url", {
      id: "aiButton",
      header: "AI",
      cell: (info) => (
        <button
          className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center"
          onClick={() => handleAIClick(info.row.index)}
          disabled={
            loadingRows[info.row.index] ||
            queueRef.current.includes(info.row.index) ||
            processingRef.current.has(info.row.index)
          }
        >
          {loadingRows[info.row.index] ? (
            <Spinner className="mr-1" />
          ) : (
            <FaMagic className="mr-1" />
          )}
          AI
        </button>
      ),
    }),
    columnHelper.accessor("s3Url", {
      id: "removeButton",
      header: "",
      cell: (info) => (
        <button
          className="text-red-500 hover:text-red-700"
          onClick={() => handleRemoveRow(info.row.index)}
        >
          <FaTimes />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-2 whitespace-normal">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Image Modal"
      >
        <img
          src={selectedImage}
          alt="Full size"
          className="max-w-full max-h-full"
        />
      </Modal>
    </div>
  );
}
