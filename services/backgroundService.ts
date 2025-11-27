import * as ort from 'onnxruntime-web';

// --- Configuration ---
const MODEL_URL_DEPTH = 'https://huggingface.co/withoutbg/snap/resolve/main/depth_anything_v2_vits_slim.onnx';
const MODEL_URL_MATTING = 'https://huggingface.co/withoutbg/snap/resolve/main/snap_matting_0.1.0.onnx';
const MODEL_URL_REFINER = 'https://huggingface.co/withoutbg/snap/resolve/main/snap_refiner_0.1.0.onnx';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

// --- Session Management ---
let depthSession: ort.InferenceSession | null = null;
let mattingSession: ort.InferenceSession | null = null;
let refinerSession: ort.InferenceSession | null = null;

async function initDepthSession(): Promise<ort.InferenceSession> {
  if (depthSession) return depthSession;
  console.log('Loading depth model...');
  try {
    if ((navigator as any).gpu) {
      try {
        depthSession = await ort.InferenceSession.create(MODEL_URL_DEPTH, { executionProviders: ['webgpu'] });
        console.log('Depth model loaded with WebGPU');
        return depthSession;
      } catch (e) {
        console.warn('WebGPU failed for Depth, falling back to WASM');
      }
    }
    depthSession = await ort.InferenceSession.create(MODEL_URL_DEPTH, { executionProviders: ['wasm'] });
    console.log('Depth model loaded with WASM');
    return depthSession;
  } catch (error) {
    console.error('Failed to load depth model:', error);
    throw error;
  }
}

async function initMattingSession(): Promise<ort.InferenceSession> {
  if (mattingSession) return mattingSession;
  console.log('Loading matting model...');
  try {
    if ((navigator as any).gpu) {
      try {
        mattingSession = await ort.InferenceSession.create(MODEL_URL_MATTING, { executionProviders: ['webgpu'] });
        console.log('Matting model loaded with WebGPU');
        return mattingSession;
      } catch (e) {
        console.warn('WebGPU failed for Matting, falling back to WASM');
      }
    }
    mattingSession = await ort.InferenceSession.create(MODEL_URL_MATTING, { executionProviders: ['wasm'] });
    console.log('Matting model loaded with WASM');
    return mattingSession;
  } catch (error) {
    console.error('Failed to load matting model:', error);
    throw error;
  }
}

async function initRefinerSession(): Promise<ort.InferenceSession> {
  if (refinerSession) return refinerSession;
  console.log('Loading refiner model...');
  try {
    if ((navigator as any).gpu) {
      try {
        refinerSession = await ort.InferenceSession.create(MODEL_URL_REFINER, { executionProviders: ['webgpu'] });
        console.log('Refiner model loaded with WebGPU');
        return refinerSession;
      } catch (e) {
        console.warn('WebGPU failed for Refiner, falling back to WASM');
      }
    }
    refinerSession = await ort.InferenceSession.create(MODEL_URL_REFINER, { executionProviders: ['wasm'] });
    console.log('Refiner model loaded with WASM');
    return refinerSession;
  } catch (error) {
    console.error('Failed to load refiner model:', error);
    throw error;
  }
}

// --- Helper Functions ---

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function getFitInfo(srcW: number, srcH: number, targetW: number, targetH: number) {
  const scale = Math.min(targetW / srcW, targetH / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const offsetX = Math.floor((targetW - newW) / 2);
  const offsetY = Math.floor((targetH - newH) / 2);
  return { newW, newH, offsetX, offsetY };
}

function drawImageFitToCanvas(img: HTMLImageElement, canvasW: number, canvasH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const scale = Math.min(canvasW / img.width, canvasH / img.height);
  const newW = Math.round(img.width * scale);
  const newH = Math.round(img.height * scale);
  const offsetX = Math.floor((canvasW - newW) / 2);
  const offsetY = Math.floor((canvasH - newH) / 2);
  ctx.drawImage(img, offsetX, offsetY, newW, newH);
  return canvas;
}

function canvasToCHWFloat(canvas: HTMLCanvasElement, channels: number[] = [0, 1, 2]): Float32Array {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, W, H).data;
  const C = channels.length;
  const out = new Float32Array(C * W * H);
  let p = 0;
  for (let c = 0; c < C; c++) {
    const ch = channels[c];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        out[p++] = imgData[idx + ch] / 255.0;
      }
    }
  }
  return out;
}

function normalizeMinMaxFloat32(arr: Float32Array): Float32Array {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const out = new Float32Array(arr.length);
  if (max - min < 1e-8) {
    for (let i = 0; i < out.length; i++) out[i] = 0.5;
    return out;
  }
  for (let i = 0; i < arr.length; i++) {
    out[i] = (arr[i] - min) / (max - min);
  }
  return out;
}

