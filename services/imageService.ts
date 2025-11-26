import JSZip from 'jszip';
import saveAs from 'file-saver';
import { SplitPiece } from '../types';

export const splitImage = async (
  imageUrl: string,
  rows: number,
  cols: number
): Promise<SplitPiece[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const pieces: SplitPiece[] = [];
      const pieceWidth = img.width / cols;
      const pieceHeight = img.height / rows;

      // To avoid massive blocking, we can use a small delay or just process synchronously for now.
      // For very large images, this might need OffscreenCanvas or Workers.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = pieceWidth;
          canvas.height = pieceHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Draw the specific slice
          ctx.drawImage(
            img,
            c * pieceWidth, // source x
            r * pieceHeight, // source y
            pieceWidth, // source w
            pieceHeight, // source h
            0, // dest x
            0, // dest y
            pieceWidth, // dest w
            pieceHeight // dest h
          );

          // Convert to blob
          try {
            const blob = await new Promise<Blob | null>((res) => 
              canvas.toBlob(res, 'image/png')
            );
            
            if (blob) {
              const url = URL.createObjectURL(blob);
              pieces.push({
                id: `piece_${r}_${c}`,
                blob,
                url,
                row: r,
                col: c,
                fileName: `split_${r + 1}_${c + 1}.png`
              });
            }
          } catch (e) {
            console.error("Error creating blob", e);
          }
        }
      }
      resolve(pieces);
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
};

export const downloadZip = async (pieces: SplitPiece[], baseName: string = 'split_images') => {
  const zip = new JSZip();
  const folder = zip.folder(baseName);

  if (!folder) return;

  pieces.forEach((piece) => {
    folder.file(piece.fileName, piece.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${baseName}.zip`);
};

export const downloadSingle = (piece: SplitPiece) => {
  saveAs(piece.blob, piece.fileName);
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data url prefix (e.g. "data:image/png;base64,") to get just the base64 string if needed
        // but for Gemini inlineData, we often just need the base64 part.
        const base64 = result.split(',')[1]; 
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};