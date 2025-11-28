import React, { useState } from 'react';
import { Download, Share, FileDown, X } from 'lucide-react';
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
  const [selectedPiece, setSelectedPiece] = useState<SplitPiece | null>(null);

  const handleDownloadClick = (piece: SplitPiece) => {
    // Check if mobile (simple width check) AND share API is available
    const isMobile = window.innerWidth < 768;
    if (isMobile && navigator.canShare) {
      setSelectedPiece(piece);
    } else {
      onDownloadSingle(piece);
    }
  };

  const handleShare = async () => {
    if (!selectedPiece) return;
    try {
      // Need to convert blob to File object if not already
      // SplitPiece already has 'blob' which is a File object in our App.tsx logic
      const file = selectedPiece.blob; 
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: selectedPiece.fileName,
          text: 'Created with SplitGrid AI'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSelectedPiece(null);
    }
  };

  const handleSaveFile = () => {
    if (selectedPiece) {
      onDownloadSingle(selectedPiece);
      setSelectedPiece(null);
    }
  };

  return (
    <>
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
          <div className="relative max-w-5xl w-full pb-20 md:pb-0"> 
             {/* pb-20 added to ensure last items are visible above mobile bottom sheet/progress bar if needed. 
                 Actually App.tsx handles container padding, but extra safety here doesn't hurt. */}
             
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
                    className="w-full h-full object-contain" 
                    style={{ display: 'block', width: '100%', height: '100%' }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button
                      onClick={() => handleDownloadClick(piece)}
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

      {/* Download/Share Modal */}
      {selectedPiece && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 w-full md:w-96 md:rounded-2xl rounded-t-2xl border-t md:border border-gray-700 shadow-2xl p-6 space-y-4 animate-slide-up md:animate-zoom-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-white">{t('downloadOptions')}</h3>
              <button 
                onClick={() => setSelectedPiece(null)}
                className="p-1 text-gray-400 hover:text-white rounded-full bg-gray-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveFile}
                className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left group"
              >
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:bg-indigo-500/30">
                  <FileDown className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium text-white">{t('saveToFile')}</div>
                  <div className="text-xs text-gray-400">Download to device storage</div>
                </div>
              </button>

              <button 
                onClick={handleShare}
                className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left group"
              >
                <div className="p-2 bg-green-500/20 text-green-400 rounded-lg group-hover:bg-green-500/30">
                  <Share className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium text-white">{t('shareImage')}</div>
                  <div className="text-xs text-gray-400">Save to Photos, Share, etc.</div>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setSelectedPiece(null)}
              className="w-full py-3 mt-2 text-gray-400 hover:text-white font-medium text-sm"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GridPreview;