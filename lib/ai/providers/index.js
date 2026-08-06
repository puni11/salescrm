import gemini from "./gemini";
import openrouter from "./openrouter";

export function getProvider() {
  switch (process.env.AI_PROVIDER) {
    case "openrouter":
      return openrouter;

    case "gemini":
    default:
      return gemini;
  }
}