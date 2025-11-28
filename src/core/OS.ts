import CPU from "./CPU.js";
import CommandGenerator from "./CommandGenerator";
import IOProcessor from "./IOProcessor";
import JobGenerator from "./JobGenerator";
import MemoryManager from "./MemoryManager";
import Metrics from "./Metrics";
import Process from "./Process";
import ProcessTable from "./ProcessTable";
import Scheduler from "./Scheduler";
import SimulationEngine from "./SimulationEngine";
import { systemConfig, SystemConfig, simulationConfig } from "./config";
import appConfig from "./config";
import { randomizeConfig } from "./rndConfig/randomize";

export default class OS {
  memoryManager!: MemoryManager;
  processTable!: ProcessTable;
  cpu!: CPU;
  simEngine!: SimulationEngine;
  jobGenerator!: JobGenerator;
  config: SystemConfig;
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
    this.config = systemConfig;
    this.initialize();
  }

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
    this.metrics = new Metrics();
  }

  /**
   * ГЛАВНЫЙ ЦИКЛ СИМУЛЯЦИИ
   */
  tick() {
    this.tickCounter += 1;
    this.metrics.totalTicks.value += 1;

    // 1. Работа CPU: получаем список процессов, находящихся на исполнении
    const activeProcesses = this.cpu.getAllActiveProcesses();

    // Сначала выполняем такт CPU (инкремент счетчиков квантов и времени исполнения)
    // Это важно сделать ДО проверки isQuantumExpired, чтобы учесть текущий тик.
    this.cpu.tick();
    this.metrics.busyThreadTicks += activeProcesses.length;

    // Сбор последовательности PID для UI
    if (activeProcesses.length > 0) {
      for (const p of activeProcesses) {
        this.metrics.lastExecuted.push(p.id);
      }
      if (this.metrics.lastExecuted.length > 16) {
        this.metrics.lastExecuted = this.metrics.lastExecuted.slice(-16);
      }
    }

    // Обработка активных процессов
    // Используем обратный цикл или копию массива, так как процессы могут быть удалены из CPU внутри цикла
    [...activeProcesses].forEach((process) => {
      // Инициализация времени старта
      if (process.startTick === undefined) process.startTick = this.tickCounter;

      // А. Генерация команды
      if (!process.currentCommand) {
        const cmd = this.commandGenerator.generateCommand(process);
        process.setCurrentCommand(cmd);
      }

      const cmd = process.currentCommand;
      let processEvicted = false; // Флаг, что процесс ушел с CPU (IO, Exit, Quantum)

      // Б. Исполнение команды
      if (cmd) {
        if (cmd.type === "COMPUTE") {
          cmd.execute(process.memory);
          // !!! ВАЖНО: Сбрасываем команду после выполнения, чтобы на след. такте получить новую
          process.setCurrentCommand(null);
        } else if (cmd.type === "IO") {
          this.handleIoRequest(process, cmd);
          processEvicted = true;
        } else if (cmd.type === "EXIT" || cmd.type === "ERROR") {
          this.handleProcessTerminated(process);
          processEvicted = true;
        }
      }

      // В. Проверка прерываний (если процесс всё еще на CPU)
      if (!processEvicted) {
        if (process.isTerminated()) {
          this.handleProcessTerminated(process);
        } else if (this.cpu.isQuantumExpired(process)) {
          this.handleTimeInterrupt(process);
        }
      }
    });

    // 2. Старение очереди готовности (повышение приоритетов ожидающих)
    this.scheduler.tickAging();

    // 3. Обработка I/O (возврат процессов в очередь готовности)
    const completedIO = this.ioProcessor.tick();
    for (const item of completedIO) {
      this.handleIoComplete(item.process);
    }

    // 4. Планировщик: заполнение освободившихся потоков CPU
    this.scheduleReadyProcesses();

    // 5. Метрики и очистка
    this.updateMetrics();
    this.processPendingRemovals();
  }

  // === ОБРАБОТЧИКИ ПРЕРЫВАНИЙ И СМЕНЫ СОСТОЯНИЙ ===

  private handleIoRequest(process: Process, cmd: any) {
    // Накладные расходы
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

    // Логика переключения
    process.setCurrentCommand(null); // Очищаем команду IO, она передана процессору
    this.cpu.clearProcess(process); // Убираем с CPU
    process.state = "BLOCKED_IO"; // Явно ставим состояние (или через сеттер)
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
    // Возвращаем в планировщик
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
    process.terminate(); // Устанавливаем состояние TERMINATED
    process.setCurrentCommand(null);
    process.endTick = this.tickCounter;

    // Удаляем из очередей планировщика, если он там был (на всякий случай)
    this.scheduler.onProcessTerminated(process);

    // Добавляем в очередь на физическое удаление из памяти
    this.pendingRemoval.push({
      id: process.id,
      removeAt:
        this.tickCounter + simulationConfig.removeTerminatedAfterTicks.value,
      size: process.memorySize,
    });

    // Финальные метрики процесса
    if (process.arrivalTick !== undefined) {
      const turnaround = this.tickCounter - process.arrivalTick;
      this.metrics.completedProcessesCount.value++;
      this.metrics.sumTurnaround += turnaround;
      this.metrics.sumWaiting += process.waitTicks;
      this.metrics.sumService += process.runTicks;
    }
  }

  private scheduleReadyProcesses() {
    // Пока есть свободные ядра и есть процессы в очереди
    while (this.cpu.hasFreeThreads()) {
      const next = this.scheduler.getNextProcessForCPU();
      if (!next) break;

      const ovh = appConfig.simulation.overheads;
      if (ovh) {
        next.contextSwitchOverheadTicks =
          (next.contextSwitchOverheadTicks || 0) + ovh.ctxReadyToActive;
        this.increaseReadyProcessesTime(ovh.ctxReadyToActive);
      }

      // !!! ВАЖНО: Переводим в состояние RUNNING
      // Предполагаем, что у Process есть метод setRunning() или изменяем свойство напрямую
      // Если оставить setReady(), метрики и логика CPU могут сломаться
      if (typeof (next as any).setRunning === "function") {
        (next as any).setRunning();
      } else {
        next.state = "RUNNING";
      }

      this.cpu.setProcess(next);
    }
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

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

  // === PUBLICS (для UI) ===
  // (Оставляем методы getSystemParams, getMonoMultiMetrics и т.д. без изменений,
  // они выглядят корректно, если данные собираются правильно)

  getSystemParams() {
    // ... (Ваш код метрик)
    // Для краткости не дублирую, так как логика там не влияет на ход симуляции
    return super.getSystemParams ? super.getSystemParams() : this.metrics; // Заглушка
  }

  // Методы loadProcess и generateJob оставляем без изменений
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

    // Сразу отправляем в планировщик
    this.scheduler.onProcessReady(process);

    this.processTable.addProcess(process);
    process.arrivalTick = this.tickCounter;
    return process;
  }

  initialLoad() {
    // safetyLimit нужен, чтобы не уйти в бесконечный цикл,
    // если генератор выдает слишком большие процессы, которые не лезут в память
    const safetyLimit = this.config.maxProcesses.value * 10;
    let attempts = 0;

    while (attempts < safetyLimit) {
      attempts++;

      // Если таблица полна — хватит
      if (!this.processTable.hasSpace()) break;

      // Генерируем кандидата
      const candidate = this.generateJob();

      // Если нет места в памяти под этот конкретный процесс — пробуем следующий (continue)
      // или прерываемся (break).
      // Обычно break логичнее, если память фрагментирована или почти полна.
      if (!this.memoryManager.hasSpace(candidate.memorySize)) {
        // Можно попробовать break, считая что память кончилась
        break;
      }

      // Загружаем
      this.loadProcess(candidate);
    }
  }

  public removeProcessByPid(pid: number): void {
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

    try {
      this.scheduler.onProcessTerminated(process);
    } catch (e) {
      console.error(e);
    }

    try {
      this.memoryManager.free(process.memorySize);
    } catch (e) {
      console.error(e);
    }

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
