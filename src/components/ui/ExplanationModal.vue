<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="$emit('update:modelValue', false)"
      >
        <!-- Backdrop -->
        <div
          class="modal-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="$emit('update:modelValue', false)"
        />
        <!-- Modal -->
        <!-- モバイルは余白を詰めて画面いっぱいに、md以上は従来の余白 -->
        <div class="modal-panel relative z-10 m-3 flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:m-6 md:h-[90vh]">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-backdrop,
.modal-leave-active .modal-backdrop {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 1;
}
.modal-enter-from .modal-backdrop,
.modal-leave-to .modal-backdrop {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: scale(0.9);
}
</style>
