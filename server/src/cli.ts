import { AgentWorkflow } from './adk/workflow.js';
import { allAgentsList } from './agents/allAgents.js';
import { SecurityValidator } from './security/validator.js';

const workflow = new AgentWorkflow(allAgentsList);

async function runCli() {
  const args = process.argv.slice(2);
  const agentIndex = args.indexOf('--agent');
  const queryIndex = args.indexOf('--query');

  if (agentIndex === -1 || queryIndex === -1 || !args[agentIndex + 1] || !args[queryIndex + 1]) {
    console.log(`
\x1b[35m=== HealthWellness AI Agent CLI ===\x1b[0m
Usage:
  npm run cli -- --agent <agent_key> --query "<query>"

Available Agent Keys:
  - personal_health_assistant
  - wellness_coach
  - ai_health_companion
  - habit_tracker_agent
  - sleep_tracker_agent
  - medical_records_manager
  - nutrition_advisor
  - mental_wellness_assistant
  - productivity_planner
  - women's_wellness_module

Example:
  npm run cli -- --agent nutrition_advisor --query "Suggest a balanced breakfast"
    `);
    process.exit(0);
  }

  const agentKey = args[agentIndex + 1];
  const rawQuery = args[queryIndex + 1];

  if (SecurityValidator.containsMaliciousPatterns(rawQuery)) {
    console.error('\x1b[31m[Security Error] Dangerous input pattern detected. Execution aborted.\x1b[0m');
    process.exit(1);
  }

  const query = SecurityValidator.sanitizeString(rawQuery);

  console.log(`\n\x1b[36m[CLI] Target Agent:\x1b[0m ${agentKey}`);
  console.log(`\x1b[36m[CLI] Sanitized Query:\x1b[0m "${query}"`);
  console.log(`\x1b[90m------------------------------------------------------------\x1b[0m`);

  const agent = workflow.getAgent(agentKey);
  if (!agent) {
    console.error(`\x1b[31m[Error] Agent with key "${agentKey}" not found.\x1b[0m`);
    process.exit(1);
  }

  try {
    const result = await agent.run(query);
    
    console.log(`\x1b[33m=== Agent Reasoning Path ===\x1b[0m`);
    result.thoughtTrace.forEach(line => console.log(`  \x1b[90m*\x1b[0m ${line}`));

    console.log(`\n\x1b[32m=== Agent Response ===\x1b[0m`);
    console.log(result.output);

    if (result.toolCalls.length > 0) {
      console.log(`\n\x1b[34m=== Tool Calls Invoked ===\x1b[0m`);
      result.toolCalls.forEach(tc => {
        console.log(`  - \x1b[1mTool:\x1b[0m ${tc.toolName}`);
        console.log(`    \x1b[1mArgs:\x1b[0m ${JSON.stringify(tc.arguments)}`);
        console.log(`    \x1b[1mResult:\x1b[0m ${JSON.stringify(tc.result)}`);
      });
    }
    console.log('');
  } catch (error: any) {
    console.error(`\x1b[31m[Runtime Error] ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

runCli();
