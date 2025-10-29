// Системные параметры
export type SystemConfig = {
  // Общий объём памяти (в словах)
  totalMemory: number;
  // Максимальное количество процессов в системе (размер таблицы PSW)
  maxProcesses: number;
};

// Параметры генерации заданий (диапазоны ресурсов)
export type GeneratorConfig = {
  // Минимальный размер памяти процесса (в словах)
  minMemory: number;
  // Максимальный размер памяти процесса (в словах)
  maxMemory: number;
  // Минимальное количество команд в задании
  minInstructions: number;
  // Максимальное количество команд в задании
  maxInstructions: number;
};

// Параметры планировщика (относительные приоритеты)
export type SchedulerConfig = {
  // Квант времени (число тактов на одно назначение процесса)
  quantum: number;
  // Минимальный приоритет
  minPriority: number;
  // Максимальный приоритет
  maxPriority: number;
  // Базовый приоритет новых процессов
  basePriority: number;
  // Шаг «старения» приоритета для ожидающих процессов
  agingStep: number;
  // Штраф приоритета для выполнявшегося процесса при истечении кванта
  runPenaltyStep: number;
  // Каждые сколько тиков применять «старение» (интервал)
  agingIntervalTicks?: number;
};

export type AppConfig = {
  system: SystemConfig;
  generator: GeneratorConfig;
  scheduler: SchedulerConfig;
  // Параметры команд и задержек ввода/вывода
  commands: {
    // Вероятность вычислительной команды (COMPUTE)
    computeProb: number;
    // Вероятность I/O команды (IO)
    ioProb: number;
    // Вероятность ошибочной команды (ERROR)
    errorProb: number;
    // Минимальная длительность I/O (в тактах)
    ioMinTime: number;
    // Максимальная длительность I/O (в тактах)
    ioMaxTime: number;
  };
  // Параметры симуляции
  simulation: {
    // Тактов симуляции в секунду
    ticksPerSecond: number;
    // Через сколько тиков удалять завершённые процессы из таблицы
    removeTerminatedAfterTicks: number;
    // Количество одновременно выполняемых процессов (потоков)
    threadCount: number;
  };
};

// Конфигурация по умолчанию для модели ОС
const config: AppConfig = {
  system: {
    totalMemory: 256, // общий объём памяти (слова)
    maxProcesses: 32, // размер таблицы PSW
  },
  generator: {
    minMemory: 5, // мин. память процесса
    maxMemory: 20, // макс. память процесса
    minInstructions: 10, // мин. число команд
    maxInstructions: 200, // макс. число команд
  },
  scheduler: {
    quantum: 5, // длина кванта, тактов
    minPriority: 1, // нижняя граница приоритета
    maxPriority: 20, // верхняя граница приоритета
    basePriority: 5, // базовый приоритет новых задач
    agingStep: 1, // шаг старения для READY
    runPenaltyStep: 3, // штраф после кванта
    agingIntervalTicks: 5, // интервал старения (тика)
  },
  commands: {
    computeProb: 0.7, // вероятность вычислительной команды
    ioProb: 0.2, // вероятность I/O команды
    errorProb: 0.1, // вероятность ошибочной команды
    ioMinTime: 2, // мин. длительность I/O (такты)
    ioMaxTime: 4, // макс. длительность I/O (такты)
  },
  simulation: {
    ticksPerSecond: 50, // тактов в секунду
    removeTerminatedAfterTicks: 200, // задержка удаления завершённых (тик)
    threadCount: 1, // количество потоков (одновременно выполняемых процессов)
  },
};

export default config;


