import { pipeline, env } from '@xenova/transformers';

// Configuration to ensure models load correctly from CDN in browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Disable the proxy to run on main thread, avoiding worker initialization issues
// which often cause "registerBackend" errors in CDN setups.
env.backends.onnx.wasm.proxy = false;

// Explicitly set the path to the WASM file to avoid resolution errors
// This must match the version of onnxruntime-web imported in index.html (1.18.0)
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

// Singleton pattern to avoid reloading the model every time
let segmenter: any = null;

export const removeBackgroundLocal = async (imageFile: File): Promise<string> => {
  try {
    if (!segmenter) {
      console.log("Initializing background removal model (Xenova/rmbg-1.4)...");
      // Initialize the pipeline. 'Xenova/rmbg-1.4' is the recommended model for transformers.js
      // We use 'image-segmentation' task.
      segmenter = await pipeline('image-segmentation', 'Xenova/rmbg-1.4');
    }

    const imageUrl = URL.createObjectURL(imageFile);

    // Run inference
    console.log("Running inference...");
    const output = await segmenter(imageUrl);

    if (output && output.length > 0) {
      // The mask is returned as a RawImage object
      // For RMBG models, the output is typically a mask of the foreground
      const mask = output[0].mask;

      // Create a canvas to combine the mask with the original image
      const canvas = document.createElement('canvas');
      canvas.width = mask.width;
      canvas.height = mask.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error("Could not get canvas context");

      // Load the original image onto the canvas
      // Note: We redraw the original image scaled to the mask size to ensure alignment
      // The model might resize input, so the mask dimensions might differ from original file.
      // We rely on the mask dimensions for the output resolution.
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Draw original image scaled to mask size
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get pixel data to apply alpha mask
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = imageData.data;

      const maskData = mask.data; // Uint8Array
      const maskChannels = mask.channels; // Should be 1

      // Apply the mask to the alpha channel of the image
      for (let i = 0; i < pixelData.length; i += 4) {
        const maskIndex = (i / 4) * maskChannels;
        const alphaVal = maskData[maskIndex];

        // Update alpha channel
        pixelData[i + 3] = alphaVal;
      }

      ctx.putImageData(imageData, 0, 0);

      // Return the result as a data URL
      return canvas.toDataURL('image/png');
    }

    throw new Error("Could not process image background");

  } catch (error) {
    console.error("Local Background Removal Error:", error);
    throw error;
  }
};