function getFirstOutputTensor(result: ort.InferenceSession.OnnxValueMapType): ort.Tensor {
  const keys = Object.keys(result);
  if (keys.length === 0) throw new Error('No outputs from model');
  return result[keys[0]] as ort.Tensor;
}

// --- Post-Processing Helpers ---

function applyMorphology(input: Float32Array, width: number, height: number, radius: number, isDilation: boolean): Float32Array {
  if (radius === 0) return input;
  const size = input.length;
  // We need to clone input because we shouldn't modify it in place during the pass
  const output = new Float32Array(size);
  const temp = new Float32Array(size);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      let val = isDilation ? 0 : 1;
      const start = Math.max(0, x - radius);
      const end = Math.min(width - 1, x + radius);
      
      // Initialize with center value (or neutral)
      val = input[yOffset + x];

      for (let k = start; k <= end; k++) {
        const p = input[yOffset + k];
        if (isDilation) {
          if (p > val) val = p;
        } else {
          if (p < val) val = p;
        }
      }
      temp[yOffset + x] = val;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let val = isDilation ? 0 : 1;
      const start = Math.max(0, y - radius);
      const end = Math.min(height - 1, y + radius);
      
      val = temp[start * width + x];

      for (let k = start; k <= end; k++) {
        const p = temp[k * width + x];
        if (isDilation) {
          if (p > val) val = p;
        } else {
          if (p < val) val = p;
        }
      }
      output[y * width + x] = val;
    }
  }
  
  return output;
}

function postProcessAlpha(
  alpha: Float32Array,
  width: number,
  height: number,
  settings: { threshold: number; opacityBoost: number; expand: number }
): Float32Array {
  let processed = alpha;

  // 1. Expand (Morphology)
  if (settings.expand !== 0) {
    const radius = Math.abs(settings.expand);
    const isDilation = settings.expand > 0;
    processed = applyMorphology(processed, width, height, radius, isDilation);
  }

  // 2. Opacity Boost & Threshold
  // We do this in place on the 'processed' array (which is either a new array from morphology or the original)
  // If it's the original, we should probably clone it if we want to be pure, but here we can modify in place
  // since 'alpha' comes from the tensor data copy earlier.
  
  for (let i = 0; i < processed.length; i++) {
    let val = processed[i];
    
    // Opacity Boost: Scale up alpha, clamping to 1.0
    if (val > 0 && settings.opacityBoost !== 1.0) {
        val = Math.min(1.0, val * settings.opacityBoost);
    }

    // Threshold: Hard cutoff
    if (val < settings.threshold) {
      val = 0.0;
    }
    
    processed[i] = val;
  }
  
  return processed;
}

// --- Preprocessing Stages ---

function preprocessDepth(img: HTMLImageElement): { tensor: ort.Tensor; canvas: HTMLCanvasElement } {
  const target = 518;
  const canvas = drawImageFitToCanvas(img, target, target);
  const chw = canvasToCHWFloat(canvas, [0, 1, 2]);
  const tensor = new ort.Tensor('float32', chw, [1, 3, target, target]);
  return { tensor, canvas };
}

function preprocessMatting(img: HTMLImageElement, depthArr: Float32Array, depthW: number, depthH: number): ort.Tensor {
  const target = 256;
  const rgbCanvas = drawImageFitToCanvas(img, target, target);
  const rgbCHW = canvasToCHWFloat(rgbCanvas, [0, 1, 2]);

  const depthNorm = normalizeMinMaxFloat32(depthArr);

  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = depthW;
  depthCanvas.height = depthH;
  const depthCtx = depthCanvas.getContext('2d')!;
  const depthImageData = depthCtx.createImageData(depthW, depthH);
  for (let i = 0; i < depthNorm.length; i++) {
    const v = Math.round(255 * depthNorm[i]);
    const idx = i * 4;
    depthImageData.data[idx] = v;
    depthImageData.data[idx + 1] = v;
    depthImageData.data[idx + 2] = v;
    depthImageData.data[idx + 3] = 255;
  }
  depthCtx.putImageData(depthImageData, 0, 0);

  const resizedDepthCanvas = document.createElement('canvas');
  resizedDepthCanvas.width = target;
  resizedDepthCanvas.height = target;
  const rdc = resizedDepthCanvas.getContext('2d')!;
  rdc.imageSmoothingEnabled = true;
  rdc.drawImage(depthCanvas, 0, 0, depthW, depthH, 0, 0, target, target);
  const rd = rdc.getImageData(0, 0, target, target).data;
  const depthArr256 = new Float32Array(target * target);
  for (let i = 0; i < target * target; i++) {
    depthArr256[i] = rd[i * 4] / 255.0;
  }

  const floatData = new Float32Array(1 * 4 * target * target);
  let p = 0;
  for (let c = 0; c < 3; c++) {
    const offset = c * target * target;
    for (let i = 0; i < target * target; i++) {
      floatData[p++] = rgbCHW[offset + i];
    }
  }
  for (let i = 0; i < target * target; i++) {
    floatData[p++] = depthArr256[i];
  }

  return new ort.Tensor('float32', floatData, [1, 4, target, target]);
}

