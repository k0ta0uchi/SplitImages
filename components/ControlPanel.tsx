import React, { useState } from 'react';
import { Settings, Image as ImageIcon, Download, Trash2, Wand2, RefreshCcw, Loader2, ChevronDown, ChevronRight, Languages, X, Menu, ChevronUp } from 'lucide-react';
import { ProcessingStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

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
  threshold: number;
  setThreshold: (v: number) => void;
  opacityBoost: number;
  setOpacityBoost: (v: number) => void;
  expand: number;
  setExpand: (v: number) => void;
  removalMode: 'original' | 'split';
  setRemovalMode: (v: 'original' | 'split') => void;
  progress: number;
  progressText: string;
  onCancel: () => void;
  isCanceling: boolean;
  
  // New props for layout control
  variant?: 'desktop' | 'mobile';
  isOpen?: boolean;
  onToggle?: () => void;
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
  isProcessed,
  threshold,
  setThreshold,
  opacityBoost,
  setOpacityBoost,
  expand,
  setExpand,
  removalMode,
  setRemovalMode,
  progress,
  progressText,
  onCancel,
  isCanceling,
  variant = 'desktop',
  isOpen = true,
  onToggle
}) => {
  const { t, language, setLanguage } = useLanguage();
  const isLoading = status !== ProcessingStatus.IDLE;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLanguage(language === 'en' ? 'ja' : 'en');
  };

  const isMobile = variant === 'mobile';

  // Mobile Header (Bottom Sheet Handle)
  const MobileHeader = () => (
    <div 
      className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 cursor-pointer select-none"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 text-indigo-400">
         <div className="w-8 h-1 bg-gray-600 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2" />
         <div className="flex items-center gap-2 mt-2">
            <ImageIcon className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-tight text-white">{t('appTitle')}</h1>
         </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={toggleLanguage}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1 text-xs bg-gray-700/50"
        >
           <Languages className="w-3 h-3" />
           <span>{language.toUpperCase()}</span>
        </button>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
      </div>
    </div>
  );

  return (
    <div className={`
      bg-gray-800 flex flex-col transition-all duration-300
      ${isMobile ? 'w-full h-full' : 'w-full md:w-80 border-r border-gray-700 h-full'}
    `}>
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader />}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-indigo-400">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">{t('appTitle')}</h1>
            </div>
            
            <button
              onClick={toggleLanguage}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Switch Language"
            >
              <Languages className="w-4 h-4" />
              <span>{language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Area - Scrollable */}
      <div className={`flex-1 overflow-y-auto p-6 ${isMobile && !isOpen ? 'hidden' : 'block'}`}>
        <div className="space-y-8 pb-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('sourceImage')}</h2>
            <label className={`
              flex flex-col items-center justify-center w-full h-32 
              border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
              ${hasImage ? 'border-green-500/50 bg-green-500/10' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-700/50'}
            `}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <ImageIcon className={`w-8 h-8 mb-2 ${hasImage ? 'text-green-400' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-300">
                  {hasImage ? t('changeImage') : t('uploadImage')}
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

          {/* Grid Settings */}
          {hasImage && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('gridSettings')}</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-gray-300">{t('horizontalSplits')}</label>
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
                    <label className="text-gray-300">{t('verticalSplits')}</label>
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
                  <span>{t('totalPieces')}:</span>
                  <span className="text-gray-300 font-mono">{rows * cols}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Tools Section */}
          {hasImage && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('aiMagic')}</h2>

              {/* Removal Mode Toggle */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300 block">{t('removalMode')}</label>
                <div className="flex bg-gray-700 p-1 rounded-lg">
                  <button
                    onClick={() => setRemovalMode('original')}
                    disabled={isLoading || isProcessed}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${removalMode === 'original'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    {t('modeOriginal')}
                  </button>
                  <button
                    onClick={() => setRemovalMode('split')}
                    disabled={isLoading || isProcessed}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${removalMode === 'split'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    {t('modeSplit')}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {removalMode === 'original'
                    ? t('modeOriginalDesc')
                    : t('modeSplitDesc')}
                </p>
              </div>

              {/* Advanced Settings Accordion */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-xs font-medium text-gray-300 transition-colors"
                >
                  <span>{t('advancedSettings')}</span>
                  {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                
                {showAdvanced && (
                  <div className="p-3 space-y-4 bg-gray-800/50">
                     {/* Threshold Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="text-gray-400">{t('maskThreshold')}</label>
                        <span className="text-indigo-400 font-mono">{threshold.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        disabled={isLoading || isProcessed}
                      />
                    </div>

                    {/* Opacity Boost Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="text-gray-400">{t('opacityBoost')}</label>
                        <span className="text-indigo-400 font-mono">x{opacityBoost.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={opacityBoost}
                        onChange={(e) => setOpacityBoost(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        disabled={isLoading || isProcessed}
                      />
                    </div>

                    {/* Mask Expansion Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="text-gray-400">{t('maskExpansion')}</label>
                        <span className="text-indigo-400 font-mono">{expand > 0 ? '+' : ''}{expand} px</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="1"
                        value={expand}
                        onChange={(e) => setExpand(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        disabled={isLoading || isProcessed}
                      />
                    </div>
                  </div>
                )}
              </div>

              {status === ProcessingStatus.REMOVING_BACKGROUND && !isMobile ? (
                 <div className="space-y-2">
                   <div className="w-full h-10 bg-gray-700 rounded-lg relative overflow-hidden flex items-center justify-center">
                     <div 
                       className="absolute left-0 top-0 bottom-0 bg-indigo-600 transition-all duration-300 ease-out"
                       style={{ width: `${progress}%` }}
                     />
                     <span className="relative z-10 text-xs font-medium text-white drop-shadow-md px-2 truncate">
                       {progressText || `${Math.round(progress)}%`}
                     </span>
                   </div>
                   <button
                     onClick={onCancel}
                     disabled={isCanceling}
                     className="w-full py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/30"
                   >
                     {isCanceling ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                     {t('cancel')}
                   </button>
                 </div>
              ) : (
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
                {status === ProcessingStatus.REMOVING_BACKGROUND 
                  ? t('processing') 
                  : isProcessed 
                    ? t('backgroundRemoved') 
                    : t('removeBackground')}
              </button>
              )}
              {isProcessed && (
                <p className="text-xs text-center text-green-400">{t('backgroundSuccess')}</p>
              )}
            </div>
          )}

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
                {t('downloadZip')}
              </button>

              <button
                onClick={onReset}
                disabled={isLoading && status !== ProcessingStatus.REMOVING_BACKGROUND} // Allow reset to cancel
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm"
              >
                <Trash2 className="w-4 h-4" />
                {t('resetAll')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;