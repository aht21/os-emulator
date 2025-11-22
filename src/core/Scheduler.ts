import { schedulerConfig } from "../config";
import Process from "./Process";

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
      this.readyQueue.push(p);
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
    p.setReady();
    this.readyQueue.push(p);
    this.sortQueue();
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
    this.sortQueue();
    return this.readyQueue.shift() ?? null;
  }

  private sortQueue() {
    this.readyQueue.sort((a, b) => b.dynamicPriority - a.dynamicPriority); // Высший приоритет сначала
  }

  getReadyCount(): number {
    return this.readyQueue.length;
  }
}
