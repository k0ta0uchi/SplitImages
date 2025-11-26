import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from "./imageService";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const removeBackgroundWithGemini = async (imageFile: File): Promise<string> => {
  try {
    const base64Data = await blobToBase64(imageFile);
    const mimeType = imageFile.type;

    // We use gemini-2.5-flash-image for editing tasks
    const modelId = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Remove the background from this image. Return the image with a transparent background. Keep the main subject intact."
          }
        ]
      },
      // Note: responseMimeType is not supported for nano banana series models (flash-image),
      // so we rely on the model to return an image part.
    });

    // Parse response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini");
    }

    const parts = candidates[0].content.parts;
    let outputImageBase64 = '';

    for (const part of parts) {
      if (part.inlineData) {
        outputImageBase64 = part.inlineData.data;
        // Construct standard Data URL
        return `data:image/png;base64,${outputImageBase64}`;
      }
    }

    throw new Error("No image data found in Gemini response");

  } catch (error) {
    console.error("Gemini Background Removal Error:", error);
    throw error;
  }
};