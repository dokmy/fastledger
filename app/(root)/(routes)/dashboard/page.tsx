"use client";
import React, { useState } from "react";
import { FileDropzone } from "@/app/components/FileDropzone";
import { UploadedFilesTable } from "@/app/components/UploadedFilesTable";
import { Statements } from "@/app/components/Statements";
import { Progress } from "@/components/ui/progress";
import { FileData } from "@/types/fileData";
import toast from "react-hot-toast"; // Import toast

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};

export default function DashboardPage() {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showStatements, setShowStatements] = useState(false);
  const [statementsKey, setStatementsKey] = useState(0);

  const onFileDrop = async (
    acceptedFiles: File[],
    type: "revenue" | "expense"
  ) => {
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append("file", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newFiles = data.files.map(
          (fileData: { fileName: string; s3Url: string }) => ({
            fileName: fileData.fileName,
            s3Url: fileData.s3Url,
            type,
            uploadedAt: new Date().toISOString(),
            date: "",
            description: "",
            invoiceNumber: "",
            amount: "",
            deposit: "",
            withdrawal: "",
          })
        );
        setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully!`);
      } else {
        console.error("Upload failed");
        toast.error(`Failed to upload ${acceptedFiles.length} file(s)`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error(`Error uploading ${acceptedFiles.length} file(s)`);
    }

    setUploadProgress(0);
  };

  const handleGenerateStatements = () => {
    setShowStatements(true);
    setStatementsKey((prevKey) => prevKey + 1); // This forces a re-render of the Statements component
  };

  return (
    <div className="container mx-auto p-6">
      {uploadProgress > 0 && (
        <div className="mb-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-center mt-2">{uploadProgress}% uploaded</p>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-4">Step 1: Upload your images</h1>
      <p className="mb-6 text-sm text-gray-600">
        Max file size: 10MB. Accepted file types: JPG, JPEG, PNG, GIF, WebP
      </p>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">
            Please upload your revenue invoice/receipt here
          </h2>
          <FileDropzone
            onFileDrop={(files) => onFileDrop(files, "revenue")}
            acceptedFileTypes={ACCEPTED_FILE_TYPES}
            maxFileSize={MAX_FILE_SIZE}
          />
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">
            Please upload your expense invoice/receipt here
          </h2>
          <FileDropzone
            onFileDrop={(files) => onFileDrop(files, "expense")}
            acceptedFileTypes={ACCEPTED_FILE_TYPES}
            maxFileSize={MAX_FILE_SIZE}
          />
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="overflow-x-auto">
          <UploadedFilesTable
            files={uploadedFiles}
            setFiles={setUploadedFiles}
          />
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleGenerateStatements}
          >
            Generate Statements
          </button>
        </div>
      )}

      {showStatements && (
        <Statements key={statementsKey} files={uploadedFiles} />
      )}
    </div>
  );
}
