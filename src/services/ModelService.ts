import { fetch } from "@tauri-apps/plugin-http";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface OllamaModelResponse {
  models: {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
      parent_model: string;
      format: string;
      family: string;
      families: string[];
      parameter_size: string;
      quantization_level: string;
    };
  }[];
}

export interface IModelService {
  listModels(): Promise<ModelInfo[]>;
  generateResponse(
    conversationHistory: Array<{ role: string; content: string }>,
    modelId: string,
  ): Promise<string>;
  generateCompletion(
    prompt: string,
    modelId: string,
    options?: { maxTokens?: number },
  ): Promise<string>;
}

/**
 * Generate random gibberish text for mock responses
 */
function generateGibberish(): string {
  const words = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
    "enim",
    "ad",
    "minim",
    "veniam",
    "quis",
    "nostrud",
    "exercitation",
    "ullamco",
    "laboris",
    "nisi",
    "ut",
    "aliquip",
    "ex",
    "ea",
    "commodo",
    "consequat",
    "duis",
    "aute",
    "irure",
    "reprehenderit",
    "voluptate",
    "velit",
    "esse",
    "cillum",
    "fugiat",
    "nulla",
    "pariatur",
    "excepteur",
    "sint",
    "occaecat",
    "cupidatat",
    "proident",
    "sunt",
    "culpa",
    "qui",
    "officia",
    "deserunt",
    "mollit",
    "anim",
    "id",
    "est",
    "laborum",
  ];

  const sentenceCount = Math.floor(Math.random() * 3) + 2;
  const sentences: string[] = [];

  for (let i = 0; i < sentenceCount; i++) {
    const wordCount = Math.floor(Math.random() * 10) + 5;
    const sentenceWords: string[] = [];
    for (let j = 0; j < wordCount; j++) {
      sentenceWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    // Capitalize first word
    sentenceWords[0] = sentenceWords[0].charAt(0).toUpperCase() +
      sentenceWords[0].slice(1);
    sentences.push(sentenceWords.join(" ") + ".");
  }

  return sentences.join(" ");
}

/**
 * Service to handle model interactions, supporting both Mock and Ollama providers.
 */
export class CombinedModelService implements IModelService {
  private readonly OLLAMA_BASE_URL = "http://localhost:11434";

  async listModels(): Promise<ModelInfo[]> {
    const mockModels: ModelInfo[] = [
      { id: "mock-gpt-4", name: "Mock GPT-4", provider: "Mock" },
      { id: "mock-claude", name: "Mock Claude", provider: "Mock" },
      { id: "mock-gemini", name: "Mock Gemini", provider: "Mock" },
    ];

    try {
      const ollamaModels = await this.fetchOllamaModels();
      return [...mockModels, ...ollamaModels];
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      // Return mock models even if Ollama fails
      return mockModels;
    }
  }

  private async fetchOllamaModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      const data = await response.json() as OllamaModelResponse;
      return data.models.map((m) => ({
        id: `ollama-${m.name}`, // Prefix to distinguish
        name: m.name,
        provider: "Ollama",
        // Keep raw model name for API calls if needed, but for now we'll strip prefix when calling
      }));
    } catch (error) {
      console.warn("Ollama is likely not running or unreachable.", error);
      return [];
    }
  }

  async generateResponse(
    conversationHistory: Array<{ role: string; content: string }>,
    modelId: string,
  ): Promise<string> {
    if (modelId.startsWith("ollama-")) {
      const realModelName = modelId.replace("ollama-", "");
      return this.generateOllamaResponse(conversationHistory, realModelName);
    } else {
      // Mock response
      return generateGibberish();
    }
  }

  private async generateOllamaResponse(
    conversationHistory: Array<{ role: string; content: string }>,
    modelName: string,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: conversationHistory,
          stream: false, // For now, non-streaming
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any; // Typing the full response might be overkill for now
      return data.message?.content || "";
    } catch (error: any) {
      console.error("Ollama generation failed:", error);
      return `Error communicating with Ollama: ${error.message}`;
    }
  }

  async generateCompletion(
    prompt: string,
    modelId: string,
    options?: { maxTokens?: number },
  ): Promise<string> {
    if (modelId.startsWith("ollama-")) {
      const realModelName = modelId.replace("ollama-", "");
      return this.generateOllamaCompletion(prompt, realModelName, options);
    } else {
      // Mock response
      return generateGibberish();
    }
  }

  private async generateOllamaCompletion(
    prompt: string,
    modelName: string,
    options?: { maxTokens?: number },
  ): Promise<string> {
    try {
      const body: any = {
        model: modelName,
        prompt: prompt,
        stream: false,
      };

      if (options?.maxTokens) {
        body.options = {
          num_predict: options.maxTokens,
        };
      }

      const response = await fetch(`${this.OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.response || "";
    } catch (error: any) {
      console.error("Ollama completion failed:", error);
      return `Error communicating with Ollama: ${error.message}`;
    }
  }
}

export const modelService = new CombinedModelService();
