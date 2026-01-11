<script setup lang="ts">
import AppWidget from "./AppWidget.vue";
import WidgetCPU from "./WidgetCPU.vue";
import WidgetMemory from "./WidgetMemory.vue";
import WidgetPerformance from "./WidgetPerformance.vue";
import WidgetProcessGenerator from "./WidgetProcessGenerator.vue";
import WidgetProcessTable from "./WidgetProcessTable.vue";
import WidgetSimulation from "./WidgetSimulation.vue";
</script>

<template>
  <div class="container dashboard_overflow">
    <AppWidget name="simulation" class="simulation">
      <WidgetSimulation />
    </AppWidget>
    <AppWidget name="cpu" class="cpu">
      <WidgetCPU />
    </AppWidget>
    <AppWidget name="process table" class="process_table">
      <WidgetProcessTable />
    </AppWidget>
    <AppWidget name="memory" class="memory">
      <WidgetMemory />
    </AppWidget>
    <AppWidget name="performance" class="performance">
      <WidgetPerformance />
    </AppWidget>
    <AppWidget name="process generator" class="process_generator">
      <WidgetProcessGenerator />
    </AppWidget>
  </div>
</template>

<style scoped>
.dashboard_overflow {
  flex: 1;
  display: grid;
  grid-template-areas:
    "simulation cpu process_table process_table"
    "memory memory process_table process_table"
    "performance performance performance process_generator";
  padding: 0 0 0.9rem 0;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 7fr 6fr 5fr;
  gap: 2rem;
}

.simulation {
  grid-area: simulation;
}

.cpu {
  grid-area: cpu;
}

.process_table {
  grid-area: process_table;
}

.memory {
  grid-area: memory;
}

.performance {
  grid-area: performance;
}

.process_generator {
  grid-area: process_generator;
}
</style>
