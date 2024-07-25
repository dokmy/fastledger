export interface FileData {
    fileName: string;
    s3Url: string;
    type: 'revenue' | 'expense';
    uploadedAt: string;
    date: string;
    description: string;
    invoiceNumber: string;
    amount: string;
    deposit?: string;
    withdrawal?: string;
  }