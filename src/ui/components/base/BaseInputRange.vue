<script setup lang="ts">
const model = defineModel({ required: true });

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  min: {
    type: Number,
    required: false,
  },
  max: {
    type: Number,
    required: false,
  },
  step: {
    type: Number,
    required: false,
  },
  units: {
    type: String,
    required: false,
  },
  width: {
    type: String,
    required: false,
  },
});
</script>

<template>
  <div class="range_input_wrapper">
    <label :for="props.id">
      {{ props.label }} {{ model }}
      <span class="units"> {{ props.units }}</span>
    </label>
    <input
      class="range_input"
      type="range"
      :id="props.id"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      v-model="model"
    />
    <span class="minimum">{{ props.min }}</span>
    <span class="maximum">{{ props.max }}</span>
  </div>
</template>

<style scoped>
.range_input_wrapper {
  display: flex;
  flex-direction: column;
  gap: 26px;
  position: relative;
  padding-bottom: 5px;
}

.units {
  font-size: 0.75rem;
  color: var(--second-text);
}

.range_input {
  appearance: none;
  height: 2px;
  background-color: var(--border);
  cursor: pointer;
  border: 1px solid var(--bg);
}

.range_input:hover {
  border: 1px solid var(--text);
}

.range_input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 8px;
  height: 18px;
  background: var(--second-text);
  border: 1px solid var(--bg);
}

.range_input:hover::-webkit-slider-thumb {
  border: 1px solid var(--text);
}

.range_input::-moz-range-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 8px;
  height: 18px;
  border: none;
  background: var(--second-text);
  transition: 300ms;
}

.range_input_wrapper label:hover + .range_input,
.range_input_wrapper label:hover + .range_input::-webkit-slider-thumb {
  border-color: var(--bg);
}

.minimum {
  font-size: 0.75rem;
  color: var(--second-text);
  position: absolute;
  top: 23px;
  left: 0;
}

.maximum {
  font-size: 0.75rem;
  color: var(--second-text);
  position: absolute;
  top: 23px;
  right: 0;
}
</style>
