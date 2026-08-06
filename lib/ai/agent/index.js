import { runLoop } from "./loop";

export async function runAgent({ message, context }) {
  return await runLoop({
    message,
    context,
  });
}