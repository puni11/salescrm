import { searchLead } from "@/tools/searchLead";

export const registry = {
  searchLead: {
    execute: searchLead,
    description: "Search CRM leads",
    permission: "lead.read",
  },
};