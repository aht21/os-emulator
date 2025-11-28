<script setup lang="ts">
import { inject, ref } from "vue";
import OS from "../../core/OS";
import Process from "../../core/Process";

const os: OS | undefined = inject("os");
const processes = os!.processTable.processes;

const tab = ref<"main" | "analysis">("main");

const loadProcess = () => {
  os!.initialLoad();
};

const addProcess = () => {
  os!.loadProcess();
};

const clearProcesses = () => {
  os!.clearProcesses();
};

const removeProcess = (id: number) => {
  os!.removeProcessByPid(id);
};

const getCommand = (process: Process): String => {
  const command = process.currentCommand;
  if (!command) return "-";

  if (command.type === "COMPUTE") {
    return `${command.operation}(${command.operand1}, ${command.operand2})`;
  } else {
    return command.type;
  }
};
</script>

<template>
  <div class="process_table_inner">
    <div class="table_block">
      <div class="tabs">
        <button
          type="button"
          :class="['tab', { active: tab === 'main' }]"
          @click="() => (tab = 'main')"
        >
          Main
        </button>
        <button
          type="button"
          :class="['tab', { active: tab === 'analysis' }]"
          @click="() => (tab = 'analysis')"
        >
          Analysis
        </button>
      </div>
      <div class="table_wrapper">
        <table class="table" v-if="tab === 'main'">
          <thead class="table__header">
            <tr>
              <th class="th_no">No</th>
              <th class="th_pid">PID</th>
              <th class="th_state">State</th>
              <th>PriorityBase</th>
              <th>PriorityDyn</th>
              <th class="th_command">Command</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(process, index) in processes" :key="process.id">
              <td>{{ index + 1 }}</td>
              <td>{{ process.id }}</td>
              <td>
                <span
                  :class="{
                    good: process.state === 'RUNNING',
                    bad:
                      process.state === 'BLOCKED_IO' ||
                      process.state === 'BLOCKED_MEM',
                    second: process.state === 'TERMINATED',
                  }"
                >
                  {{ process.state }}
                </span>
              </td>
              <td>{{ process.basePriority }}</td>
              <td>{{ process.dynamicPriority }}</td>
              <td>
                {{ process.state === "RUNNING" ? getCommand(process) : "-" }}
              </td>
              <td>
                <button
                  class="btn delete_btn"
                  @click="() => removeProcess(process.id)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="table" v-if="tab === 'analysis'">
          <thead class="table__header">
            <tr>
              <th class="th_no">No</th>
              <th class="th_pid">PID</th>
              <th class="th_state">State</th>
              <th>Instr</th>
              <th>Run</th>
              <th>Wait</th>
              <th>IO</th>
              <th>OvhIO</th>
              <th>OvhCtx</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(process, index) in processes" :key="process.id">
              <td>{{ index + 1 }}</td>
              <td>{{ process.id }}</td>
              <td>
                <span
                  :class="{
                    good: process.state === 'RUNNING',
                    bad:
                      process.state === 'BLOCKED_IO' ||
                      process.state === 'BLOCKED_MEM',
                    second: process.state === 'TERMINATED',
                  }"
                >
                  {{ process.state }}
                </span>
              </td>
              <td>{{ process.totalInstructions }}</td>
              <td>{{ process.runTicks }}</td>
              <td>{{ process.waitTicks }}</td>
              <td>{{ process.ioBusyTicks }}</td>
              <td>
                {{
                  (process.ioInitOverheadTicks ?? 0) +
                  (process.ioInterruptServiceTicks ?? 0)
                }}
              </td>
              <td>{{ process.contextSwitchOverheadTicks }}</td>
              <td>
                <button
                  class="btn delete_btn"
                  @click="() => removeProcess(process.id)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="process_settings_block"></div>
    <div class="buttons_group">
      <button type="button" class="btn" @click="loadProcess">fill table</button>
      <button type="button" class="btn" @click="addProcess">
        create process
      </button>
      <button type="button" class="btn" @click="clearProcesses">
        clear table
      </button>
    </div>
  </div>
</template>

<style scoped>
.process_table_inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1em;
}

.table_block {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.tabs {
  width: 100%;
  border-bottom: 1px solid var(--border);
  display: flex;
}

.tab {
  display: flex;
  border: none;
  background-color: inherit;
  color: var(--second-text);
  cursor: pointer;
  padding: 0.3rem 0.8rem;
}

.tab.active {
  color: var(--text);
  border-bottom: 1px solid var(--text);
}

.table_wrapper {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  scrollbar-width: none;
  -ms-overflow-style: none;
  height: 360px;
  max-height: 360px;
  border: 1px solid var(--border);
}

.table_wrapper::-webkit-scrollbar {
  display: none;
}

.table {
  font-size: 0.75rem;
  border-collapse: collapse;
}

.table th {
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
  font-weight: 400;
  padding: 0.2rem;
  color: var(--text);
  background-color: var(--border);
  box-sizing: border-box;
}

.table td {
  padding: 0.2rem;
}

.th_no {
  width: 40px;
}

.th_pid {
  width: 40px;
}

.th_state {
  width: 100px;
}

.th_command {
  width: 120px;
}

.buttons_group {
  display: flex;
  gap: 0.75rem;
}

.delete_btn {
  color: var(--second-text);
  font-size: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 18px;
}

.delete_btn:hover {
  color: var(--bad);
  border-color: var(--bad);
}
</style>
