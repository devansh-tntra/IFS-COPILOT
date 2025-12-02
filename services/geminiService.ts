import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, Role } from "../types";

// Initialize the API client
// Note: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    throw new Error(
      error.message || "Failed to communicate with the AI agent."
    );
  }
};
