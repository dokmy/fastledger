import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileDropzoneProps {
  onFileDrop: (acceptedFiles: File[]) => void;
  acceptedFileTypes: Record<string, string[]>;
  maxFileSize: number;
}

export function FileDropzone({
  onFileDrop,
  acceptedFileTypes,
  maxFileSize,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileDrop(acceptedFiles);
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>Drag 'n' drop an image here, or click to select a file</p>
      )}
    </div>
  );
}
