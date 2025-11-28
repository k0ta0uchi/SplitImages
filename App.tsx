import React, { useState, useEffect, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import GridPreview from './components/GridPreview';
import { ImageState, ProcessingStatus, SplitPiece } from './types';
import { splitImage, downloadZip, downloadSingle } from './services/imageService';
import { removeBackgroundLocal } from './services/backgroundService';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

import { Settings, Loader2, X } from 'lucide-react'; // Import Settings and Loader2

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    previewUrl: null,
    isProcessed: false,
  });

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [pieces, setPieces] = useState<SplitPiece[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(0.5);
  const [opacityBoost, setOpacityBoost] = useState<number>(1.0);
  const [expand, setExpand] = useState<number>(0);
  const [removalMode, setRemovalMode] = useState<'original' | 'split'>('split');
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // For mobile bottom sheet

  // Control panel visibility on mobile based on image state
  useEffect(() => {
     if (!imageState.previewUrl) {
       setIsPanelOpen(true);
     }
     // Removed "else { setIsPanelOpen(false) }" to keep panel open after upload
  }, [imageState.previewUrl]);

  // Debounce the split operation to avoid freezing on slider drag
  useEffect(() => {
    if (!imageState.previewUrl) {
      setPieces([]);
      return;
    }

    // If we are in split mode and have processed pieces, we might not want to overwrite them
    // immediately if the user is just toggling things, but if rows/cols change, we MUST re-split.
    // The dependency array includes rows/cols, so this runs on change.

    const timer = setTimeout(async () => {
      try {
        const newPieces = await splitImage(imageState.previewUrl!, rows, cols);
        setPieces(newPieces);
      } catch (error) {
        console.error("Split failed", error);
        setErrorMessage(t('errorSplit'));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [imageState.previewUrl, rows, cols]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageState({
        original: file,
        previewUrl: url,
        isProcessed: false
      });
      setPieces([]);
      setStatus(ProcessingStatus.IDLE);
      setErrorMessage(null);
      setThreshold(0.5);
      setRemovalMode('split');
    }
  };

  // Helper to convert DataURL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      setIsCanceling(true);
      abortControllerRef.current.abort();
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageState.original) return;

    // Mobile: Close panel to show preview
    setIsPanelOpen(false);

    setStatus(ProcessingStatus.REMOVING_BACKGROUND);
    setErrorMessage(null);
    setProgress(0);
    setProgressText(t('initializing'));
    setIsCanceling(false);

    abortControllerRef.current = new AbortController();

    try {
      if (removalMode === 'original') {
        // Original mode: Process whole image first
        const processedUrl = await removeBackgroundLocal(imageState.original, {
          threshold,
          opacityBoost,
          expand
        }, (msg, percent) => {
          // Check abort signal? removeBackgroundLocal doesn't support aborting mid-inference easily yet,
          // but we can check here if we want to stop updating UI
          if (abortControllerRef.current?.signal.aborted) throw new Error('Aborted');
          setProgressText(msg);
          setProgress(percent);
        });

        if (abortControllerRef.current?.signal.aborted) throw new Error('Aborted');

        setImageState(prev => ({
          ...prev,
          previewUrl: processedUrl,
          isProcessed: true
        }));
      } else {
        // Split mode: Split first, then process each piece
        // We need to re-generate pieces here to ensure we have the latest split from the ORIGINAL image
        // (or current preview if it's already processed, but usually we want from original if we are switching modes)
        // Actually, if imageState.isProcessed is true, previewUrl is already transparent.
        // If user switches to split mode after original mode, they might want to re-process from scratch?
        // Let's assume we always process from the current previewUrl state, 
        // BUT if we want "Split then Remove", we imply removing background from opaque pieces.
        // So we should probably use imageState.original if available.

        // However, splitImage takes a URL.
        const originalUrl = URL.createObjectURL(imageState.original);
        const currentPieces = await splitImage(originalUrl, rows, cols);
        URL.revokeObjectURL(originalUrl); // Clean up

        // Initialize pieces with original ones first
        setPieces(currentPieces);

        const totalPieces = currentPieces.length;

        // Process each piece sequentially
        for (let i = 0; i < totalPieces; i++) {
          if (abortControllerRef.current?.signal.aborted) {
             throw new Error('Aborted');
          }
          
          // Yield to main thread to allow UI rendering
          await new Promise(resolve => setTimeout(resolve, 50));

          const piece = currentPieces[i];
          const file = dataURLtoFile(piece.dataUrl, `piece_${i}.png`);

          // Process piece
          const processedDataUrl = await removeBackgroundLocal(file, {
            threshold,
            opacityBoost,
            expand
          }, (msg, percent) => {
             if (abortControllerRef.current?.signal.aborted) return;
             // Calculate global progress
             // Global = (Completed Pieces * 100 + Current Piece Percent) / Total Pieces
             const globalPercent = ((i * 100) + percent) / totalPieces;
             setProgress(globalPercent);
             setProgressText(`${t('piece')} ${i + 1}/${totalPieces}: ${msg}`);
          });

          if (abortControllerRef.current?.signal.aborted) {
             throw new Error('Aborted');
          }

          // Create new Blob/File and URL for the processed piece
          const processedFile = dataURLtoFile(processedDataUrl, piece.fileName);
          const processedUrl = URL.createObjectURL(processedFile);

          const newPiece: SplitPiece = {
            ...piece,
            blob: processedFile,
            url: processedUrl,
            dataUrl: processedDataUrl
          };

          // Update pieces state incrementally to show progress
          setPieces(prev => {
            const next = [...prev];
            next[i] = newPiece;
            return next;
          });
          
          // Yield again to ensure render happens after state update
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Mark as processed so UI updates (buttons disable etc)
        // But we DON'T update previewUrl because that would trigger the useEffect and overwrite our work
        setImageState(prev => ({
          ...prev,
          isProcessed: true
        }));
      }

    } catch (error: any) {
      if (error.message === 'Aborted') {
        console.log('Processing aborted');
        // Optional: revert pieces or keep partial? 
        // For now, we leave partial state or reset status
      } else {
        console.error(error);
        setErrorMessage(t('errorBackground'));
      }
    } finally {
      setStatus(ProcessingStatus.IDLE);
      setProgress(0);
      setProgressText('');
      setIsCanceling(false);
      abortControllerRef.current = null;
      // Re-open panel when done
      setIsPanelOpen(true);
    }
  };

  const handleDownloadZip = async () => {
    if (pieces.length === 0) return;
    setStatus(ProcessingStatus.ZIPPING);
    try {
      await downloadZip(pieces);
    } catch (error) {
      console.error(error);
      setErrorMessage(t('errorZip'));
    } finally {
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleReset = () => {
    if (status !== ProcessingStatus.IDLE) {
       handleCancel();
    }
    setImageState({
      original: null,
      previewUrl: null,
      isProcessed: false
    });
    setPieces([]);
    setRows(2);
    setCols(2);
    setErrorMessage(null);
    setStatus(ProcessingStatus.IDLE);
    setThreshold(0.5);
    setRemovalMode('split');
  };

  const commonControlProps = {
    rows,
    setRows,
    cols,
    setCols,
    onUpload: handleUpload,
    onRemoveBackground: handleRemoveBackground,
    onDownloadZip: handleDownloadZip,
    onReset: handleReset,
    status,
    hasImage: !!imageState.previewUrl,
    isProcessed: imageState.isProcessed,
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
    onCancel: handleCancel,
    isCanceling
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100 relative">
      {/* Desktop Sidebar (visible on md+) */}
      <div className="hidden md:block h-full">
        <ControlPanel
          {...commonControlProps}
          variant="desktop"
        />
      </div>

      {/* Main Content (Preview) */}
      <main className="flex-1 relative flex flex-col min-w-0 h-full">
        {/* Mobile: Adjust height to not be covered by bottom sheet when open? 
            Actually, let it be covered (overlay) but maybe add padding-bottom if needed. 
            Or use a flex layout where bottom sheet pushes content up?
            "Bottom sheet" usually overlays. But we want user to see preview while editing.
            Let's keep it simple: Preview takes full height, Panel overlays at bottom.
        */}
        <div className={`w-full h-full transition-all duration-300 ${isPanelOpen ? 'pb-[70vh] md:pb-0' : 'pb-16 md:pb-0'}`}>
            <GridPreview
              pieces={pieces}
              cols={cols}
              onDownloadSingle={downloadSingle}
              isLoading={status !== ProcessingStatus.IDLE}
            />
        </div>

        {/* Mobile Progress Overlay - Compact Capsule */}
        {status === ProcessingStatus.REMOVING_BACKGROUND && (
          <div className="absolute bottom-20 left-4 right-4 z-30 flex items-center justify-center md:hidden animate-fade-in-up">
            <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-full shadow-2xl p-3 flex items-center gap-3 w-full max-w-sm">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-medium text-white truncate mr-2">{progressText || t('processing')}</span>
                   <span className="text-xs font-mono text-indigo-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                     style={{ width: `${progress}%` }}
                   />
                </div>
              </div>

              <button
                 onClick={handleCancel}
                 disabled={isCanceling}
                 className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0"
                 title={t('cancel')}
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500/90 text-white text-sm rounded-lg shadow-lg backdrop-blur animate-fade-in-up z-50 w-[90%] md:w-auto text-center">
            {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-3 hover:text-red-200 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </main>

      {/* Mobile Bottom Sheet (visible on md-) */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-800 border-t border-gray-700 shadow-2xl transition-all duration-300 ease-in-out flex flex-col`}
        style={{ height: isPanelOpen ? '70vh' : '60px' }}
      >
        <ControlPanel
          {...commonControlProps}
          variant="mobile"
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;