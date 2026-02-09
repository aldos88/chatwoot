<script setup>
import { ref } from 'vue';
import { useUISettings } from 'dashboard/composables/useUISettings';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const { updateUISettings } = useUISettings();

const activeAction = ref(null);
const resultText = ref('');

const actions = [
  { key: 'summarize', label: 'Summarize conversation', icon: 'i-lucide-file-text' },
  { key: 'suggest', label: 'Suggest a reply', icon: 'i-lucide-message-square' },
  { key: 'sentiment', label: 'Check sentiment', icon: 'i-lucide-heart-pulse' },
];

const mockResults = {
  summarize:
    'The customer asked about appointment availability for next week. The agent confirmed Tuesday and Thursday slots are open and requested a preferred time.',
  suggest:
    'Hi! Thank you for reaching out. I can confirm we have availability on Tuesday at 10 AM and Thursday at 2 PM. Would either of those work for you?',
  sentiment:
    'Overall sentiment: Positive. The customer is engaged and interested in booking. No signs of frustration detected.',
};

const handleAction = action => {
  activeAction.value = action.key;
  resultText.value = mockResults[action.key];
};

const handleUse = () => {
  // eslint-disable-next-line no-console
  console.log('[HimatildaCopilot] Use this:', activeAction.value, resultText.value);
};

const closeCopilotPanel = () => {
  updateUISettings({
    is_copilot_panel_open: false,
    is_contact_sidebar_open: false,
  });
};
</script>

<template>
  <div class="flex flex-col h-full text-sm leading-6 tracking-tight w-full">
    <SidebarActionsHeader
      title="Copilot"
      @close="closeCopilotPanel"
    />

    <div class="flex-1 flex flex-col px-4 py-4 overflow-y-auto gap-6">
      <!-- Empty state / intro -->
      <div class="flex flex-col space-y-4 py-2">
        <div class="space-y-1">
          <h3 class="text-base font-medium text-n-slate-12 leading-8">
            Himatilda Copilot
          </h3>
          <p class="text-sm text-n-slate-11 leading-6">
            Get quick insights about this conversation.
          </p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="w-full space-y-2">
        <span class="text-xs text-n-slate-10 block">Try these actions</span>
        <div class="space-y-1">
          <button
            v-for="action in actions"
            :key="action.key"
            class="w-full px-3 py-2 rounded-md border border-n-weak bg-n-slate-2 text-n-slate-11 flex items-center justify-between hover:bg-n-slate-3 transition-colors"
            :class="{
              'border-n-blue-7 bg-n-blue-2 text-n-blue-11':
                activeAction === action.key,
            }"
            @click="handleAction(action)"
          >
            <span class="flex items-center gap-2">
              <Icon :icon="action.icon" class="text-base" />
              <span>{{ action.label }}</span>
            </span>
            <Icon icon="i-lucide-chevron-right" />
          </button>
        </div>
      </div>

      <!-- Result card -->
      <div
        v-if="activeAction"
        class="w-full rounded-lg border border-n-weak bg-n-surface-1 p-4 space-y-3"
      >
        <div class="font-medium text-n-slate-12">Copilot</div>
        <p class="text-n-slate-11 break-words whitespace-pre-wrap">
          {{ resultText }}
        </p>
        <div class="flex flex-row mt-1">
          <Button
            label="Use this"
            faded
            sm
            slate
            @click="handleUse"
          />
        </div>
      </div>
    </div>
  </div>
</template>
