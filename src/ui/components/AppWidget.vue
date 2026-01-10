<script setup lang="ts">
const props = defineProps({ name: String });
</script>

<template>
  <div class="widget corner_border">
    <span class="widget__header">{{ props.name }}</span>
    <slot />
  </div>
</template>

<style scoped>
.widget {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.corner_border {
  --corner: var(--second-text);
  --line: var(--border);
  --w: 1px;
  --l: 16px;
  --gap: 8px;

  background:
    /* corners */
    linear-gradient(var(--corner), var(--corner)) left top,
    linear-gradient(var(--corner), var(--corner)) left top,

    linear-gradient(var(--corner), var(--corner)) right top,
    linear-gradient(var(--corner), var(--corner)) right top,

    linear-gradient(var(--corner), var(--corner)) left bottom,
    linear-gradient(var(--corner), var(--corner)) left bottom,

    linear-gradient(var(--corner), var(--corner)) right bottom,
    linear-gradient(var(--corner), var(--corner)) right bottom,

    /* top line */
    linear-gradient(var(--line), var(--line)) top center,

    /* bottom line */
    linear-gradient(var(--line), var(--line)) bottom center,

    /* left line */
    linear-gradient(var(--line), var(--line)) center left,

    /* right line */
    linear-gradient(var(--line), var(--line)) center right;

  background-size:
    var(--l) var(--w), var(--w) var(--l),
    var(--l) var(--w), var(--w) var(--l),
    var(--l) var(--w), var(--w) var(--l),
    var(--l) var(--w), var(--w) var(--l),

    calc(100% - (var(--l) * 2) - (var(--gap) * 2)) var(--w),
    calc(100% - (var(--l) * 2) - (var(--gap) * 2)) var(--w),
    var(--w) calc(100% - (var(--l) * 2) - (var(--gap) * 2)),
    var(--w) calc(100% - (var(--l) * 2) - (var(--gap) * 2));

  background-repeat: no-repeat;

  background-position:
    left top, left top,
    right top, right top,
    left bottom, left bottom,
    right bottom, right bottom,

    center top,
    center bottom,
    left center,
    right center;
}


.widget__header {
  text-transform: uppercase;
}
</style>
