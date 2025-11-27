import { ref, Ref } from "vue";

export default class Metrics {
  totalTicks: Ref<number>;
  avgRunningTicks: Ref<number>;
  avgBlockedTicks: Ref<number>;
  completedProcessesCount: Ref<number>;

  busyThreadTicks: number;
  sumTurnaround: number;
  sumWaiting: number;
  sumService: number;
  readyQueueSamples: number;
  readyQueueSamplesCount: number;
  lastExecuted: number[];

  constructor() {
    this.totalTicks = ref(0);
    this.avgRunningTicks = ref(0);
    this.avgBlockedTicks = ref(0);
    this.completedProcessesCount = ref(0);

    this.busyThreadTicks = 0;
    this.sumTurnaround = 0;
    this.sumWaiting = 0;
    this.sumService = 0;
    this.readyQueueSamples = 0;
    this.readyQueueSamplesCount = 0;
    this.lastExecuted = [];
  }

  reset() {
    this.totalTicks.value = 0;
    this.avgRunningTicks.value = 0;
    this.avgBlockedTicks.value = 0;
    this.completedProcessesCount.value = 0;

    this.busyThreadTicks = 0;

    this.sumTurnaround = 0;
    this.sumWaiting = 0;
    this.sumService = 0;
    this.readyQueueSamples = 0;
    this.readyQueueSamplesCount = 0;
    this.lastExecuted = [];
  }
}
