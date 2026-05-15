export interface AttachmentFile {
  id: string;
  projectId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
}
