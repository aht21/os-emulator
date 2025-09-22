import CPU from "./CPU.js";
import JobGenerator from "./JobGenerator.js";
import MemoryManager from "./MemoryManager.js";
import Process from "./Process.js";
import ProcessTable from "./ProcessTable.js";
import SimulationEngine from "./SimulationEngine.js";

type Config = {
  maxProcesses: number;
  totalMemory: number;
};

export default class OS {
  memoryManager: MemoryManager;
  processTable: ProcessTable;
  cpu: CPU;
  simEngine: SimulationEngine;
  jobGenerator: JobGenerator;
  config: Config;

  constructor(config: Config) {
    this.memoryManager = new MemoryManager(config.totalMemory);
    this.processTable = new ProcessTable(config.maxProcesses);
    this.cpu = new CPU();
    this.simEngine = new SimulationEngine(this.cpu);
    this.jobGenerator = new JobGenerator();

    this.config = config; // для UI и диапазонов генерации
  }

  /**
   * Инициализация модели
   */
  initialize() {
    this.processTable = new ProcessTable(this.config.maxProcesses);
    this.memoryManager = new MemoryManager(this.config.totalMemory);
    this.cpu = new CPU();
    this.simEngine = new SimulationEngine(this.cpu);
    this.jobGenerator = new JobGenerator();
  }

  /**
   * Генерация нового процесса
   */
  generateJob(
    minMemory: number,
    maxMemory: number,
    minInstructions: number,
    maxInstructions: number,
  ): Process {
    const process = this.jobGenerator.generateProcess(
      minMemory,
      maxMemory,
      minInstructions,
      maxInstructions,
    );
    return process;
  }

  /**
   * Загрузка процесса в систему
   */
  loadProcess(process: Process) {
    // Проверяем наличие места в таблице и достаточной памяти
    if (!this.processTable.hasSpace()) {
      throw new Error("Таблица процессов заполнена!");
    }
    if (!this.memoryManager.hasSpace(process.memorySize)) {
      throw new Error("Недостаточно памяти для загрузки процесса!");
    }

    // Выделяем память, подготавливаем процесс и добавляем в таблицу
    this.memoryManager.allocate(process.memorySize);
    process.setReady();
    this.processTable.addProcess(process);

    // Если CPU свободен, назначаем этот процесс
    if (!this.cpu.getCurrentProcess()) {
      this.cpu.setProcess(process);
    }
  }

  /**
   * Завершить симуляцию: останавливаем движок, очищаем память и таблицу
   */
  terminateSimulation() {
    this.simEngine.stop();
    // Освобождаем память всех процессов
    this.processTable.getProcesses().forEach((p) => {
      this.memoryManager.free(p.memorySize);
    });
    this.processTable = new ProcessTable(this.config.maxProcesses);
    this.cpu = new CPU();
  }

  /**
   * Установить скорости симуляции
   */
  setSpeed(speedVal: number) {
    this.simEngine.setSpeed(speedVal);
  }

  /**
   * Получить справку
   */
  getHelp() {
    return `
      Доступные команды:
      - Завершить моделирование
      - Увеличить скорость на 5-10%
      - Уменьшить скорость на 5-10%
      - /? - показать справку
    `;
  }

  /**
   * Экспорт состояния модели (для JSON)
   */
  exportState() {
    const state = {
      processes: this.processTable.getProcesses().map((p) => ({
        id: p.id,
        pc: p.pc,
        memorySize: p.memorySize,
        totalInstructions: p.totalInstructions,
        state: p.state,
      })),
      freeMemory: this.memoryManager.getFreeMemory(),
      speed: this.simEngine.getSpeed(),
    };
    return JSON.stringify(state, null, 2);
  }

  /**
   * Импорт состояния модели из JSON
   */
  importState(json: string) {
    const state = JSON.parse(json);
    this.initialize();

    state.processes.forEach((pData: Process) => {
      const proc = new Process(
        pData.id,
        pData.memorySize,
        pData.totalInstructions,
      );
      proc.pc = pData.pc;
      proc.state = pData.state;

      this.memoryManager.allocate(proc.memorySize);
      this.processTable.addProcess(proc);
    });

    this.simEngine.setSpeed(state.speed);
  }

  /**
   * Выполняет один такт симуляции
   */
  tick() {
    // Выполнить текущий процесс
    this.cpu.tick();

    // Если CPU свободен, назначить первый READY-процесс из таблицы
    if (!this.cpu.getCurrentProcess()) {
      const next = this.processTable
        .getProcesses()
        .find((p) => p.state === "READY");
      if (next) {
        this.cpu.setProcess(next);
      }
    }
  }

  /**
   * Проверка возможности загрузки процесса заданного размера
   */
  canLoad(size: number): boolean {
    return this.processTable.hasSpace() && this.memoryManager.hasSpace(size);
  }

  /**
   * Начальная загрузка: генерировать и загружать процессы, пока хватает памяти/места
   */
  initialLoad(
    minMemory: number,
    maxMemory: number,
    minInstructions: number,
    maxInstructions: number,
  ) {
    // Бесконечный поток задач с остановкой по ресурсу
    // Защита от потенциального бесконечного цикла при слишком больших мин. требованиях
    const safetyLimit = this.config.maxProcesses * 10;
    let attempts = 0;
    while (attempts < safetyLimit) {
      attempts += 1;
      if (!this.processTable.hasSpace()) break;
      const candidate = this.generateJob(
        minMemory,
        maxMemory,
        minInstructions,
        maxInstructions,
      );
      if (!this.canLoad(candidate.memorySize)) break;
      this.loadProcess(candidate);
    }
  }

  /**
   * Получить таблицу PSW для вывода (№, PID, PC, State)
   */
  getPSWTable() {
    return this.processTable.getProcesses().map((p, idx) => ({
      No: idx + 1,
      PID: p.id,
      PC: p.pc,
      State: p.state,
    }));
  }

  /**
   * Получить статистику памяти и формулы
   */
  getMemoryStats() {
    const total = this.memoryManager.totalMemory;
    const free = this.memoryManager.getFreeMemory();
    const used = total - free;
    return {
      total,
      used,
      free,
      formulas: {
        used: "used = total - free",
        free: "free = total - used",
        canLoad: "canLoad(size) = free >= size",
      },
    };
  }
}
