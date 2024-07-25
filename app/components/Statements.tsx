import React from "react";
import { GeneralLedger } from "./GeneralLedger";
import { IncomeStatement } from "./IncomeStatement";
import { FileData } from "@/types/fileData";

interface StatementsProps {
  files: FileData[];
}

export function Statements({ files }: StatementsProps) {
  return (
    <div className="flex flex-col mt-8 space-y-8">
      <GeneralLedger files={files} />
      <IncomeStatement files={files} />
    </div>
  );
}
