<script setup lang="ts">
import { inject } from "vue";
import OS from "../../core/OS";

const metrics = inject<OS>("os")!.metrics;
</script>

<template>
  <div class="performance_inner">
    <div class="col">
      <span class="col__header">Queue stats</span>
      <span>
        Running avg: {{ metrics.avgRunningTicks }}
        <span class="units"> ticks</span>
      </span>
      <span>
        Blocked avg: {{ metrics.avgBlockedTicks }}
        <span class="units"> ticks</span>
      </span>
      <span>
        Completed: {{ metrics.completedProcessesCount }}
        <span class="units"> processes</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.performance_inner {
  display: flex;
  font-size: 0.875rem;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.col__header {
  text-transform: uppercase;
}

.units {
  font-size: 0.75rem;
  color: var(--second-text);
}
</style>
