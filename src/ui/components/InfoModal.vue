<script setup lang="ts">
import { ref } from "vue";
import BaseModal from "./base/BaseModal.vue";

const showModal = ref(false);
</script>

<template>
  <div>
    <button class="btn" @click="showModal = !showModal">info</button>
    <BaseModal v-model="showModal">
      <h2>OS Emulator</h2>
      <p>
        This is a simple operating system emulator built with Vue.js and
        TypeScript. It simulates basic OS functionalities such as process
        management, memory allocation, and file handling.
      </p>
      <p>
        <b>Run:</b> Use Simulation widget — start/stop, toggle Auto mode, or
        randomize parameters.
      </p>
      <b>Main controls:</b>
      <ul>
        <li>CPU: cores (threadCount) and speed (ticksPerSecond).</li>
        <li>Memory: total memory (totalMemory).</li>
        <li>Job generator: process memory and instruction ranges.</li>
        <li>
          Scheduler: quantum, base/dynamic priorities, aging and run-penalty.
        </li>
        <li>
          Process table: view/delete/create processes, see runtime and analysis
          stats.
        </li>
      </ul>
      <p>
        <b>Key params:</b> totalMemory, maxProcesses, threadCount,
        ticksPerSecond, quantum, basePriority, agingStep, runPenaltyStep,
        ioProb, ioMinTime/ioMaxTime.
      </p>
      <p>
        <b>Quick tips:</b>
        <br />lower quantum → more context switches; <br />reduce totalMemory →
        memory blocking; <br />increase ioProb/ioMaxTime → more I/O blocking.
      </p>
      <p>
        Check out the source code on
        <a href="https://github.com/aht21/os-emulator" target="_blank">GitHub</a
        >.
      </p>
    </BaseModal>
  </div>
</template>
