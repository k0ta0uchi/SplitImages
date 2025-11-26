import React, { useState, useEffect, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import GridPreview from './components/GridPreview';
import { ImageState, ProcessingStatus, SplitPiece } from './types';
import { splitImage, downloadZip, downloadSingle } from './services/imageService';
import { removeBackgroundLocal } from './services/backgroundService';

const App: React.FC = () => {
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

  // Debounce the split operation to avoid freezing on slider drag
  useEffect(() => {
    if (!imageState.previewUrl) {
      setPieces([]);
      return;
    }

    const timer = setTimeout(async () => {
      // Don't set SPLITTING status if we are just previewing resizing, 
      // unless we want to show a loader. Canvas is fast for small numbers.
      try {
        const newPieces = await splitImage(imageState.previewUrl!, rows, cols);
        setPieces(newPieces);
      } catch (error) {
        console.error("Split failed", error);
        setErrorMessage("Failed to split image.");
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
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageState.original) return;

    setStatus(ProcessingStatus.REMOVING_BACKGROUND);
    setErrorMessage(null);

    try {
      // Use local transformer-based background removal
      const processedUrl = await removeBackgroundLocal(imageState.original);
      
      setImageState(prev => ({
        ...prev,
        previewUrl: processedUrl,
        isProcessed: true
      }));
      
    } catch (error) {
      console.error(error);
      setErrorMessage("Background removal failed. Please check console for details.");
    } finally {
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleDownloadZip = async () => {
    if (pieces.length === 0) return;
    setStatus(ProcessingStatus.ZIPPING);
    try {
      await downloadZip(pieces);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to generate ZIP.");
    } finally {
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleReset = () => {
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
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-900 text-gray-100">
      <ControlPanel 
        rows={rows}
        setRows={setRows}
        cols={cols}
        setCols={setCols}
        onUpload={handleUpload}
        onRemoveBackground={handleRemoveBackground}
        onDownloadZip={handleDownloadZip}
        onReset={handleReset}
        status={status}
        hasImage={!!imageState.previewUrl}
        isProcessed={imageState.isProcessed}
      />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        <GridPreview 
          pieces={pieces}
          cols={cols}
          onDownloadSingle={downloadSingle}
          isLoading={status !== ProcessingStatus.IDLE}
        />
        
        {/* Error Toast */}
        {errorMessage && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500/90 text-white text-sm rounded-lg shadow-lg backdrop-blur animate-fade-in-up">
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
    </div>
  );
};

export default App;