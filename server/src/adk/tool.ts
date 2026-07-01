import { z } from 'zod';

export class FunctionTool<T extends z.ZodTypeAny = z.ZodTypeAny> {
  public name: string;
  public description: string;
  public parameters: T;
  public execute: (args: z.infer<T>) => any | Promise<any>;

  constructor(options: {
    name: string;
    description: string;
    parameters: T;
    execute: (args: z.infer<T>) => any | Promise<any>;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters;
    this.execute = options.execute;
  }

  public validateAndExecute(input: unknown) {
    const parsed = this.parameters.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Invalid arguments for tool ${this.name}: ${parsed.error.message}`);
    }
    return this.execute(parsed.data);
  }
}
