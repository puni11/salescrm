import { registry } from "./registry";

const currentUser = {
  id: 1,
  name: "Puneet",

  permissions: [
    "lead.read",
    "dashboard.read",
  ],
};

export async function executeTool(functionCall, context) {
  const tool = registry[functionCall.name];

  if (!tool) {
    throw new Error(`Tool "${functionCall.name}" not found.`);
  }

  // Permission Check
  if (!currentUser.permissions.includes(tool.permission)) {
    throw new Error("Permission Denied");
  }

  return await tool.execute(functionCall.args || {} , context);
}