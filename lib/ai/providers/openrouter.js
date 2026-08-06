import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export default {
  async generate({ messages, tools }) {
    return await client.chat.completions.create({
      model: process.env.AI_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });
  },
};