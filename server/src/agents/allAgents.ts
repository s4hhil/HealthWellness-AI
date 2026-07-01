import { z } from 'zod';
import { FunctionTool } from '../adk/tool.js';
import { LlmAgent } from '../adk/agent.js';

// --- Zod Parameter Schemas for Security ---
export const CyclePredictionSchema = z.object({
  lastPeriodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  cycleLength: z.number().min(21).max(45).default(28),
  symptoms: z.array(z.string()).default([]),
  mood: z.string().default('neutral')
});

export const HabitLogSchema = z.object({
  habitName: z.string().min(2, 'Habit name too short'),
  value: z.number().nonnegative(),
  target: z.number().positive()
});

export const SleepLogSchema = z.object({
  hours: z.number().min(0).max(24),
  quality: z.number().min(0).max(100)
});

export const MedicalRecordSchema = z.object({
  fileName: z.string().regex(/^[a-zA-Z0-9_\-\.\s]+$/, 'Dangerous characters detected in file name'),
  fileContent: z.string(), // Base64 or plain metadata
  category: z.enum(['lab_result', 'prescription', 'summary', 'vaccine', 'other'])
});

export const NutritionSchema = z.object({
  calorieTarget: z.number().min(1000).max(10000),
  dietPreference: z.enum(['balanced', 'keto', 'vegan', 'vegetarian', 'paleo', 'low-carb'])
});

export const MentalWellnessSchema = z.object({
  moodScore: z.number().min(1).max(10), // 1 is very low, 10 is excellent
  stressLevel: z.number().min(1).max(10),
  notes: z.string().max(500).default('')
});

// --- Function Tools Definition ---

// 1. Women's Wellness Tool: Cycle Predictor
export const predictCycleTool = new FunctionTool({
  name: 'predict_cycle',
  description: 'Predicts the next period date, fertile window, and recommends wellness actions.',
  parameters: CyclePredictionSchema,
  execute: (args) => {
    const lastDate = new Date(args.lastPeriodDate);
    
    // Calculate predicted period (add cycleLength days)
    const nextPeriod = new Date(lastDate);
    nextPeriod.setDate(lastDate.getDate() + args.cycleLength);
    
    // Calculate fertile window (mid cycle, typical ovulation is cycleLength - 14)
    const ovulationDayOffset = args.cycleLength - 14;
    const ovulationDate = new Date(lastDate);
    ovulationDate.setDate(lastDate.getDate() + ovulationDayOffset);
    
    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(ovulationDate.getDate() - 5);
    
    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(ovulationDate.getDate() + 1);

    // Provide tailored tips based on symptoms
    const recs: string[] = ['Stay hydrated', 'Keep tracking cycle phases'];
    if (args.symptoms.includes('cramps')) {
      recs.push('Apply warm compress and practice light stretching.');
    }
    if (args.symptoms.includes('fatigue')) {
      recs.push('Prioritize 8+ hours of sleep and increase iron/magnesium intake.');
    }
    if (args.mood === 'anxious' || args.mood === 'irritable') {
      recs.push('Engage in 10 minutes of guided breathing or meditation.');
    }

    return {
      predictedStart: nextPeriod.toISOString().split('T')[0],
      ovulationDate: ovulationDate.toISOString().split('T')[0],
      fertileWindow: {
        start: fertileStart.toISOString().split('T')[0],
        end: fertileEnd.toISOString().split('T')[0]
      },
      recommendations: recs
    };
  }
});

// 2. Habit Tracker Tool
export const logHabitTool = new FunctionTool({
  name: 'log_habit',
  description: 'Log progress towards a specific health or wellness habit.',
  parameters: HabitLogSchema,
  execute: (args) => {
    return {
      status: 'success',
      habit: args.habitName,
      value: args.value,
      target: args.target,
      completed: args.value >= args.target,
      loggedAt: new Date().toISOString()
    };
  }
});

// 3. Sleep Tracker Tool
export const logSleepTool = new FunctionTool({
  name: 'log_sleep',
  description: 'Log sleep duration and quality metrics.',
  parameters: SleepLogSchema,
  execute: (args) => {
    // Determine quality description
    let status = 'Fair';
    if (args.quality >= 85) status = 'Excellent';
    else if (args.quality >= 70) status = 'Good';
    else if (args.quality < 50) status = 'Poor';

    return {
      status: 'success',
      hours: args.hours,
      efficiency: args.quality,
      qualityRating: status,
      loggedAt: new Date().toISOString()
    };
  }
});

// 4. Nutrition Tool
export const recommendNutritionTool = new FunctionTool({
  name: 'recommend_nutrition',
  description: 'Generate specific daily meal splits and tips based on targets and diets.',
  parameters: NutritionSchema,
  execute: (args) => {
    const cal = args.calorieTarget;
    let tip = 'Focus on complex carbohydrates, lean proteins, and unsaturated fats.';
    let macros = { carbs: '45%', protein: '25%', fats: '30%' };

    if (args.dietPreference === 'keto') {
      tip = 'Keep carbohydrate intake under 50g. Increase healthy fats like avocado and olive oil.';
      macros = { carbs: '5%', protein: '25%', fats: '70%' };
    } else if (args.dietPreference === 'vegan') {
      tip = 'Ensure adequate protein from legumes, tofu, and quinoa. Supplement Vitamin B12.';
      macros = { carbs: '50%', protein: '25%', fats: '25%' };
    } else if (args.dietPreference === 'low-carb') {
      tip = 'Replace processed carbohydrates with leafy greens and cruciferous vegetables.';
      macros = { carbs: '20%', protein: '35%', fats: '45%' };
    }

    return {
      calories: cal,
      diet: args.dietPreference,
      tip,
      macronutrients: macros
    };
  }
});

