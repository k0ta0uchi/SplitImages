import React from 'react';
import { Download } from 'lucide-react';
import { SplitPiece } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface GridPreviewProps {
  pieces: SplitPiece[];
  cols: number;
  onDownloadSingle: (piece: SplitPiece) => void;
  isLoading: boolean;
}

const GridPreview: React.FC<GridPreviewProps> = ({ pieces, cols, onDownloadSingle, isLoading }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full p-8 overflow-y-auto bg-gray-900 flex items-center justify-center">
      {pieces.length === 0 ? (
        <div className="text-center space-y-4 max-w-md mx-auto opacity-50">
          <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-2xl mx-auto flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 rounded-lg" />
          </div>
          <p className="text-xl font-medium text-gray-400">{t('noImageLoaded')}</p>
          <p className="text-sm text-gray-500">{t('uploadInstruction')}</p>
        </div>
      ) : (
        <div className="relative max-w-5xl w-full">
           {/* Controls overlay or info could go here */}
           
          <div 
            className="grid gap-1 bg-gray-800 p-1 rounded-lg shadow-2xl border border-gray-700 mx-auto transition-all duration-300"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
            }}
          >
            {pieces.map((piece) => (
              <div 
                key={piece.id} 
                className="group relative aspect-square bg-gray-900/50 overflow-hidden"
              >
                <img 
                  src={piece.url} 
                  alt={`Piece ${piece.row}-${piece.col}`}
                  className="w-full h-full object-contain" // Use object-contain to see full piece, or cover for grid feel? Usually splitters want "cover" to reconstruct image visually, but standard CSS grid gaps breaks the illusion slightly. Let's use w-full h-full block.
                  style={{ display: 'block', width: '100%', height: '100%' }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button
                    onClick={() => onDownloadSingle(piece)}
                    className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-200 transform hover:scale-110 transition-all shadow-lg"
                    title={t('downloadPiece')}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] font-mono text-gray-400 bg-black/50 px-1 rounded">
                    {piece.row + 1},{piece.col + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center text-gray-500 text-sm">
             {t('previewCount', { count: pieces.length })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GridPreview;