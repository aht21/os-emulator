<script setup lang="ts">
import { PropType } from "vue";

type Item = {
  label: string;
  value: string;
};

const model = defineModel({ required: true });

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  items: {
    type: Array as PropType<Item[]>,
    required: true,
  },
});
</script>

<template>
  <fieldset class="input_toggle_wrapper">
    <legend class="legend">{{ props.label }}</legend>
    <div
      v-for="item in items"
      :key="item.value"
      :class="['radio_item', { checked: model === item.value }]"
    >
      <input
        type="radio"
        :id="item.value"
        name="autoMode"
        :value="item.value"
        :checked="item.value === model"
        @change="model = item.value"
      />
      <label :for="item.value">{{ item.label }}</label>
    </div>
  </fieldset>
</template>

<style scoped>
.input_toggle_wrapper {
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.radio_item {
  color: var(--second-text);
}

.radio_item.checked {
  color: var(--text);
}

.radio_item > input {
  display: none;
}

.radio_item > label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio_item > label::before {
  content: "";
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border: 1px solid var(--border);
}

.radio_item.checked > label::before {
  background-color: var(--text);
  outline: 1px solid var(--border);
}
</style>
