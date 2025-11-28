<script setup lang="ts">
const model = defineModel({ required: true });

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  labelHidden: { type: Boolean, default: false },
});
</script>

<template>
  <label :class="{ d_none: props.labelHidden }" :for="props.id">
    {{ props.label }}
  </label>
  <input
    class="number_input"
    type="number"
    :name="props.id"
    :id="props.id"
    v-model="model"
  />
</template>

<style scoped>
.d_none {
  display: none;
}

.number_input::-webkit-inner-spin-button,
.number_input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number_input {
  appearance: textfield;
  width: 3rem;
  border: 1px solid var(--border);
  padding: 0.1rem 0.2rem;
  background-color: var(--bg);
  color: var(--text);
}

.number_input:hover {
  border: 1px solid var(--text);
}

.number_input:focus {
  outline: 1px dashed var(--text);
}
</style>
