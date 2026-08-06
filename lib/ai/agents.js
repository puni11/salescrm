import ai from "./providers/gemini";
import { tools } from "./tools/toolRegistry";
import { SYSTEM_PROMPT } from "./prompts/prompts";
import { executeTool } from "./tools/executeTool";
export async function runAgent(message) {
  try {
    const response = await ai.models.generateContent({
  model: "Gemini 2.5 Flash Lite",

  contents: `
${SYSTEM_PROMPT}

User:
${message}
`,

  config: {
    tools,
  },
});
const functionCall =
  response.candidates?.[0]?.content?.parts?.find(
    (part) => part.functionCall
  )?.functionCall;

if (functionCall) {
  const toolResult = await executeTool(functionCall);

  const finalResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",

    contents: `
${SYSTEM_PROMPT}

The user asked:

${message}

The CRM tool returned this data:

${JSON.stringify(toolResult, null, 2)}

Using ONLY this data, answer the user naturally.

Do not invent information.
If the tool returned nothing, tell the user politely.
`,
  });

  return finalResponse.text;
}
    return response.text;
  } catch (error) {
    console.error(error);
    throw error;
  }
}