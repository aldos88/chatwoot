<script setup>
import { ref, computed } from 'vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useMapGetter } from 'dashboard/composables/store';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import himatildaAPI from 'dashboard/api/himatilda';

const { updateUISettings } = useUISettings();

const currentChat = useMapGetter('getSelectedChat');
const accountId = useMapGetter('getCurrentAccountId');
const currentUser = useMapGetter('getCurrentUser');
const inboxes = useMapGetter('inboxes/getInboxes');

const currentInboxType = computed(() => {
  const inboxId = currentChat.value?.inbox_id;
  const inbox = inboxes.value.find(i => i.id === inboxId);
  return inbox?.channel_type || '';
});

const useRichEditor = computed(() =>
  [INBOX_TYPES.WEB, INBOX_TYPES.EMAIL].includes(currentInboxType.value)
);

const resolvedAssigneeId = computed(
  () => currentChat.value?.meta?.assignee?.id || currentUser.value?.id
);

const basePayload = computed(() => {
  const aId = accountId.value;
  const iId = currentChat.value?.inbox_id;
  const opId = resolvedAssigneeId.value;
  return {
    accountId: aId,
    conversationId: currentChat.value?.id,
    inboxId: iId,
    assigneeId: opId,
    operatorSessionKey: `cw:${aId ?? 'na'}:${iId ?? 'na'}:op:${opId ?? 'na'}`,
  };
});

const activeAction = ref(null);
const resultText = ref('');
const loading = ref(false);
const errorMessage = ref('');
const rewriteInput = ref('');

const actions = [
  { key: 'summarize', label: 'Summarize conversation', icon: 'i-lucide-file-text' },
  { key: 'suggest', label: 'Suggest a reply', icon: 'i-lucide-message-square' },
  { key: 'rewrite', label: 'Rewrite draft', icon: 'i-lucide-pencil-line' },
];

const callAPI = async key => {
  const payload = basePayload.value;
  if (key === 'summarize') {
    return himatildaAPI.summarize(payload);
  }
  if (key === 'suggest') {
    return himatildaAPI.suggestReply(payload);
  }
  if (key === 'rewrite') {
    return himatildaAPI.rewrite({ ...payload, text: rewriteInput.value });
  }
  return null;
};

const handleAction = async action => {
  activeAction.value = action.key;
  resultText.value = '';
  errorMessage.value = '';

  // For rewrite, wait for user to submit text first
  if (action.key === 'rewrite') {
    return;
  }

  loading.value = true;
  try {
    const res = await callAPI(action.key);
    resultText.value = res?.data?.text || '';
  } catch (err) {
    errorMessage.value = err?.message || 'Something went wrong';
  } finally {
    loading.value = false;
  }
};

const handleRewriteSubmit = async () => {
  if (!rewriteInput.value.trim()) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await callAPI('rewrite');
    resultText.value = res?.data?.text || '';
  } catch (err) {
    errorMessage.value = err?.message || 'Something went wrong';
  } finally {
    loading.value = false;
  }
};

// Strip Markdown bold markers before inserting into composer
const sanitizeForComposer = (s = '') => {
  let t = String(s);
  t = t.replace(/\*\*(.+?)\*\*/gs, '$1');
  t = t.replace(/__(.+?)__/gs, '$1');
  t = t.replace(/^\s*\*\*+/g, '');
  t = t.replace(/\*\*+\s*$/g, '');
  t = t.replace(/^\s*__+/g, '');
  t = t.replace(/__+\s*$/g, '');
  return t;
};

const handleUse = () => {
  if (!resultText.value) return;
  const event = useRichEditor.value
    ? BUS_EVENTS.INSERT_INTO_RICH_EDITOR
    : BUS_EVENTS.INSERT_INTO_NORMAL_EDITOR;
  emitter.emit(event, sanitizeForComposer(resultText.value));
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
            :disabled="loading"
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

      <!-- Rewrite input -->
      <div
        v-if="activeAction === 'rewrite' && !resultText && !loading"
        class="w-full space-y-2"
      >
        <textarea
          v-model="rewriteInput"
          class="w-full rounded-md border border-n-weak bg-n-slate-2 text-n-slate-11 px-3 py-2 text-sm resize-none focus:outline-none focus:border-n-blue-7"
          rows="4"
          placeholder="Paste or type the draft you want to rewrite..."
        />
        <Button
          label="Rewrite"
          faded
          sm
          slate
          :disabled="!rewriteInput.trim()"
          @click="handleRewriteSubmit"
        />
      </div>

      <!-- Loading -->
      <div
        v-if="loading"
        class="w-full flex items-center gap-2 text-n-slate-10 py-2"
      >
        <Icon icon="i-lucide-loader-2" class="text-base animate-spin" />
        <span>Thinking...</span>
      </div>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="w-full rounded-md bg-n-ruby-2 border border-n-ruby-7 text-n-ruby-11 px-3 py-2 text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Result card -->
      <div
        v-if="resultText"
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
            :disabled="!resultText"
            @click="handleUse"
          />
        </div>
      </div>
    </div>
  </div>
</template>
