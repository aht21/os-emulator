import { Ref, ref } from "vue";

export type SystemConfig = {
  totalMemory: Ref<number>;
  maxProcesses: Ref<number>; // макс. кол-во процессов (размер таблицы процессов)
};

type CpuConfig = {
  state: Ref<"IDLE" | "WORKING">;
  ticksPerSecond: Ref<number>;
  threadCount: Ref<number>; // кол-во одновременно выполняемых процессов
};

type GeneratorConfig = {
  minMemory: Ref<number>;
  maxMemory: Ref<number>;
  minInstructions: Ref<number>;
  maxInstructions: Ref<number>;
};

type SchedulerConfig = {
  quantum: Ref<number>; // квант времени (число тактов на одно назначение процесса)
  minPriority: Ref<number>;
  maxPriority: Ref<number>;
  basePriority: Ref<number>;
  agingStep: Ref<number>; // шаг «старения» приоритета для ожидающих процессов
  runPenaltyStep: Ref<number>; // штраф приоритета для выполнявшегося процесса при истечении кванта
  agingIntervalTicks: Ref<number>;
};

type CommandsConfig = {
  computeProb: Ref<number>; // вероятность вычислительной команды (COMPUTE)
  ioProb: Ref<number>; // вероятность I/O команды (IO)
  errorProb: Ref<number>; // вероятность ошибочной команды (ERROR)
  ioMinTime: Ref<number>; // минимальная длительность I/O (в тактах)
  ioMaxTime: Ref<number>; // максимальная длительность I/O (в тактах)
};

type SimulationConfig = {
  removeTerminatedAfterTicks: Ref<number>;
  generateProcessInterval: Ref<number>; // интервал генерации нового процесса для auto мода
};

export type AppConfig = {
  // Параметры симуляции
  simulation: {
    // Накладные расходы ОС для расчёта T_mono (в тактах)
    overheads?: {
      loadTicks: number; // загрузка процесса
      terminateTicks: number; // завершение процесса
      ctxReadyToActive: number; // переключение Готов -> Активен
      ctxActiveToReady: number; // переключение Активен -> Готов
      ctxActiveToBlocked: number; // переключение Активен -> Блокирован (I/O)
      ctxBlockedToReady: number; // переключение Блокирован -> Готов
      ioInitTicks: number; // логическая инициализация I/O
      ioInterruptServiceTicks: number; // обслуживание прерывания по окончанию I/O
    };
  };
};

const systemConfig: SystemConfig = {
  totalMemory: ref(256),
  maxProcesses: ref(32),
};

const cpuConfig: CpuConfig = {
  state: ref("IDLE"),
  ticksPerSecond: ref(10),
  threadCount: ref(2),
};

const generatorConfig: GeneratorConfig = {
  minMemory: ref(5),
  maxMemory: ref(20),
  minInstructions: ref(10),
  maxInstructions: ref(200),
};

const schedulerConfig: SchedulerConfig = {
  quantum: ref(4),
  minPriority: ref(1),
  maxPriority: ref(10),
  basePriority: ref(5),
  agingStep: ref(2),
  runPenaltyStep: ref(3),
  agingIntervalTicks: ref(3),
};

const commandsConfig: CommandsConfig = {
  computeProb: ref(0.9),
  ioProb: ref(0.05),
  errorProb: ref(0.05),
  ioMinTime: ref(1),
  ioMaxTime: ref(4),
};

const simulationConfig: SimulationConfig = {
  removeTerminatedAfterTicks: ref(10),
  generateProcessInterval: ref(100),
};

// Конфигурация по умолчанию для модели ОС

const config: AppConfig = {
  simulation: {
    overheads: {
      loadTicks: 2,
      terminateTicks: 1,
      ctxReadyToActive: 1,
      ctxActiveToReady: 1,
      ctxActiveToBlocked: 1,
      ctxBlockedToReady: 1,
      ioInitTicks: 1,
      ioInterruptServiceTicks: 1,
    },
  },
};

export default config;
export {
  systemConfig,
  cpuConfig,
  generatorConfig,
  schedulerConfig,
  commandsConfig,
  simulationConfig,
};
