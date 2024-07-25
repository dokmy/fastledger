import { NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3Client";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    console.log(`Received ${files.length} file(s) for upload`);

    if (files.length === 0) {
      console.log('No files uploaded');
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadResults = await Promise.all(files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const fileName = `${Date.now()}-${file.name}`;

      console.log(`Uploading file: ${fileName}`);

      console.log('Bucket name:', process.env.AWS_S3_BUCKET_NAME);
      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      };

      const uploadCommand = new PutObjectCommand(uploadParams);
      await s3Client.send(uploadCommand);

      console.log(`File uploaded successfully: ${fileName}`);

      // Generate signed URL
      const getObjectParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
      };
      const command = new GetObjectCommand(getObjectParams);
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      console.log(`Generated signed URL for ${fileName}: ${signedUrl}`);

      return {
        fileName: file.name,
        s3Url: signedUrl
      };
    }));

    console.log(`All files uploaded successfully. Total: ${uploadResults.length}`);

    return NextResponse.json({ 
      status: 'success', 
      message: 'Files uploaded successfully',
      files: uploadResults
    });
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}