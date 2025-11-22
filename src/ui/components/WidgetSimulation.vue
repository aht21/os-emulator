<script setup lang="ts">
import { inject, onMounted, onBeforeUnmount, ref, watch } from "vue";
import OS from "../../core/OS";
import BaseInputRadio from "./base/BaseInputRadio.vue";

const os = inject<OS>("os")!;
const sim = os.simEngine;

const autoMode = ref(sim.isAutoModeEnabled() ? "on" : "off");
const workingTime = ref("00:00:00");

let timer: number | null = null;

onMounted(() => {
  workingTime.value = sim.getWorkingTimeFormatted();

  timer = window.setInterval(() => {
    workingTime.value = sim.getWorkingTimeFormatted();
  }, 1000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

watch(autoMode, (v) => sim.setAutoMode(v === "on"), { immediate: true });
</script>

<template>
  <div class="simulation_inner">
    <div class="first_group">
      <span>Working time: {{ workingTime }}</span>

      <BaseInputRadio
        v-model="autoMode"
        label="Auto mode:"
        :items="[
          { value: 'on', label: 'on' },
          { value: 'off', label: 'off' },
        ]"
      />
    </div>

    <div class="buttons_group">
      <button class="btn" @click="sim.start">start</button>
      <button class="btn" @click="sim.stop">stop</button>
      <button class="btn" @click="sim.reboot">reboot</button>
    </div>
  </div>
</template>

<style scoped>
.simulation_inner {
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  height: 100%;
}

.first_group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.buttons_group {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
</style>
