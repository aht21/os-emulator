import CPU from "./CPU.js";
import Command from "./Command";
import CommandGenerator from "./CommandGenerator";
import IOProcessor from "./IOProcessor";
import JobGenerator from "./JobGenerator";
import MemoryManager from "./MemoryManager";
import Metrics from "./Metrics";
import Process from "./Process";
import ProcessTable from "./ProcessTable";
import Scheduler from "./Scheduler";
import SimulationEngine from "./SimulationEngine";
import { systemConfig, simulationConfig } from "./config";
import appConfig from "./config";
import { randomizeConfig } from "./rndConfig/randomize";

export default class OS {
  memoryManager!: MemoryManager;
  processTable!: ProcessTable;
  cpu!: CPU;
  simEngine!: SimulationEngine;
  jobGenerator!: JobGenerator;
  scheduler!: Scheduler;
  commandGenerator!: CommandGenerator;
  ioProcessor!: IOProcessor;
  private tickCounter!: number;
  private pendingRemoval!: Array<{
    id: number;
    removeAt: number;
    size: number;
  }>;
  metrics!: Metrics;

  constructor() {
    this.initialize();
  }

  initialize() {
    this.processTable = new ProcessTable(systemConfig.maxProcesses.value);
    this.memoryManager = new MemoryManager();
    this.cpu = new CPU();
    this.simEngine = new SimulationEngine(this);
    this.jobGenerator = new JobGenerator();
    this.scheduler = new Scheduler();
    this.commandGenerator = new CommandGenerator();
    this.ioProcessor = new IOProcessor();
    this.tickCounter = 0;
    this.pendingRemoval = [];
    this.metrics = new Metrics();
  }

  tick() {
    this.tickCounter += 1;
    this.metrics.totalTicks.value += 1;

    const activeProcesses = this.cpu.getAllActiveProcesses();

    this.cpu.tick();
    this.metrics.busyThreadTicks += activeProcesses.length;

    if (activeProcesses.length > 0) {
      for (const p of activeProcesses) {
        this.metrics.lastExecuted.push(p.id);
      }
      if (this.metrics.lastExecuted.length > 16) {
        this.metrics.lastExecuted = this.metrics.lastExecuted.slice(-16);
      }
    }

    [...activeProcesses].forEach((process) => {
      if (process.startTick === undefined) process.startTick = this.tickCounter;

      if (!process.currentCommand) {
        const cmd = this.commandGenerator.generateCommand(process);
        process.setCurrentCommand(cmd);
      }

      const cmd = process.currentCommand;
      let processEvicted = false;
      if (cmd) {
        if (cmd.type === "COMPUTE") {
          cmd.execute(process.memory);
          process.setCurrentCommand(null);
        } else if (cmd.type === "IO") {
          console.log(cmd);
          this.handleIoRequest(process, cmd);
          processEvicted = true;
        } else if (cmd.type === "EXIT" || cmd.type === "ERROR") {
          this.handleProcessTerminated(process);
          processEvicted = true;
        }
      }

      if (!processEvicted) {
        if (process.isTerminated()) {
          this.handleProcessTerminated(process);
        } else if (this.cpu.isQuantumExpired(process)) {
          this.handleTimeInterrupt(process);
        }
      }
    });

    this.scheduler.tickAging();
    const completedIO = this.ioProcessor.tick();
    for (const item of completedIO) {
      this.handleIoComplete(item.process);
    }
    this.scheduleReadyProcesses();
    this.updateMetrics();
    this.processPendingRemovals();
  }

  private handleIoRequest(process: Process, cmd: Command) {
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.ctxActiveToBlocked;
      process.ioInitOverheadTicks =
        (process.ioInitOverheadTicks || 0) + ovh.ioInitTicks;
      this.increaseReadyProcessesTime(ovh.ctxActiveToBlocked + ovh.ioInitTicks);
    }

    if (cmd.executionTime) {
      process.ioBusyTicks = (process.ioBusyTicks || 0) + cmd.executionTime;
    }

