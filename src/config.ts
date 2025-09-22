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

export type AppConfig = {
  system: SystemConfig;
  generator: GeneratorConfig;
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
};

export default config;