// 5. Medical Records Tool
export const validateRecordTool = new FunctionTool({
  name: 'validate_and_log_record',
  description: 'Validates structure and content of medical summaries to check for malicious script injections.',
  parameters: MedicalRecordSchema,
  execute: (args) => {
    // Perform simple validation for script tags or dangerous SQL commands
    const dangerousPattern = /<script|javascript:|select\s+.*\s+from|union\s+select/gi;
    if (dangerousPattern.test(args.fileContent) || dangerousPattern.test(args.fileName)) {
      throw new Error('Security Exception: Potential script injection or malicious content detected!');
    }

    return {
      status: 'verified',
      fileName: args.fileName,
      category: args.category,
      sanitizedSize: args.fileContent.length,
      parsedAt: new Date().toISOString()
    };
  }
});

// 6. Mental Wellness Tool
export const analyzeMoodTool = new FunctionTool({
  name: 'analyze_mood_correlation',
  description: 'Correlates mood and stress levels to suggest mental health actions.',
  parameters: MentalWellnessSchema,
  execute: (args) => {
    let exercise = '5-minute Box Breathing';
    let suggestion = 'Take a short break from screens and step outside.';

    if (args.stressLevel >= 7) {
      exercise = '10-minute progressive muscle relaxation';
      suggestion = 'Lower caffeine intake and try a guided mindfulness exercise.';
    } else if (args.moodScore <= 4) {
      exercise = 'Gratitude journaling';
      suggestion = 'Reach out to a friend or write down three things you are thankful for.';
    }

    return {
      moodScore: args.moodScore,
      stressLevel: args.stressLevel,
      recommendedExercise: exercise,
      tip: suggestion
    };
  }
});

// --- Instantiate the 10 Specialized Agents ---

export const personalHealthAssistant = new LlmAgent({
  name: 'Personal Health Assistant',
  description: 'Your primary assistant that coordinates overall physical health and lifestyle inquiries.',
  instruction: 'Act as a professional health advisor. Synthesize general wellness information and offer balanced guidance.',
  tools: [logHabitTool, logSleepTool]
});

export const wellnessCoach = new LlmAgent({
  name: 'Wellness Coach',
  description: 'Designed to construct healthy habits, workout schedules, and recovery tips.',
  instruction: 'Act as a personal trainer. Recommend functional fitness exercises, correct postures, and routine adjustments.',
  tools: [logHabitTool]
});

export const aiHealthCompanion = new LlmAgent({
  name: 'AI Health Companion',
  description: 'A empathetic companion providing daily motivation, empathetic listening, and gentle check-ins.',
  instruction: 'Act as an active listener. Support the user with supportive affirmations and stress-relief checks.',
  tools: []
});

export const habitTrackerAgent = new LlmAgent({
  name: 'Habit Tracker Agent',
  description: 'Specialized agent that tracks daily metrics like water, steps, and activity.',
  instruction: 'Monitor goals strictly. Calculate completion percentages and issue nudges to keep routines going.',
  tools: [logHabitTool]
});

export const sleepTrackerAgent = new LlmAgent({
  name: 'Sleep Tracker Agent',
  description: 'Analyzes sleep architecture, durations, efficiency, and sleep hygiene.',
  instruction: 'Provide custom recommendations to improve deep sleep cycles and circadian rhythm consistency.',
  tools: [logSleepTool]
});

export const medicalRecordsManager = new LlmAgent({
  name: 'Medical Records Manager',
  description: 'Manages health report metadata, categories, and validates documents securely.',
  instruction: 'Prioritize absolute privacy and security. Clean up inputs and flag any security vulnerabilities.',
  tools: [validateRecordTool]
});

export const nutritionAdvisor = new LlmAgent({
  name: 'Nutrition Advisor',
  description: 'Formulates meal splits, calorie intake targets, and checks nutritional deficiencies.',
  instruction: 'Analyze dietary requirements. Deliver meal tips and macro ratios suited to the user\'s needs.',
  tools: [recommendNutritionTool]
});

export const mentalWellnessAssistant = new LlmAgent({
  name: 'Mental Wellness Assistant',
  description: 'Focuses on mindfulness, stress mitigation, mood tracking, and cognitive breaks.',
  instruction: 'Support emotional wellbeing. Provide relaxation tools, breathing timers, and track mood correlations.',
  tools: [analyzeMoodTool]
});

export const productivityPlanner = new LlmAgent({
  name: 'Productivity Planner',
  description: 'Balances task completions with health breaks to maximize cognitive stamina.',
  instruction: 'Organize agendas. Integrate physical rest and eyes-off-screen pauses into the workflow schedule.',
  tools: []
});

// The Women's Wellness Module
export const womensWellnessModule = new LlmAgent({
  name: "Women's Wellness Module",
  description: 'Specialist for period prediction, symptom tracking, cycle phase analysis, and hormone harmony.',
  instruction: 'Provide evidence-based insights on menstrual phases (follicular, ovulation, luteal, menstrual), forecast next cycle dates, map symptom correlations, and recommend custom care tips.',
  tools: [predictCycleTool]
});

// Export all agents in a single array
export const allAgentsList = [
  personalHealthAssistant,
  wellnessCoach,
  aiHealthCompanion,
  habitTrackerAgent,
  sleepTrackerAgent,
  medicalRecordsManager,
  nutritionAdvisor,
  mentalWellnessAssistant,
  productivityPlanner,
  womensWellnessModule
];
