export const tools = [
  {
  type: "function",
  function: {
    name: "searchLead",
    description: "Search CRM leads by name, phone, email or lead ID",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Lead name, phone number, email address or CRM lead ID"
        }
      },
      required: ["query"]
    }
  }
}
];