    process.setCurrentCommand(null);
    this.cpu.clearProcess(process);
    process.state = "BLOCKED_IO";
    this.ioProcessor.submitIO(process, cmd);
  }

  private handleIoComplete(process: Process) {
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
    this.scheduler.onProcessReady(process);
  }

  private handleTimeInterrupt(process: Process) {
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.ctxActiveToReady;
      this.increaseReadyProcessesTime(ovh.ctxActiveToReady);
    }

    this.cpu.clearProcess(process); // Снимаем с CPU
    this.scheduler.onQuantumExpired(process); // Планировщик сам поставит в Ready и пересчитает приоритет
  }

  private handleProcessTerminated(process: Process) {
    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.terminateTicks;
      this.increaseReadyProcessesTime(ovh.terminateTicks);
    }

    this.cpu.clearProcess(process);
    process.terminate();
    process.setCurrentCommand(null);
    process.endTick = this.tickCounter;
    this.scheduler.onProcessTerminated(process);

    this.pendingRemoval.push({
      id: process.id,
      removeAt:
        this.tickCounter + simulationConfig.removeTerminatedAfterTicks.value,
      size: process.memorySize,
    });

    if (process.arrivalTick !== undefined) {
      const turnaround = this.tickCounter - process.arrivalTick;
      this.metrics.completedProcessesCount.value++;
      this.metrics.sumTurnaround += turnaround;
      this.metrics.sumWaiting += process.waitTicks;
      this.metrics.sumService += process.runTicks;
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
      next.state = "RUNNING";
      this.cpu.setProcess(next);
    }
  }

  increaseReadyProcessesTime(ticks: number) {
    if (ticks <= 0) return;
    const ready = this.processTable
      .getProcesses()
      .filter((p) => p.state === "READY");
    for (const p of ready) {
      p.waitTicks += ticks;
    }
  }

  private updateMetrics() {
    this.metrics.readyQueueSamples += this.scheduler.getReadyCount();
    this.metrics.readyQueueSamplesCount += 1;

    let totalRunningTicks = 0;
    let totalBlockedTicks = 0;
    const allProcesses = this.processTable.processes.value;

    allProcesses.forEach((p) => {
      if (p.state === "RUNNING") {
        p.runTicks += 1;
        totalRunningTicks += p.runTicks;
      }
      if (p.state === "BLOCKED_MEM" || p.state === "BLOCKED_IO") {
        p.blockedTicks += 1;
        totalBlockedTicks += p.blockedTicks;
      }
    });

    if (allProcesses.length > 0) {
      this.metrics.avgRunningTicks.value = Number(
        (totalRunningTicks / allProcesses.length).toFixed(1),
      );
      this.metrics.avgBlockedTicks.value = Number(
        (totalBlockedTicks / allProcesses.length).toFixed(1),
      );
    }
  }

  private processPendingRemovals() {
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

  generateJob(): Process {
    return this.jobGenerator.generateProcess();
  }

  loadProcess(proc?: Process) {
    const process = proc ?? this.generateJob();
    if (!this.processTable.hasSpace())
      throw new Error("Таблица процессов заполнена!");
    if (!this.memoryManager.hasSpace(process.memorySize))
      throw new Error("Недостаточно памяти!");

    this.memoryManager.allocate(process.memorySize);
    this.scheduler.onProcessReady(process);
    this.processTable.addProcess(process);
    process.arrivalTick = this.tickCounter;

    return process;
  }

  initialLoad() {
    const safetyLimit = systemConfig.maxProcesses.value * 10;
    let attempts = 0;

    while (attempts < safetyLimit) {
      attempts++;

      if (!this.processTable.hasSpace()) break;
      const candidate = this.generateJob();

      if (!this.memoryManager.hasSpace(candidate.memorySize)) break;
      this.loadProcess(candidate);
    }
  }

  removeProcessByPid(pid: number): void {
    const process = this.processTable.getProcess(pid);
    if (!process) {
      throw new Error(`Процесс с PID ${pid} не найден`);
    }

    const ovh = appConfig.simulation.overheads;
    if (ovh) {
      process.contextSwitchOverheadTicks =
        (process.contextSwitchOverheadTicks || 0) + ovh.terminateTicks;
      this.increaseReadyProcessesTime(ovh.terminateTicks);
    }

    this.cpu.clearProcess(process);
    process.terminate();
    process.setCurrentCommand(null);
    process.endTick = this.tickCounter;

    this.scheduler.onProcessTerminated(process);
    this.memoryManager.free(process.memorySize);
    this.pendingRemoval = this.pendingRemoval.filter((x) => x.id !== pid);
    this.processTable.removeProcess(pid);

    if (process.arrivalTick !== undefined) {
      const turnaround = this.tickCounter - process.arrivalTick;
      this.metrics.completedProcessesCount.value++;
      this.metrics.sumTurnaround += turnaround;
      this.metrics.sumWaiting += process.waitTicks;
      this.metrics.sumService += process.runTicks;
    }
  }

  clearProcesses() {
    this.processTable.processes.value = [];
    this.memoryManager.free(Infinity);
    this.scheduler = new Scheduler();
    this.pendingRemoval = [];
    this.cpu.clearAll();
  }

  randomizeSystemParams() {
    randomizeConfig();
  }
}
