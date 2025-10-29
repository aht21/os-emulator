import Process from "./Process";

export type CPUState = "WORKING" | "IDLE";

/**
 * Класс CPU выполняет такты процессов (поддержка многопоточности)
 */
export default class CPU {
  activeProcesses: Process[];
  state: CPUState;
  maxThreads: number;

  constructor(maxThreads: number = 1) {
    this.activeProcesses = [];
    this.state = "IDLE";
    this.maxThreads = maxThreads;
  }

  /**
   * Устанавливает активный процесс
   * @param process
   */
  setProcess(process: Process, quantum: number) {
    if (this.activeProcesses.length >= this.maxThreads) {
      throw new Error(`CPU уже выполняет максимальное количество процессов (${this.maxThreads})`);
    }
    
    this.activeProcesses.push(process);
    if (process && process.state === "READY") {
      process.setRunning();
    }
    this.state = "WORKING";
  }

  clearProcess(process: Process) {
    const index = this.activeProcesses.indexOf(process);
    if (index !== -1) {
      this.activeProcesses.splice(index, 1);
    }
    if (this.activeProcesses.length === 0) {
      this.state = "IDLE";
    }
  }

  /**
   * Выполняет один такт для всех активных процессов
   */
  tick() {
    for (let i = this.activeProcesses.length - 1; i >= 0; i--) {
      const process = this.activeProcesses[i];
      process.tick();

      if (process.isTerminated()) {
        this.activeProcesses.splice(i, 1);
      }
    }

    if (this.activeProcesses.length === 0) {
      this.state = "IDLE";
    }
  }

  /**
   * Получить текущий активный процесс (первый)
   * @returns {Process | null}
   */
  getCurrentProcess() {
    return this.activeProcesses.length > 0 ? this.activeProcesses[0] : null;
  }

  getAllActiveProcesses(): Process[] {
    return [...this.activeProcesses];
  }

  isQuantumExpired(process: Process): boolean {
    // Для многопоточности каждый процесс имеет свой квант
    return process.state === "RUNNING" && process.pc % 5 === 0; // упрощённая проверка кванта
  }

  isIdle(): boolean {
    return this.activeProcesses.length === 0;
  }

  hasSpace(): boolean {
    return this.activeProcesses.length < this.maxThreads;
  }
}