import Process from "./Process";
import { schedulerConfig } from "./config";

export default class Scheduler {
  private readyQueue: Process[] = [];

  runPenaltyStep = schedulerConfig.runPenaltyStep;
  minPriority = schedulerConfig.minPriority;
  maxPriority = schedulerConfig.maxPriority;
  agingStep = schedulerConfig.agingStep;
  agingIntervalTicks = schedulerConfig.agingIntervalTicks;

  private tickCounter = 0;

  onProcessReady(p: Process) {
    if (!this.readyQueue.some((q) => q.id === p.id)) {
      p.setReady(); // Гарантируем состояние READY
      this.readyQueue.push(p);
      // Сортируем только при добавлении, чтобы очередь всегда была готова
      this.sortQueue();
    }
  }

  onProcessTerminated(p: Process) {
    const index = this.readyQueue.findIndex((q) => q.id === p.id);
    if (index !== -1) {
      this.readyQueue.splice(index, 1);
    }
  }

  onQuantumExpired(p: Process) {
    p.applyRunPenalty(this.runPenaltyStep.value, this.minPriority.value);

    this.onProcessReady(p);
  }

  tickAging() {
    this.tickCounter++;
    const interval = this.agingIntervalTicks.value || 1;

    if (this.tickCounter % interval === 0) {
      for (const p of this.readyQueue) {
        p.applyAging(this.agingStep.value, this.maxPriority.value);
      }
      this.sortQueue();
    }
  }

  getNextProcessForCPU(): Process | null {
    if (this.readyQueue.length === 0) return null;

    const nextProc = this.readyQueue.shift();
    return nextProc ?? null;
  }

  private sortQueue() {
    this.readyQueue.sort((a, b) => b.dynamicPriority - a.dynamicPriority);
  }

  getReadyCount(): number {
    return this.readyQueue.length;
  }
}
