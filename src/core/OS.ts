import CPU from "./CPU.js";
import JobGenerator from "./JobGenerator.js";
import MemoryManager from "./MemoryManager.js";
import Process from "./Process.js";
import ProcessTable from "./ProcessTable.js";
import SimulationEngine from "./SimulationEngine.js";
import Scheduler from "./Scheduler.js";
import appConfig, { SchedulerConfig } from "../config.js";
import CommandGenerator from "./CommandGenerator.js";
import IOProcessor from "./IOProcessor.js";

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
  scheduler: Scheduler;
  schedulerConfig: SchedulerConfig;
  commandGenerator: CommandGenerator;
  ioProcessor: IOProcessor;
  private tickCounter: number;
  private pendingRemoval: Array<{ id: number; removeAt: number; size: number }>;

  constructor(config: Config) {
    this.memoryManager = new MemoryManager(config.totalMemory);
    this.processTable = new ProcessTable(config.maxProcesses);
    this.cpu = new CPU(appConfig.simulation.threadCount);
    this.simEngine = new SimulationEngine(this);
    this.jobGenerator = new JobGenerator();

    this.config = config; // для UI и диапазонов генерации
    this.schedulerConfig = appConfig.scheduler;
    this.scheduler = new Scheduler(this.schedulerConfig);
    this.commandGenerator = new CommandGenerator();
    this.ioProcessor = new IOProcessor();
    this.tickCounter = 0;
    this.pendingRemoval = [];
  }

  /**
   * Инициализация модели
   */
  initialize() {
    this.processTable = new ProcessTable(this.config.maxProcesses);
    this.memoryManager = new MemoryManager(this.config.totalMemory);
    this.cpu = new CPU(appConfig.simulation.threadCount);
    this.simEngine = new SimulationEngine(this);
    this.jobGenerator = new JobGenerator();
    this.scheduler = new Scheduler(this.schedulerConfig);
    this.commandGenerator = new CommandGenerator();
    this.ioProcessor = new IOProcessor();
    this.tickCounter = 0;
    this.pendingRemoval = [];
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
    this.scheduler.onProcessReady(process);

    // Если CPU имеет свободные потоки, назначаем этот процесс
    if (this.cpu.hasSpace()) {
      const q = this.schedulerConfig.quantum;
      this.cpu.setProcess(process, q);
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
    this.tickCounter += 1;
    const activeProcesses = this.cpu.getAllActiveProcesses();
    
    // Обработка всех активных процессов
    for (const process of activeProcesses) {
      // Сгенерировать команду, если её нет
      if (!process.currentCommand) {
        process.setCurrentCommand(this.commandGenerator.generateCommand(process));
      }

      // Обработка команд
      const cmd = process.currentCommand;
      if (cmd) {
        if (cmd.type === "COMPUTE") {
          cmd.execute(process.memory);
        } else if (cmd.type === "IO") {
          this.handleIoRequest(process, cmd);
        } else if (cmd.type === "EXIT" || cmd.type === "ERROR") {
          process.terminate();
          process.setCurrentCommand(null);
        }
      }

      // Проверка завершения или истечения кванта
      if (process.isTerminated()) {
        this.handleProcessTerminated(process);
      } else if (this.cpu.isQuantumExpired(process)) {
        this.handleTimeInterrupt(process);
      }
    }

    // Выполнить такт для всех активных процессов
    this.cpu.tick();

    // Старение очереди готовности
    this.scheduler.tickAging();

    // Продвинуть I/O и вернуть готовые процессы
    const completedIO = this.ioProcessor.tick();
    for (const item of completedIO) {
      this.handleIoComplete(item.process);
    }

    // Если CPU имеет свободные потоки — выбрать следующие процессы
    while (this.cpu.hasSpace()) {
      const next = this.scheduler.getNextProcessForCPU();
      if (!next) break;
      
      next.setReady();
      this.cpu.setProcess(next, this.schedulerConfig.quantum);
    }

    // Удалить завершённые по истечении задержки
    if (this.pendingRemoval.length > 0) {
      const now = this.tickCounter;
      const toRemove = this.pendingRemoval.filter((x) => x.removeAt <= now);
      if (toRemove.length > 0) {
        for (const r of toRemove) {
          this.processTable.removeProcess(r.id);
          this.memoryManager.free(r.size);
        }
        this.pendingRemoval = this.pendingRemoval.filter((x) => x.removeAt > now);
      }
    }
  }

  // === Регулировщик: централизованные операции смены состояний и прерываний ===
  private handleIoRequest(process: Process, cmd: any) {
    // Отправить в I/O и снять с ЦП
    this.ioProcessor.submitIO(process, cmd);
    process.setCurrentCommand(null);
    this.cpu.clearProcess(process);
  }

  private handleIoComplete(process: Process) {
    process.setReady();
    this.scheduler.onProcessReady(process);
  }

  private handleTimeInterrupt(process: Process) {
    // Квант истёк: вернуть в READY, штраф уже ставится в Scheduler
    this.scheduler.onQuantumExpired(process);
    this.cpu.clearProcess(process);
  }

  private handleProcessTerminated(process: Process) {
    this.scheduler.onProcessTerminated(process);
    this.pendingRemoval.push({
      id: process.id,
      removeAt: this.tickCounter + appConfig.simulation.removeTerminatedAfterTicks,
      size: process.memorySize,
    });
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
      PriorityBase: (p as any).basePriority,
      PriorityDyn: (p as any).dynamicPriority,
      Command: (p as any).getCurrentCommandDescription
        ? (p as any).getCurrentCommandDescription()
        : "",
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
