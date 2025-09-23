import Process from "./Process";
import { SchedulerConfig } from "../config";

/**
 * Планировщик с относительными приоритетами.
 * READY-процессы стареют (рост приоритета), RUNNING получает штраф.
 */
export default class Scheduler {
  private readyQueue: Process[];
  private cfg: SchedulerConfig;
  private tickCounter: number;

  constructor(cfg: SchedulerConfig) {
    this.readyQueue = [];
    this.cfg = cfg;
    this.tickCounter = 0;
  }

  onProcessReady(p: Process) {
    // Процесс попадает в очередь готовности
    if (!this.readyQueue.includes(p)) {
      this.readyQueue.push(p);
      this.sortQueue();
    }
  }

  onProcessBlocked(p: Process) {
    // Удалить из очереди, если там есть
    this.removeFromQueue(p);
  }

  onProcessUnblocked(p: Process) {
    // Вернуть в READY очередь
    this.onProcessReady(p);
  }

  onProcessTerminated(p: Process) {
    this.removeFromQueue(p);
  }

  onQuantumExpired(p: Process) {
    // Штраф за выполнение
    p.applyRunPenalty(this.cfg.runPenaltyStep, this.cfg.minPriority);
    // Процесс больше не должен оставаться RUNNING
    p.setReady();
    // Вернуть в очередь готовности
    this.onProcessReady(p);
  }

  /**
   * Старение процессов в очереди готовности.
   */
  tickAging() {
    this.tickCounter += 1;
    const interval = this.cfg.agingIntervalTicks || 1;
    if (this.tickCounter % interval !== 0) return;

    for (const p of this.readyQueue) {
      p.applyAging(this.cfg.agingStep, this.cfg.maxPriority);
    }
    this.sortQueue();
  }

  /**
   * Выбор следующего процесса с максимальным динамическим приоритетом.
   */
  getNextProcessForCPU(): Process | null {
    if (this.readyQueue.length === 0) return null;
    // Очередь уже отсортирована по dynamicPriority убыв.
    const next = this.readyQueue.shift() || null;
    return next || null;
  }

  private sortQueue() {
    this.readyQueue.sort((a, b) => b.dynamicPriority - a.dynamicPriority);
  }

  private removeFromQueue(p: Process) {
    const idx = this.readyQueue.indexOf(p);
    if (idx !== -1) this.readyQueue.splice(idx, 1);
  }
}


