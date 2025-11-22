<script setup lang="ts">
import { computed, ComputedRef, inject, ref } from "vue";
import OS from "../../core/OS";
import BaseInputRange from "./base/BaseInputRange.vue";

const barsCount = 38;

const memory = inject<OS>("os")!.memoryManager;

const filledBars = computed(() => {
  const ratio = memory.filledMemory.value / memory.totalMemory.value;
  return Math.ceil(ratio * barsCount);
});
</script>

<template>
  <div class="memory_inner">
    <div class="data">
      <div class="data_col">
        <span>
          Used: {{ memory.filledMemory.value }}
          <span class="units"> bytes</span>
        </span>
        <span>
          Free:
          <span
            :class="{
              good: memory.freeMemory.value >= 0.8 * memory.totalMemory.value,
              bad: memory.freeMemory.value < 0.3 * memory.totalMemory.value,
            }"
            >{{ memory.freeMemory.value }}</span
          >
          <span class="units"> bytes</span>
        </span>
      </div>
      <BaseInputRange
        class="memory_range"
        label="Total:"
        :min="16"
        :max="1024"
        :step="16"
        units="bytes"
        v-model="memory.totalMemory.value"
      />
    </div>
    <div class="diagram">
      <div
        v-for="n in barsCount"
        :key="n"
        class="diagram_block"
        :class="{ filled: n <= filledBars }"
      />
    </div>
  </div>
</template>

<style scoped>
.memory_inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  height: 100%;
  position: relative;
}

.data {
  display: flex;
  gap: 2.25rem;
}

.data_col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.units {
  font-size: 0.75rem;
  color: var(--second-text);
}

.memory_range {
  width: 300px;
}

.diagram {
  height: 60px;
  position: relative;
  display: flex;
  justify-content: space-between;
}

.diagram_block {
  width: 9px;
  height: 100%;
  background-color: var(--border);
}

.filled {
  background-color: var(--second-text);
}
</style>
