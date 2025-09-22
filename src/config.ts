export type SystemConfig = {
  totalMemory: number;
  maxProcesses: number;
};

export type GeneratorConfig = {
  minMemory: number;
  maxMemory: number;
  minInstructions: number;
  maxInstructions: number;
};

export type SchedulerConfig = {
  quantum: number;
  minPriority: number;
  maxPriority: number;
  basePriority: number;
  agingStep: number;
  runPenaltyStep: number;
  agingIntervalTicks?: number;
};

export type AppConfig = {
  system: SystemConfig;
  generator: GeneratorConfig;
  scheduler: SchedulerConfig;
};

const config: AppConfig = {
  system: {
    totalMemory: 256,
    maxProcesses: 32,
  },
  generator: {
    minMemory: 5,
    maxMemory: 20,
    minInstructions: 10,
    maxInstructions: 200,
  },
  scheduler: {
    quantum: 5,
    minPriority: 1,
    maxPriority: 20,
    basePriority: 5,
    agingStep: 1,
    runPenaltyStep: 3,
    agingIntervalTicks: 5,
  },
};

export default config;


