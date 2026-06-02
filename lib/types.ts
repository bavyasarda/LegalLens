// Shared TypeScript types for LegalLens

export type DocumentType =
  | "Rent Agreement"
  | "Employment Contract"
  | "NDA"
  | "Loan Agreement"
  | "Other";

export const DOCUMENT_TYPES: DocumentType[] = [
  "Rent Agreement",
  "Employment Contract",
  "NDA",
  "Loan Agreement",
  "Other",
];

export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: DocumentType | string;
  storage_path: string;
  raw_text: string | null;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_text: string;
  embedding: number[]; // 384-dim
  chunk_index: number;
  created_at: string;
}

export interface ChatSource {
  document_id: string;
  document_name: string;
  similarity: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}
