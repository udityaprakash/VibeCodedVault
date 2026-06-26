import type { AIAgentSettings, Prompt, Category } from '../types';
import { resolveModelForProvider, AI_MODEL_OPTIONS } from './aiModels';
const RETRYABLE_GEMINI_ERROR_PATTERNS = [
  'high demand',
  'resource exhausted',
  'overloaded',
  'try again later',
  'quota',
  'rate limit',
  'temporarily unavailable'
];

export interface AgentContext {
  prompts: Prompt[];
  categories: Category[];
  themeMode: 'light' | 'dark';
  accentColor: string;
  onSearchPrompts: (query: string) => Prompt[];
  onCreatePrompt: (prompt: Partial<Prompt> & { title: string; content: string }) => Promise<void>;
  onDeletePrompt: (id: string) => Promise<void>;
  onCreateCategory: (category: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSetTheme: (mode: 'light' | 'dark', accentColor?: string) => void;
}

// Transform the generic schema to Gemini function declarations (uppercase types)
function getGeminiTools() {
  return [
    {
      name: 'list_prompts',
      description: 'Get all prompt templates currently stored in PromptVault.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'search_prompts',
      description: 'Find prompts matching a search query using text search.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Search query' }
        },
        required: ['query']
      }
    },
    {
      name: 'create_prompt',
      description: 'Create a new prompt template.',
      parameters: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          content: { type: 'STRING' },
          model: { type: 'STRING', description: 'Target AI Model compatibility tag (e.g. Claude 3.5, Gemini 1.5)' },
          tags: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tags list' },
          categoryId: { type: 'STRING', description: 'Optional category ID' }
        },
        required: ['title', 'description', 'content']
      }
    },
    {
      name: 'delete_prompt',
      description: 'Delete a prompt template by ID, moving it to the Recycle Bin.',
      parameters: {
        type: 'OBJECT',
        properties: {
          promptId: { type: 'STRING' }
        },
        required: ['promptId']
      }
    },
    {
      name: 'list_categories',
      description: 'Get all categories.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'create_category',
      description: 'Create a new category in the database.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          color: { type: 'STRING', description: 'Hex color code' },
          icon: { type: 'STRING', description: 'Preset icon name (e.g. Code, Image, Zap, Target)' }
        },
        required: ['name']
      }
    },
    {
      name: 'delete_category',
      description: 'Delete a category by ID.',
      parameters: {
        type: 'OBJECT',
        properties: {
          categoryId: { type: 'STRING' }
        },
        required: ['categoryId']
      }
    },
    {
      name: 'set_theme',
      description: 'Change the theme mode (light/dark) or accent color of the desktop application.',
      parameters: {
        type: 'OBJECT',
        properties: {
          mode: { type: 'STRING', enum: ['light', 'dark'] },
          accentColor: { type: 'STRING', description: 'Hex color code' }
        }
      }
    }
  ];
}

// Transform the generic schema to OpenAI tools format (lowercase types, wrapped in type: 'function')
function getOpenAITools() {
  const gemini = getGeminiTools();
  return gemini.map(tool => {
    // Deep clone parameters and map types to lowercase
    const cloneParams = JSON.parse(JSON.stringify(tool.parameters));
    const lowercaseTypes = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      if (typeof obj.type === 'string') {
        obj.type = obj.type.toLowerCase();
      }
      if (obj.properties) {
        Object.keys(obj.properties).forEach(k => lowercaseTypes(obj.properties[k]));
      }
      if (obj.items) {
        lowercaseTypes(obj.items);
      }
    };
    lowercaseTypes(cloneParams);

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: cloneParams
      }
    };
  });
}

function isRetryableGeminiError(status: number, errorText: string) {
  if (status === 429 || status === 503 || status === 404) {
    return true;
  }

  const normalizedError = errorText.toLowerCase();
  if (normalizedError.includes('not found') || normalizedError.includes('model')) {
    return true;
  }

  return RETRYABLE_GEMINI_ERROR_PATTERNS.some(pattern => normalizedError.includes(pattern));
}

