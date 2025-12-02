import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, Role } from "../types";

// Initialize the API client
// Use Vite's import.meta.env for environment variables
// Using optional chaining to prevent crashes in environments where import.meta.env might be undefined
const apiKey = import.meta.env?.VITE_API_KEY;

if (!apiKey) {
  console.warn("Missing VITE_API_KEY. For local dev, check your .env file. For Netlify, check Site Settings > Environment Variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

/**
 * Prepares the conversation history for the API.
 */
const formatHistory = (messages: Message[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text } as Part],
  }));
};

/**
 * Sends a message to the Gemini model with system instruction and context.
 */
export const sendMessageToGemini = async (
  currentMessage: string,
  history: Message[],
  systemInstruction: string,
  knowledgeBaseContext: string,
  modelName: string
): Promise<string> => {
  try {
    if (!apiKey) {
      return "Configuration Error: API Key is missing.\n\n1. **Local:** Create a `.env` file with `VITE_API_KEY=your_key`.\n2. **Netlify:** Go to Site Settings > Environment Variables and add `VITE_API_KEY`.";
    }

    // We inject the knowledge base context into the system instruction
    // This effectively grounds the model with the provided data.
    const effectiveSystemInstruction = `
${systemInstruction}

---
ATTACHED KNOWLEDGE BASE (Use this to answer questions):
${knowledgeBaseContext}
---
`;

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: effectiveSystemInstruction,
        temperature: 0.4, // Lower temperature for more factual responses based on docs
      },
      history: formatHistory(history),
    });

    const result = await chat.sendMessage({
      message: currentMessage,
    });

    return result.text || "I processed the request but received no text response.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Nice error handling for 400s (often API key issues or quotas)
    if (error.toString().includes("400") || error.toString().includes("API key")) {
         throw new Error("API Key Invalid or Quota Exceeded. Please check your Google AI Studio key.");
    }
    
    throw new Error(
      error.message || "Failed to communicate with the AI agent."
    );
  }
};
