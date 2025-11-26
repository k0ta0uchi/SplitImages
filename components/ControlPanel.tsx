import React from 'react';
import { Settings, Image as ImageIcon, Download, Trash2, Wand2, RefreshCcw, Loader2 } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface ControlPanelProps {
  rows: number;
  setRows: (v: number) => void;
  cols: number;
  setCols: (v: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackground: () => void;
  onDownloadZip: () => void;
  onReset: () => void;
  status: ProcessingStatus;
  hasImage: boolean;
  isProcessed: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  rows,
  setRows,
  cols,
  setCols,
  onUpload,
  onRemoveBackground,
  onDownloadZip,
  onReset,
  status,
  hasImage,
  isProcessed
}) => {
  const isLoading = status !== ProcessingStatus.IDLE;

  return (
    <div className="w-full md:w-80 bg-gray-800 border-r border-gray-700 p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-8 text-indigo-400">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <ImageIcon className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">SplitGrid AI</h1>
      </div>

      <div className="space-y-8 flex-1">
        {/* Upload Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Source Image</h2>
          <label className={`
            flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
            ${hasImage ? 'border-green-500/50 bg-green-500/10' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-700/50'}
          `}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
              <ImageIcon className={`w-8 h-8 mb-2 ${hasImage ? 'text-green-400' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-300">
                {hasImage ? 'Change Image' : 'Upload Image'}
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={onUpload}
              disabled={isLoading} 
            />
          </label>
        </div>

        {/* AI Tools Section */}
        {hasImage && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Magic</h2>
            <button
              onClick={onRemoveBackground}
              disabled={isLoading || isProcessed}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                ${isProcessed 
                  ? 'bg-green-600 text-white cursor-default' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {status === ProcessingStatus.REMOVING_BACKGROUND ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isProcessed ? (
                <Wand2 className="w-4 h-4" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {status === ProcessingStatus.REMOVING_BACKGROUND ? 'Processing...' : isProcessed ? 'Background Removed' : 'Remove Background'}
            </button>
            {isProcessed && (
               <p className="text-xs text-center text-green-400">Background successfully removed!</p>
            )}
          </div>
        )}

        {/* Grid Settings */}
        {hasImage && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Grid Settings</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="text-gray-300">Horizontal Splits (Columns)</label>
                  <span className="text-indigo-400 font-mono">{cols}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="text-gray-300">Vertical Splits (Rows)</label>
                  <span className="text-indigo-400 font-mono">{rows}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  disabled={isLoading}
                />
              </div>

               <div className="pt-2 flex justify-between text-xs text-gray-500">
                  <span>Total Pieces:</span>
                  <span className="text-gray-300 font-mono">{rows * cols}</span>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      {hasImage && (
        <div className="pt-6 border-t border-gray-700 space-y-3">
          <button
            onClick={onDownloadZip}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            {status === ProcessingStatus.ZIPPING ? (
               <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
               <Download className="w-4 h-4" />
            )}
            Download ZIP
          </button>
          
          <button
            onClick={onReset}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Reset All
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;