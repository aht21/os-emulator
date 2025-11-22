import appConfig from "../config.js";
import { systemConfig, SystemConfig } from "../config.js";
import CPU from "./CPU.js";
import CommandGenerator from "./CommandGenerator.js";
import IOProcessor from "./IOProcessor.js";
import JobGenerator from "./JobGenerator.js";
import MemoryManager from "./MemoryManager.js";
import Process from "./Process.js";
import ProcessTable from "./ProcessTable.js";
import Scheduler from "./Scheduler.js";
import SimulationEngine from "./SimulationEngine.js";

export default class OS {
  memoryManager: MemoryManager;
  processTable: ProcessTable;
  cpu: CPU;
  simEngine: SimulationEngine;
  jobGenerator: JobGenerator;
  config: SystemConfig;
  scheduler: Scheduler;
  commandGenerator: CommandGenerator;
  ioProcessor: IOProcessor;
  private tickCounter: number;
  private pendingRemoval: Array<{ id: number; removeAt: number; size: number }>;
  private metrics: {
    totalTicks: number;
    busyThreadTicks: number; // суммарное число активных потоков по тикам
    completedCount: number;
    sumTurnaround: number;
    sumWaiting: number;
    sumService: number;
    readyQueueSamples: number;
    readyQueueSamplesCount: number;
    lastExecuted: number[]; // последние до 16 PID
  };

  constructor() {
    this.memoryManager = new MemoryManager();
    this.processTable = new ProcessTable(systemConfig.maxProcesses.value);
    this.cpu = new CPU();
    this.simEngine = new SimulationEngine(this);
    this.jobGenerator = new JobGenerator();

    this.config = systemConfig; // для UI и диапазонов генерации
    this.scheduler = new Scheduler();
    this.commandGenerator = new CommandGenerator();
    this.ioProcessor = new IOProcessor();
    this.tickCounter = 0;
    this.pendingRemoval = [];
    this.metrics = {
      totalTicks: 0,
      busyThreadTicks: 0,
      completedCount: 0,
      sumTurnaround: 0,
      sumWaiting: 0,
      sumService: 0,
      readyQueueSamples: 0,
      readyQueueSamplesCount: 0,
      lastExecuted: [],
    };
  }

  /**
   * Инициализация модели
   */
  initialize() {
    this.processTable = new ProcessTable(this.config.maxProcesses.value);
    this.memoryManager = new MemoryManager();
    this.cpu = new CPU();
    this.simEngine = new SimulationEngine(this);
    this.jobGenerator = new JobGenerator();
    this.scheduler = new Scheduler();
    this.commandGenerator = new CommandGenerator();
    this.ioProcessor = new IOProcessor();
    this.tickCounter = 0;
    this.pendingRemoval = [];
    this.metrics = {
      totalTicks: 0,
      busyThreadTicks: 0,
      completedCount: 0,
      sumTurnaround: 0,
      sumWaiting: 0,
      sumService: 0,
      readyQueueSamples: 0,
      readyQueueSamplesCount: 0,
      lastExecuted: [],
    };
  }

  /**
   * Выполняет один такт симуляции
   */
  tick() {
    this.tickCounter += 1;
    this.metrics.totalTicks += 1;
    const activeProcesses = this.cpu.getAllActiveProcesses();

    // Обработка всех активных процессов
    for (const process of activeProcesses) {
      // учёт начала обслуживания
      if (process.startTick === undefined) process.startTick = this.tickCounter;
      // наработка времени обслуживания
      process.runTicks += 1;

      // Сгенерировать команду, если её нет
      if (!process.currentCommand) {
        process.setCurrentCommand(
          this.commandGenerator.generateCommand(process),
        );
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

    // Учёт загрузки CPU (по потокам)
    this.metrics.busyThreadTicks += activeProcesses.length;

    // Старение очереди готовности
    this.scheduler.tickAging();

    // Продвинуть I/O и вернуть готовые процессы
    const completedIO = this.ioProcessor.tick();
    for (const item of completedIO) {
      this.handleIoComplete(item.process);
    }

    // Если CPU имеет свободные потоки — выбрать следующие процессы
    this.scheduleReadyProcesses();

    // Учет ожидания для всех READY
    this.processTable
      .getProcesses()
      .filter((p) => p.state === "READY")
      .forEach((p) => (p.waitTicks += 1));

    // Семплирование длины очереди готовности
    this.metrics.readyQueueSamples += this.scheduler.getReadyCount();
    this.metrics.readyQueueSamplesCount += 1;

    // Последовательность выполненных PID (последние 16)
    if (activeProcesses.length > 0) {
      for (const p of activeProcesses) {
        this.metrics.lastExecuted.push(p.id);
      }
      if (this.metrics.lastExecuted.length > 16) {
        this.metrics.lastExecuted = this.metrics.lastExecuted.slice(-16);
      }
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
        this.pendingRemoval = this.pendingRemoval.filter(
          (x) => x.removeAt > now,
        );
      }
    }
  }

  // === Регулировщик: централизованные операции смены состояний и прерываний ===
  private handleIoRequest(process: Process, cmd: any) {
    // Учесть накладные расходы и занятость I/O
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.ctxActiveToBlocked;
      process.ioInitOverheadTicks =
        (process.ioInitOverheadTicks || 0) + ovh.ioInitTicks;
      this.increaseReadyProcessesTime(ovh.ctxActiveToBlocked + ovh.ioInitTicks);
    }
    if ((cmd as any).executionTime) {
      process.ioBusyTicks =
        (process.ioBusyTicks || 0) + (cmd as any).executionTime;
    }

    // Отправить в I/O и снять с ЦП
    this.ioProcessor.submitIO(process, cmd);
    process.setCurrentCommand(null);
    this.cpu.clearProcess(process);
  }

