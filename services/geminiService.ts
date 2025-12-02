import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, Role } from "../types";

// Public fallback key provided by the user for global access
const GLOBAL_FALLBACK_KEY = "AIzaSyDPjffpWz4E7fgusOZxUm-pTLQXDhLtmzo";

// Initialize the API client
// 1. Try Vite environment variable (secure, local)
// 2. Fallback to global key (public, deployed demo)
const apiKey = import.meta.env?.VITE_API_KEY || GLOBAL_FALLBACK_KEY;

if (apiKey === GLOBAL_FALLBACK_KEY) {
  console.log("Using Global Public API Key.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

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