function isOpenAiRetryableError(status: number, errorText: string) {
  if (status === 429 || status === 503 || status === 404) {
    return true;
  }

  const normalizedError = errorText.toLowerCase();
  if (
    normalizedError.includes('not found') ||
    normalizedError.includes('model') ||
    normalizedError.includes('does not exist')
  ) {
    return true;
  }

  return false;
}

async function callGeminiModel(model: string, apiKey: string, contents: any[]) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        tools: [{ functionDeclarations: getGeminiTools() }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );
}

const SYSTEM_PROMPT = `You are PromptVault Assistant, an agentic AI built inside a desktop app for managing AI prompts.
You can execute tasks directly on the application by calling tools.
Always use your tools to perform the actions requested by the user.

CRITICAL RULES:
1. If the user request is ambiguous (e.g. "delete coding prompt" but there are multiple coding prompts, or "change category" without specifying details), DO NOT call any tool. Instead, ask the user a clarifying question to resolve the ambiguity.
2. If the user asks you to perform an action (e.g., search, delete, update theme, create category), explain which tools you are using to do it.
3. Be brief, helpful, and professional in your final response.
4. When deleting or searching, you will be operating on the current prompts and categories database.
5. All operations are local-first.
`;

export async function runAgentCycle(
  history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string }>,
  settings: AIAgentSettings,
  context: AgentContext,
  onToolLog: (log: { name: string; args: any; status: 'running' | 'success' | 'error'; result?: string }) => void
): Promise<{ text: string; nextHistory: typeof history }> {
  
  if (!settings.apiKey) {
    return { text: 'AI Agent is disabled or API Key is missing. Please configure it in Settings.', nextHistory: history };
  }

  const activeHistory = [...history];

  if (settings.provider === 'gemini') {
    // --- GEMINI FLOW ---
    try {
      // Map history to Gemini format
      const contents: any[] = [];
      activeHistory.forEach(msg => {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant') {
          // Check if there was tool calls
          if (msg.name) {
            // This was a tool call response object
            contents[contents.length - 1].parts.push({
              functionCall: { name: msg.name, args: JSON.parse(msg.content) }
            });
          } else {
            contents.push({ role: 'model', parts: [{ text: msg.content }] });
          }
        } else if (msg.role === 'tool') {
          let parsedResponse = JSON.parse(msg.content);
          if (Array.isArray(parsedResponse) || typeof parsedResponse !== 'object' || parsedResponse === null) {
            parsedResponse = { result: parsedResponse };
          }
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: msg.name,
                response: parsedResponse
              }
            }]
          });
        }
      });

      const resolvedModel = resolveModelForProvider('gemini', settings.model);
      const candidates = [resolvedModel, ...AI_MODEL_OPTIONS.gemini.filter(m => m !== resolvedModel)];

      let response: Response | null = null;
      let lastErrorText = '';

      for (let index = 0; index < candidates.length; index += 1) {
        const model = candidates[index];
        response = await callGeminiModel(model, settings.apiKey, contents);

        if (response.ok) {
          break;
        }

        lastErrorText = await response.text();
        if (!isRetryableGeminiError(response.status, lastErrorText) || index === candidates.length - 1) {
          throw new Error(`Gemini API Error (${model}): ${response.status} - ${lastErrorText}`);
        }

        console.warn(`Gemini model ${model} failed, retrying with fallback model.`);
      }

      if (!response) {
        throw new Error('Gemini API Error: No response received.');
      }

      const data = await response.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];

      if (!part) {
        return { text: 'I received an empty response from Gemini.', nextHistory: activeHistory };
      }

      // Check for function calls
      if (part.functionCall) {
        const { name, args } = part.functionCall;
        onToolLog({ name, args, status: 'running' });

        // Execute tool
        let toolResult: any;
        try {
          toolResult = await executeTool(name, args, context);
          onToolLog({ name, args, status: 'success', result: JSON.stringify(toolResult) });
        } catch (err: any) {
          onToolLog({ name, args, status: 'error', result: err.message });
          toolResult = { error: err.message };
        }

        // Add model's tool call and the tool's response to history
        activeHistory.push({
          role: 'assistant',
          content: JSON.stringify(args),
          name: name
        });
        activeHistory.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          name: name
        });

        // Recurse to let the model finalize
        return runAgentCycle(activeHistory, settings, context, onToolLog);
      }

      // Return text response
      const text = part.text || 'I completed the action successfully.';
      activeHistory.push({ role: 'assistant', content: text });
      return { text, nextHistory: activeHistory };

    } catch (err: any) {
      console.error(err);
      return { text: `Error calling Gemini: ${err.message}`, nextHistory: activeHistory };
    }

  } else {
    // --- OPENAI FLOW ---
    try {
      const messages = activeHistory.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.tool_call_id
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        };
      });

      // Insert system prompt at the top
      messages.unshift({ role: 'system', content: SYSTEM_PROMPT } as any);

      const resolvedModel = resolveModelForProvider('openai', settings.model);
      const candidates = [resolvedModel, ...AI_MODEL_OPTIONS.openai.filter(m => m !== resolvedModel)];

      let response: Response | null = null;
      let lastErrorText = '';

      for (let index = 0; index < candidates.length; index += 1) {
        const model = candidates[index];
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            tools: getOpenAITools(),
            temperature: 0.1
          })
        });

        if (response.ok) {
          break;
        }

        lastErrorText = await response.text();
        const isRetryable = isOpenAiRetryableError(response.status, lastErrorText);
        if (!isRetryable || index === candidates.length - 1) {
          throw new Error(`OpenAI API Error (${model}): ${response.status} - ${lastErrorText}`);
        }

        console.warn(`OpenAI model ${model} failed, retrying with fallback model.`);
      }

      if (!response) {
        throw new Error('OpenAI API Error: No response received.');
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const responseMessage = choice?.message;

      if (!responseMessage) {
        return { text: 'Received empty response from OpenAI.', nextHistory: activeHistory };
      }

      // Check for tool calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const { name, arguments: rawArgs } = toolCall.function;
        const args = JSON.parse(rawArgs);

        onToolLog({ name, args, status: 'running' });

        let toolResult: any;
        try {
          toolResult = await executeTool(name, args, context);
          onToolLog({ name, args, status: 'success', result: JSON.stringify(toolResult) });
        } catch (err: any) {
          onToolLog({ name, args, status: 'error', result: err.message });
          toolResult = { error: err.message };
        }

        // Add assistant's tool call message
        activeHistory.push({
          role: 'assistant',
          content: responseMessage.content || '',
          name: name,
          tool_call_id: toolCall.id
        });

        // Add tool response
        activeHistory.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          name: name,
          tool_call_id: toolCall.id
        });

        // Recurse
        return runAgentCycle(activeHistory, settings, context, onToolLog);
      }

      const text = responseMessage.content || 'I completed the action successfully.';
      activeHistory.push({ role: 'assistant', content: text });
      return { text, nextHistory: activeHistory };

    } catch (err: any) {
      console.error(err);
      return { text: `Error calling OpenAI: ${err.message}`, nextHistory: activeHistory };
    }
  }
}

async function executeTool(name: string, args: any, context: AgentContext): Promise<any> {
  console.log(`Executing tool: ${name}`, args);
  switch (name) {
    case 'list_prompts':
      return context.prompts;

    case 'search_prompts': {
      const results = context.onSearchPrompts(args.query);
      return results;
    }

    case 'create_prompt': {
      await context.onCreatePrompt({
        title: args.title,
        description: args.description,
        content: args.content,
        model: args.model || 'General',
        tags: args.tags || [],
        categoryId: args.categoryId || null
      });
      return { success: true };
    }

    case 'delete_prompt': {
      await context.onDeletePrompt(args.promptId);
      return { success: true };
    }

    case 'list_categories':
      return context.categories;

    case 'create_category': {
      await context.onCreateCategory({
        name: args.name,
        color: args.color || '#8B5CF6',
        icon: args.icon || 'Zap'
      });
      return { success: true };
    }

    case 'delete_category': {
      await context.onDeleteCategory(args.categoryId);
      return { success: true };
    }

    case 'set_theme': {
      context.onSetTheme(args.mode, args.accentColor);
      return { success: true };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