  private handleIoComplete(process: Process) {
    // Накладные расходы: прерывание по окончанию I/O и переход в READY
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.ioInterruptServiceTicks =
        (process.ioInterruptServiceTicks || 0) + ovh.ioInterruptServiceTicks;
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.ctxBlockedToReady;
      this.increaseReadyProcessesTime(
        ovh.ioInterruptServiceTicks + ovh.ctxBlockedToReady,
      );
    }
    process.setReady();
    this.scheduler.onProcessReady(process);
  }

  private handleTimeInterrupt(process: Process) {
    // Квант истёк: вернуть в READY, штраф уже ставится в Scheduler
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.ctxActiveToReady;
      this.increaseReadyProcessesTime(ovh.ctxActiveToReady);
    }
    this.scheduler.onQuantumExpired(process);
    this.cpu.clearProcess(process);
  }

  private handleProcessTerminated(process: Process) {
    // Накладные расходы: завершение процесса
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.terminateTicks;
      this.increaseReadyProcessesTime(ovh.terminateTicks);
    }
    this.scheduler.onProcessTerminated(process);
    this.pendingRemoval.push({
      id: process.id,
      removeAt:
        this.tickCounter + appConfig.simulation.removeTerminatedAfterTicks,
      size: process.memorySize,
    });
    // Метрики завершения
    if (process.arrivalTick !== undefined) {
      const turnaround = this.tickCounter - process.arrivalTick;
      this.metrics.completedCount += 1;
      this.metrics.sumTurnaround += turnaround;
      this.metrics.sumWaiting += process.waitTicks;
      this.metrics.sumService += process.runTicks;
      process.endTick = this.tickCounter;
    }
  }

  private scheduleReadyProcesses() {
    while (this.cpu.hasFreeThreads()) {
      const next = this.scheduler.getNextProcessForCPU();
      if (!next) break;

      const ovh = appConfig.simulation.overheads;
      if (ovh) {
        next.contextSwitchOverheadTicks =
          (next.contextSwitchOverheadTicks || 0) + ovh.ctxReadyToActive;
        this.increaseReadyProcessesTime(ovh.ctxReadyToActive);
      }

      next.setReady();
      this.cpu.setProcess(next);
    }
  }

  /**
   * Увеличить время ожидания для всех процессов в состоянии READY на указанное число тактов
   */
  increaseReadyProcessesTime(ticks: number) {
    if (ticks <= 0) return;
    const ready = this.processTable
      .getProcesses()
      .filter((p) => p.state === "READY");
    for (const p of ready) {
      p.waitTicks += ticks;
    }
  }

  // === Публичные отчёты для индикации ===
  getSystemParams() {
    const cpuUtil =
      this.metrics.totalTicks > 0
        ? this.metrics.busyThreadTicks /
          (this.metrics.totalTicks * appConfig.simulation.threadCount)
        : 0;
    const avgReadyLen =
      this.metrics.readyQueueSamplesCount > 0
        ? this.metrics.readyQueueSamples / this.metrics.readyQueueSamplesCount
        : 0;
    const avgWait =
      this.metrics.completedCount > 0
        ? this.metrics.sumWaiting / this.metrics.completedCount
        : 0;
    const avgTurn =
      this.metrics.completedCount > 0
        ? this.metrics.sumTurnaround / this.metrics.completedCount
        : 0;
    const throughput =
      this.metrics.totalTicks > 0
        ? this.metrics.completedCount / this.metrics.totalTicks
        : 0;
    return {
      totalTicks: this.metrics.totalTicks,
      cpuUtilization: cpuUtil,
      avgReadyLen,
      completed: this.metrics.completedCount,
      avgWaiting: avgWait,
      avgTurnaround: avgTurn,
      throughputPerTick: throughput,
      lastExecuted: [...this.metrics.lastExecuted],
    };
  }

  /**
   * Расчёт T_mono и T_multi, а также относительной производительности (%)
   */
  getMonoMultiMetrics() {
    const ovh = appConfig.simulation.overheads;
    const completed = this.processTable
      .getProcesses()
      .filter((p) => p.endTick !== undefined && p.arrivalTick !== undefined);
    const details = completed.map((p) => {
      const tMulti = (p.endTick as number) - (p.arrivalTick as number);
      const ioBusy = p.ioBusyTicks || 0;
      const ioInit = p.ioInitOverheadTicks || 0;
      const ioIsr = p.ioInterruptServiceTicks || 0;
      const ctx = p.contextSwitchOverheadTicks || 0;
      const load = ovh ? ovh.loadTicks : 0;
      const term = ovh ? ovh.terminateTicks : 0;
      const tMono =
        p.totalInstructions + ioBusy + ioInit + ioIsr + ctx + load + term;
      return { pid: p.id, T_multi: tMulti, T_mono: tMono };
    });
    const avgMono =
      details.length > 0
        ? details.reduce((s, d) => (s += d.T_mono), 0) / details.length
        : 0;
    const possibleMonoCompleted =
      avgMono > 0 ? this.metrics.totalTicks / avgMono : 0;
    const performancePercent =
      possibleMonoCompleted > 0
        ? (this.metrics.completedCount / possibleMonoCompleted) * 100
        : 0;
    return {
      completedCount: this.metrics.completedCount,
      totalTicks: this.metrics.totalTicks,
      avgTmono: avgMono,
      monoPossibleCompleted: possibleMonoCompleted,
      performancePercent,
      details,
    };
  }

  /**
   * Таблица разложения по составляющим для проверки расчётов T_mono и T_multi
   */
  getTimeBreakdownTable() {
    const ovh = appConfig.simulation.overheads;
    return this.processTable.getProcesses().map((p) => {
      const ioBusy = p.ioBusyTicks || 0;
      const ioInit = p.ioInitOverheadTicks || 0;
      const ioIsr = p.ioInterruptServiceTicks || 0;
      const ctx = p.contextSwitchOverheadTicks || 0;
      const load = ovh ? ovh.loadTicks : 0;
      const term = ovh ? ovh.terminateTicks : 0;
      const tMono =
        p.totalInstructions + ioBusy + ioInit + ioIsr + ctx + load + term;
      // T_multi = время нахождения в системе (от загрузки до завершения или текущий момент)
      let tMulti: number | undefined;
      if (p.arrivalTick !== undefined) {
        if (p.endTick !== undefined) {
          // Завершенный процесс: от загрузки до завершения
          tMulti = p.endTick - p.arrivalTick;
        } else {
          // Незавершенный процесс: текущее время в системе
          tMulti = this.tickCounter - p.arrivalTick;
        }
      }
      return {
        PID: p.id,
        State: p.state,
        totalInstructions: p.totalInstructions,
        runTicks: p.runTicks,
        waitTicks: p.waitTicks,
        ioBusyTicks: ioBusy,
        ioInitOverheadTicks: ioInit,
        ioInterruptServiceTicks: ioIsr,
        contextSwitchOverheadTicks: ctx,
        loadOverhead: load,
        terminateOverhead: term,
        T_mono: tMono,
        T_multi: tMulti,
      };
    });
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

  // Процессы

  generateJob(): Process {
    return this.jobGenerator.generateProcess();
  }

  loadProcess(proc?: Process) {
    const process = proc ?? this.generateJob();

    if (!this.processTable.hasSpace()) {
      throw new Error("Таблица процессов заполнена!");
    }
    if (!this.memoryManager.hasSpace(process.memorySize)) {
      throw new Error("Недостаточно памяти для загрузки процесса!");
    }

    this.memoryManager.allocate(process.memorySize);
    process.setReady();
    this.processTable.addProcess(process);
    this.scheduler.onProcessReady(process);
    process.arrivalTick = this.tickCounter;

    return process;
  }

  initialLoad() {
    const safetyLimit = this.config.maxProcesses.value * 10;
    let attempts = 0;

    while (attempts < safetyLimit) {
      attempts++;

      if (!this.processTable.hasSpace()) break;

      const candidate = this.generateJob();

      if (!this.memoryManager.hasSpace(candidate.memorySize)) break;

      this.loadProcess(candidate);
    }
  }

  clearProcesses() {
    this.processTable.processes.value = [];
    this.memoryManager.free(Infinity);
  }
}
