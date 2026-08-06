import { getProvider } from "../providers";
import { tools } from "../tools/toolRegistry";
import { SYSTEM_PROMPT } from "../prompts/prompts";
import { executeTool } from "../tools/executeTool";

export async function runLoop({ message, context }) {
  const ai = getProvider();

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: message,
    },
  ];

  let iterations = 0;

  while (iterations < 10) {
    iterations++;

    const response = await ai.generate({
      messages,
      tools,
    });

    const assistant = response.choices[0].message;

    // No tool call = final answer
    if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
      return assistant.content;
    }

    // Save assistant message
    messages.push(assistant);

    // Execute every tool Gemini/OpenRouter requested
    for (const toolCall of assistant.tool_calls) {
      console.log("Calling Tool:", toolCall.function.name);

      const result = await executeTool(
  {
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments || "{}"),
  },
  context
);

      console.log(result);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("Maximum tool iterations exceeded.");
}