function preprocessRefiner(img: HTMLImageElement, depthArr: Float32Array, depthW: number, depthH: number, alphaArr: Float32Array, alphaW: number, alphaH: number): ort.Tensor {
  const W = img.width, H = img.height;

  // FIX: Use original image directly WITHOUT padding for Refiner RGB input
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const rgbCHW = canvasToCHWFloat(canvas, [0, 1, 2]);

  const depthNorm = normalizeMinMaxFloat32(depthArr);
  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = depthW;
  depthCanvas.height = depthH;
  const depthCtx = depthCanvas.getContext('2d')!;
  const depthImgData = depthCtx.createImageData(depthW, depthH);
  for (let i = 0; i < depthNorm.length; i++) {
    const v = Math.round(255 * depthNorm[i]);
    const idx = i * 4;
    depthImgData.data[idx] = v;
    depthImgData.data[idx + 1] = v;
    depthImgData.data[idx + 2] = v;
    depthImgData.data[idx + 3] = 255;
  }
  depthCtx.putImageData(depthImgData, 0, 0);

  // FIX: Crop valid region from Depth map before resizing
  const dFit = getFitInfo(W, H, depthW, depthH);
  const resizedDepthCanvas = document.createElement('canvas');
  resizedDepthCanvas.width = W;
  resizedDepthCanvas.height = H;
  const rdc = resizedDepthCanvas.getContext('2d')!;
  // rdc.drawImage(depthCanvas, 0, 0, depthW, depthH, 0, 0, W, H); // OLD
  rdc.drawImage(depthCanvas, dFit.offsetX, dFit.offsetY, dFit.newW, dFit.newH, 0, 0, W, H);
  const rd = rdc.getImageData(0, 0, W, H).data;
  const depthFloat = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) depthFloat[i] = rd[i * 4] / 255.0;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = alphaW;
  alphaCanvas.height = alphaH;
  const alphaCtx = alphaCanvas.getContext('2d')!;
  const alphaImgData = alphaCtx.createImageData(alphaW, alphaH);
  for (let i = 0; i < alphaArr.length; i++) {
    const v = Math.round(255 * alphaArr[i]);
    const idx = i * 4;
    alphaImgData.data[idx] = v;
    alphaImgData.data[idx + 1] = v;
    alphaImgData.data[idx + 2] = v;
    alphaImgData.data[idx + 3] = 255;
  }
  alphaCtx.putImageData(alphaImgData, 0, 0);

  // FIX: Crop valid region from Alpha map before resizing
  const aFit = getFitInfo(W, H, alphaW, alphaH);
  const resizedAlphaCanvas = document.createElement('canvas');
  resizedAlphaCanvas.width = W;
  resizedAlphaCanvas.height = H;
  const rac = resizedAlphaCanvas.getContext('2d')!;
  rac.imageSmoothingEnabled = true;
  // rac.drawImage(alphaCanvas, 0, 0, alphaW, alphaH, 0, 0, W, H); // OLD
  rac.drawImage(alphaCanvas, aFit.offsetX, aFit.offsetY, aFit.newW, aFit.newH, 0, 0, W, H);
  const ra = rac.getImageData(0, 0, W, H).data;
  const alphaFloat = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) alphaFloat[i] = ra[i * 4] / 255.0;

  const floatData = new Float32Array(1 * 5 * W * H);
  let p = 0;
  for (let c = 0; c < 3; c++) {
    const offset = c * W * H;
    for (let i = 0; i < W * H; i++) floatData[p++] = rgbCHW[offset + i];
  }
  for (let i = 0; i < W * H; i++) floatData[p++] = depthFloat[i];
  for (let i = 0; i < W * H; i++) floatData[p++] = alphaFloat[i];

  return new ort.Tensor('float32', floatData, [1, 5, H, W]);
}

