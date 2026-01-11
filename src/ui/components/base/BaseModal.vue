<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <Teleport to="body">
    <div v-if="model" class="modal_backdrop" @click.self="model = false">
      <div class="modal_content corner_border">
        <button class="modal_close_button btn" @click="() => (model = !model)">
          <svg
            class="icon"
            viewBox="0 0 21 21"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <polygon
              points="12.0183 10.5 21 19.054 19.48065 20.5 10.5 11.946 1.5183 20.5 0 19.054 8.98065 10.5 0 1.946 1.5183 0.5 10.5 9.054 19.48065 0.5 21 1.946"
            />
          </svg>
        </button>
        <div class="content_wrapper">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal_backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.modal_content {
  display: flex;
  flex-direction: column;
  background-color: var(--bg);
  width: 80vw;
  max-width: 800px;
  height: 80vh;
  max-height: 600px;
  padding: 2rem;
  position: relative;
  font-size: 0.875rem;
}

.modal_close_button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 2rem;
  background: var(--bg);
  padding: 0.3rem;
  z-index: 60;
}

.icon {
  width: 0.8rem;
  height: 0.8rem;
  color: var(--second-text);
}

.modal_close_button:hover .icon {
  color: var(--text);
}

.content_wrapper {
  height: 100%;
}
</style>
