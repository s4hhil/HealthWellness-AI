import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { 
  predictCycleTool, 
  logHabitTool, 
  logSleepTool, 
  recommendNutritionTool, 
  validateRecordTool, 
  analyzeMoodTool 
} from './agents/allAgents.js';

// Create the core MCP Server instance
export const mcpServer = new McpServer({
  name: 'healthwellness-ai-mcp-server',
  version: '1.0.0',
});

// Helper to wrap tools into MCP format
const wrapMcpTool = (tool: any) => {
  mcpServer.tool(
    tool.name,
    tool.description,
    tool.parameters.shape,
    async (args: any) => {
      try {
        const result = await tool.validateAndExecute(args);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, data: result }, null, 2)
            }
          ]
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error.message })
            }
          ]
        };
      }
    }
  );
};

// Register all active agent tools onto the MCP server
wrapMcpTool(predictCycleTool);
wrapMcpTool(logHabitTool);
wrapMcpTool(logSleepTool);
wrapMcpTool(recommendNutritionTool);
wrapMcpTool(validateRecordTool);
wrapMcpTool(analyzeMoodTool);

console.error('[MCP Server] Initialized with 6 primary health tools.');
