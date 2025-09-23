import Process from "./Process";

export type CPUState = "WORKING" | "IDLE";

/**
 * Класс CPU выполняет такты процесса
 */
export default class CPU {
  currentProcess: Process | null;
  state: CPUState;
  remainingQuantum: number;

  constructor() {
    this.currentProcess = null; // активный процесс (Process)
    this.state = "IDLE";
    this.remainingQuantum = 0;
  }

  /**
   * Устанавливает активный процесс
   * @param process
   */
  setProcess(process: Process, quantum: number) {
    this.currentProcess = process;
    if (process && process.state === "READY") {
      process.setRunning();
    }
    this.remainingQuantum = quantum;
    this.state = "WORKING";
  }

  /**
   * Выполняет один такт активного процесса
   */
  tick() {
    if (!this.currentProcess) return;

    this.currentProcess.tick();
    if (this.remainingQuantum > 0) this.remainingQuantum -= 1;

    if (this.currentProcess.isTerminated()) {
      this.currentProcess = null; // процесс завершён
      this.state = "IDLE";
      this.remainingQuantum = 0;
    }
  }

  /**
   * Получить текущий активный процесс
   * @returns {Process | null}
   */
  getCurrentProcess() {
    return this.currentProcess;
  }

  isQuantumExpired(): boolean {
    return !!this.currentProcess && this.remainingQuantum <= 0;
  }

  isIdle(): boolean {
    return this.currentProcess === null;
  }
}
