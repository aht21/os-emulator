<script setup lang="ts">
import { inject } from "vue";
import OS from "../../core/OS";
import BaseInputRange from "./base/BaseInputRange.vue";

const cpu = inject<OS>("os")!.cpu;
</script>

<template>
  <div class="cpu_inner">
    <span>
      Status:
      <span :class="{ good: cpu.state.value === 'WORKING' }">
        {{ cpu.state.value }}
      </span>
    </span>
    <BaseInputRange
      label="Core count:"
      :min="1"
      :max="8"
      :step="1"
      v-model="cpu.threadCount.value"
    />
    <BaseInputRange
      label="Speed:"
      :min="1"
      :max="80"
      :step="1"
      units="beats/tick"
      v-model="cpu.ticksPerSecond.value"
    />
  </div>
</template>

<style scoped>
.cpu_inner {
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  position: relative;
}
</style>
