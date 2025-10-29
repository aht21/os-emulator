import Memory from "./Memory";
import Command from "./Command";
export type ProcessState =
  | "NEW"
  | "LOADING"
  | "READY"
  | "RUNNING"
  | "BLOCKED_IO"
  | "BLOCKED_MEM"
  | "SUSPENDED"
  | "TERMINATED";

/**
 * Класс Process представляет один процесс в системе.
 */
export default class Process {
  id: number;
  memorySize: number;
  totalInstructions: number;
  state: ProcessState;
  pc: number;
  basePriority: number;
  dynamicPriority: number;
  agingCounter: number;
  memory: Memory;
  currentCommand: Command | null;
  // metrics
  arrivalTick?: number;
  startTick?: number;
  endTick?: number;
  runTicks: number;
  waitTicks: number;

  /**
   * @param id - уникальный идентификатор процесса
   * @param memorySize - размер памяти (в словах), требуемый процессу
   * @param totalInstructions - общее количество команд (длина программы)
   */
  constructor(
    id: number,
    memorySize: number,
    totalInstructions: number,
    basePriority: number = 5,
  ) {
    this.id = id;
    this.memorySize = memorySize;
    this.totalInstructions = totalInstructions;

    this.state = "NEW"; // начальное состояние
    this.pc = 0; // счетчик команд (Program Counter)

    this.basePriority = basePriority;
    this.dynamicPriority = basePriority;
    this.agingCounter = 0;

    this.memory = new Memory(memorySize);
    this.currentCommand = null;
    this.runTicks = 0;
    this.waitTicks = 0;
  }

  /**
   * Выполнение одного такта (увеличивает PC).
   * Если процесс завершён, переводит его в состояние TERMINATED.
   */
  tick() {
    if (this.state === "TERMINATED") return;

    this.pc += 1;

    if (this.pc >= this.totalInstructions) {
      this.state = "TERMINATED";
    }
  }

  /**
   * Переводит процесс в состояние READY.
   */
  setReady() {
    if (
      this.state === "NEW" ||
      this.state === "LOADING" ||
      this.state === "SUSPENDED" ||
      this.state === "RUNNING"
    ) {
      this.state = "READY";
    }
  }

  /**
   * Переводит процесс в состояние RUNNING.
   */
  setRunning() {
    if (this.state === "READY" || this.state === "RUNNING") {
      this.state = "RUNNING";
    }
  }

  /**
   * Принудительное завершение процесса.
   */
  terminate() {
    this.state = "TERMINATED";
  }

  /**
   * Проверка: завершён ли процесс?
   * @returns {boolean}
   */
  isTerminated() {
    return this.state === "TERMINATED";
  }

  /** Повышает приоритет при ожидании (старение) */
  applyAging(step: number, maxPriority: number) {
    this.agingCounter += 1;
    this.dynamicPriority = Math.min(maxPriority, this.dynamicPriority + step);
  }

  /** Понижает приоритет после выполнения (штраф) */
  applyRunPenalty(step: number, minPriority: number) {
    this.dynamicPriority = Math.max(minPriority, this.dynamicPriority - step);
    this.agingCounter = 0;
  }

  setCurrentCommand(cmd: Command | null) {
    this.currentCommand = cmd;
  }

  getCurrentCommandDescription(): string {
    return this.currentCommand ? this.currentCommand.getDescription() : "";
  }
}
