<script setup lang="ts">
import { inject } from "vue";
import OS from "../../core/OS";
import BaseInputNumber from "./base/BaseInputNumber.vue";

const jobGenerator = inject<OS>("os")!.jobGenerator;
</script>

<template>
  <div class="process_generator_inner">
    <div class="input_block">
      <span class="input_header">Used memory:</span>
      <div class="inputs">
        <BaseInputNumber
          id="used_memory_min"
          label="Minimal used memory"
          :label-hidden="true"
          v-model="jobGenerator.minMemory.value"
        />
        —
        <BaseInputNumber
          id="used_memory_max"
          label="Maximum used memory"
          :label-hidden="true"
          v-model="jobGenerator.maxMemory.value"
        />
        <span class="units">bytes</span>
      </div>
    </div>
    <div class="input_block">
      <span class="input_header">Used instructions:</span>
      <div class="inputs">
        <BaseInputNumber
          id="used_instructions_min"
          label="Minimal used instructions"
          :label-hidden="true"
          v-model="jobGenerator.minInstructions.value"
        />
        —
        <BaseInputNumber
          id="used_instructions_max"
          label="Maximum used instructions"
          :label-hidden="true"
          v-model="jobGenerator.maxInstructions.value"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.process_generator_inner {
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
  height: 100%;
  position: relative;
  gap: 1rem;
}

.input_block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.units {
  font-size: 0.75rem;
  color: var(--second-text);
  margin-left: 0.5rem;
}
</style>
