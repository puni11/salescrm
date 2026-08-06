export function buildContext() {
  return {
    user: {},

    session: {
      selectedLead: null,

      lastSearch: [],

      lastTool: null,
    },
  };
}