import { LlmAgent, AgentRunResult } from './agent.js';

export interface WorkflowResult {
  query: string;
  routedAgent: string;
  thoughtTrace: string[];
  output: string;
  toolCalls: any[];
}

export class AgentWorkflow {
  private agents: Map<string, LlmAgent> = new Map();
  private routerAgent: LlmAgent;

  constructor(agentsList: LlmAgent[]) {
    agentsList.forEach(agent => {
      this.agents.set(agent.name.toLowerCase().replace(/\s+/g, '_'), agent);
    });

    // Create a default supervisor/router agent
    this.routerAgent = new LlmAgent({
      name: 'Central Health Router',
      description: 'Routes queries to the appropriate specialized health agent.',
      instruction: 'Analyze the query and determine the key specialized area (nutrition, sleep, women\'s wellness, habits, etc.) and route it.'
    });
  }

  public getAgent(name: string): LlmAgent | undefined {
    return this.agents.get(name.toLowerCase().replace(/\s+/g, '_'));
  }

  public async execute(query: string, context: any = {}): Promise<WorkflowResult> {
    const trace: string[] = [];
    trace.push(`[Workflow] Incoming query: "${query}"`);

    // Routing Logic
    let targetAgentKey = 'personal_health_assistant'; // default fallback
    const qLower = query.toLowerCase();

    if (qLower.includes('period') || qLower.includes('cycle') || qLower.includes('ovulation') || qLower.includes('symptom') || qLower.includes('pms') || qLower.includes('women')) {
      targetAgentKey = 'women\'s_wellness_module';
    } else if (qLower.includes('eat') || qLower.includes('food') || qLower.includes('nutrition') || qLower.includes('diet') || qLower.includes('meal') || qLower.includes('calorie')) {
      targetAgentKey = 'nutrition_advisor';
    } else if (qLower.includes('sleep') || qLower.includes('bedtime') || qLower.includes('insomnia') || qLower.includes('rest')) {
      targetAgentKey = 'sleep_tracker_agent';
    } else if (qLower.includes('habit') || qLower.includes('track') || qLower.includes('steps') || qLower.includes('water')) {
      targetAgentKey = 'habit_tracker_agent';
    } else if (qLower.includes('workout') || qLower.includes('exercise') || qLower.includes('fitness') || qLower.includes('coach')) {
      targetAgentKey = 'wellness_coach';
    } else if (qLower.includes('mood') || qLower.includes('mental') || qLower.includes('stress') || qLower.includes('anxious') || qLower.includes('depressed') || qLower.includes('breathe')) {
      targetAgentKey = 'mental_wellness_assistant';
    } else if (qLower.includes('record') || qLower.includes('medical') || qLower.includes('pdf') || qLower.includes('doctor') || qLower.includes('report')) {
      targetAgentKey = 'medical_records_manager';
    } else if (qLower.includes('todo') || qLower.includes('schedule') || qLower.includes('time') || qLower.includes('productivity') || qLower.includes('plan')) {
      targetAgentKey = 'productivity_planner';
    } else if (qLower.includes('companion') || qLower.includes('friend') || qLower.includes('chat')) {
      targetAgentKey = 'ai_health_companion';
    }

    trace.push(`[Workflow] Router evaluated query and directed workflow to agent: "${targetAgentKey}"`);

    const agent = this.agents.get(targetAgentKey);
    if (!agent) {
      trace.push(`[Workflow] Agent key "${targetAgentKey}" not found. Falling back to Personal Health Assistant.`);
      const fallbackAgent = this.agents.get('personal_health_assistant')!;
      const result = await fallbackAgent.run(query, context);
      return {
        query,
        routedAgent: fallbackAgent.name,
        thoughtTrace: [...trace, ...result.thoughtTrace],
        output: result.output,
        toolCalls: result.toolCalls
      };
    }

    const result = await agent.run(query, context);
    return {
      query,
      routedAgent: agent.name,
      thoughtTrace: [...trace, ...result.thoughtTrace],
      output: result.output,
      toolCalls: result.toolCalls
    };
  }
}