function applyAlphaToImage(img: HTMLImageElement, alphaFloatArr: Float32Array, alphaW: number, alphaH: number): string {
  const W = img.width, H = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = alphaW;
  alphaCanvas.height = alphaH;
  const aCtx = alphaCanvas.getContext('2d')!;
  const aImgData = aCtx.createImageData(alphaW, alphaH);
  for (let i = 0; i < alphaFloatArr.length; i++) {
    const v = Math.round(255 * Math.min(1, Math.max(0, alphaFloatArr[i])));
    const idx = i * 4;
    aImgData.data[idx] = v;
    aImgData.data[idx + 1] = v;
    aImgData.data[idx + 2] = v;
    aImgData.data[idx + 3] = 255;
  }
  aCtx.putImageData(aImgData, 0, 0);

  const resizedAlphaCanvas = document.createElement('canvas');
  resizedAlphaCanvas.width = W;
  resizedAlphaCanvas.height = H;
  const rac = resizedAlphaCanvas.getContext('2d')!;
  rac.imageSmoothingEnabled = true;
  rac.drawImage(alphaCanvas, 0, 0, alphaW, alphaH, 0, 0, W, H);
  const ra = rac.getImageData(0, 0, W, H).data;

  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 4) {
    imageData.data[i + 3] = ra[j];
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// --- Main Pipeline ---

export const removeBackgroundLocal = async (
  imageFile: File,
  settings: { threshold: number; opacityBoost: number; expand: number } = { threshold: 0.5, opacityBoost: 1.0, expand: 0 },
  onProgress?: (message: string, percent: number) => void
): Promise<string> => {
  try {
    onProgress?.('Initializing...', 0);
    const img = await fileToImage(imageFile);
    console.log('Image loaded', img.width, img.height);

    // 1) Depth
    onProgress?.('Processing Depth...', 10);
    const depthSess = await initDepthSession();
    const { tensor: depthInputTensor } = preprocessDepth(img);
    const depthFeeds: Record<string, ort.Tensor> = {};
    depthFeeds[depthSess.inputNames[0]] = depthInputTensor;
    const depthOut = await depthSess.run(depthFeeds);
    const depthTensor = getFirstOutputTensor(depthOut);
    console.log('Depth tensor dims', depthTensor.dims);

    const depthDims = depthTensor.dims;
    const dW = depthDims[depthDims.length - 1];
    const dH = depthDims[depthDims.length - 2];
    const depthFlatten = new Float32Array(dW * dH);
    for (let i = 0; i < Math.min(depthTensor.data.length, dW * dH); i++) {
      depthFlatten[i] = depthTensor.data[i] as number;
    }

    // 2) Matting
    onProgress?.('Processing Matting...', 40);
    const mattingSess = await initMattingSession();
    const mattingInputTensor = preprocessMatting(img, depthFlatten, dW, dH);
    const matFeeds: Record<string, ort.Tensor> = {};
    matFeeds[mattingSess.inputNames[0]] = mattingInputTensor;
    const matOut = await mattingSess.run(matFeeds);
    const alphaTensor1 = getFirstOutputTensor(matOut);
    console.log('Matting alpha dims', alphaTensor1.dims);

    const alpha1Dims = alphaTensor1.dims;
    const aW = alpha1Dims[alpha1Dims.length - 1];
    const aH = alpha1Dims[alpha1Dims.length - 2];
    const alphaFlatten = new Float32Array(aW * aH);
    for (let i = 0; i < Math.min(alphaFlatten.length, alphaTensor1.data.length); i++) {
      alphaFlatten[i] = alphaTensor1.data[i] as number;
    }

    // 3) Refiner
    onProgress?.('Refining Edges...', 70);
    const refinerSess = await initRefinerSession();
    const refinerInputTensor = preprocessRefiner(img, depthFlatten, dW, dH, alphaFlatten, aW, aH);
    const refFeeds: Record<string, ort.Tensor> = {};
    refFeeds[refinerSess.inputNames[0]] = refinerInputTensor;
    const refOut = await refinerSess.run(refFeeds);
    const alphaTensor2 = getFirstOutputTensor(refOut);
    console.log('Refiner alpha dims', alphaTensor2.dims);

    const a2W = alphaTensor2.dims[alphaTensor2.dims.length - 1];
    const a2H = alphaTensor2.dims[alphaTensor2.dims.length - 2];
    const alpha2 = new Float32Array(a2W * a2H);
    for (let i = 0; i < Math.min(alpha2.length, alphaTensor2.data.length); i++) {
      alpha2[i] = alphaTensor2.data[i] as number;
    }

    // 4) Post-Process (Threshold, Expansion, Opacity)
    onProgress?.('Finalizing...', 90);
    // alpha2 is modified or replaced
    const finalAlpha = postProcessAlpha(alpha2, a2W, a2H, settings);

    // 5) Composite
    const resultDataUrl = applyAlphaToImage(img, finalAlpha, a2W, a2H);
    console.log('=== Snap pipeline complete ===');
    onProgress?.('Done', 100);
    return resultDataUrl;

  } catch (e) {
    console.error('Snap pipeline error', e);
    throw e;
  }
};

export const isWebGPUAvailable = async (): Promise<boolean> => {
  if (!(navigator as any).gpu) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
};