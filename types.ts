export interface SplitPiece {
  id: string;
  blob: Blob;
  url: string;
  row: number;
  col: number;
  fileName: string;
}

export interface ImageState {
  original: File | null;
  previewUrl: string | null; // The URL of the image to be split (either original or processed)
  isProcessed: boolean; // True if background has been removed
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  REMOVING_BACKGROUND = 'REMOVING_BACKGROUND',
  SPLITTING = 'SPLITTING',
  ZIPPING = 'ZIPPING',
  ERROR = 'ERROR'
}