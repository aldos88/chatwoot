<script setup>
import { ref, computed, watch, nextTick } from 'vue';
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

// --- Action buttons state (existing) ---
const activeAction = ref(null);
const resultText = ref('');
const resultMeta = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const rewriteInput = ref('');

// --- Chat state ---
const chatMessages = ref([]);
const chatInput = ref('');
const chatLoading = ref(false);
const chatScrollEl = ref(null);
let chatMsgId = 0;

const actions = [
  { key: 'summarize', label: 'Summarize conversation', icon: 'i-lucide-file-text' },
  { key: 'suggest', label: 'Suggest a reply', icon: 'i-lucide-message-square' },
  { key: 'rewrite', label: 'Rewrite draft', icon: 'i-lucide-pencil-line' },
];

// --- Quick chips ---
const CHIP_CONFIG = [
  {
    id: 'followup',
    label: 'Как сделать follow-up?',
    prompt: 'Клиент молчит. Дай мягкий follow-up в стиле Hi Sisters: 1) готовый текст, 2) следующий вопрос, 3) когда лучше написать повторно.',
    condition: 'silentLead',
  },
  {
    id: 'price',
    label: 'Как отработать возражение по цене?',
    prompt: 'Клиенту дорого. Дай вариант отработки возражения в стиле Hi Sisters без давления: 1) сообщение, 2) мягкая альтернатива (пробная/формат), 3) следующий вопрос.',
    condition: 'priceObjection',
  },
  {
    id: 'reschedule',
    label: 'Как предложить альтернативные окна?',
    prompt: 'Клиент хочет перенос. Дай ответ с альтернативными окнами и мягким удержанием записи: 1) сообщение, 2) что уточнить, 3) как не потерять клиента.',
    condition: 'reschedule',
  },
  { id: 'reply', label: 'Что ответить?', prompt: 'Что ответить?', condition: 'always' },
  { id: 'risks', label: 'Какие риски?', prompt: 'Какие риски?', condition: 'always' },
  { id: 'close', label: 'Как закрыть на запись?', prompt: 'Как закрыть на запись?', condition: 'always' },
];

const conversationSignals = computed(() => {
  const chat = currentChat.value;
  if (!chat) return {};
  const msgs = chat.messages || [];
  const lastMsg = chat.last_non_activity_message;

  // silentLead: last message is from agent → customer hasn't replied
  const silentLead = lastMsg?.message_type === 1;

  // scan last 5 customer messages for keywords
  const recentText = msgs
    .filter(m => m.message_type === 0 && !m.private)
    .slice(-5)
    .map(m => (m.content || '').toLowerCase())
    .join(' ');

  const priceObjection = /дорого|цена кусается|скидк|слишком дорого|expensive|budget|стоимость высок/.test(recentText);
  const reschedule = /перенос|перенести|другая дата|другое время|не могу прийти|не смогу|reschedule|отменить запись/.test(recentText);

  return { silentLead, priceObjection, reschedule };
});

const visibleChips = computed(() =>
  CHIP_CONFIG
    .filter(c => c.condition === 'always' || conversationSignals.value[c.condition])
    .slice(0, 5)
);

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
  resultMeta.value = null;
  errorMessage.value = '';

  // For rewrite, wait for user to submit text first
  if (action.key === 'rewrite') {
    return;
  }

  loading.value = true;
  try {
    const res = await callAPI(action.key);
    resultText.value = res?.data?.text || '';
    resultMeta.value = res?.data?.meta || null;
  } catch (err) {
    errorMessage.value = err?.message || 'Something went wrong';
  } finally {
    loading.value = false;
  }
};

const handleRewriteSubmit = async () => {
  if (!rewriteInput.value.trim()) return;
  loading.value = true;
  resultMeta.value = null;
  errorMessage.value = '';
  try {
    const res = await callAPI('rewrite');
    resultText.value = res?.data?.text || '';
    resultMeta.value = res?.data?.meta || null;
  } catch (err) {
    errorMessage.value = err?.message || 'Something went wrong';
  } finally {
    loading.value = false;
  }
};

// Strip Markdown bold markers and quote glyphs from copilot output
const sanitizeCopilotText = (s = '') => {
  let t = String(s);
  t = t.replace(/\*\*(.+?)\*\*/gs, '$1');
  t = t.replace(/__(.+?)__/gs, '$1');
  t = t.replace(/^\s*\*\*+/g, '').replace(/\*\*+\s*$/g, '');
  t = t.replace(/^\s*__+/g, '').replace(/__+\s*$/g, '');
  t = t.replace(/[«»"""„‟‹›]/g, '');
  return t;
};

const displayText = computed(() => sanitizeCopilotText(resultText.value));

const formatMetaSources = (obj) => {
  if (!obj || !obj.k) return '';
  const all = Array.isArray(obj.sources) ? obj.sources : [];
  const shown = all.slice(0, 3);
  const extra = all.length - shown.length;
  let src = shown.join(', ');
  if (extra > 0) src += ` +${extra} more`;
  return src ? `${src} (k=${obj.k})` : `k=${obj.k}`;
};

const memoryLabel = computed(() => formatMetaSources(resultMeta.value?.memory));
const docsLabel = computed(() => formatMetaSources(resultMeta.value?.documents));

const handleUse = () => {
  if (!displayText.value) return;
  const event = useRichEditor.value
    ? BUS_EVENTS.INSERT_INTO_RICH_EDITOR
    : BUS_EVENTS.INSERT_INTO_NORMAL_EDITOR;
  emitter.emit(event, displayText.value);
};

const closeCopilotPanel = () => {
  updateUISettings({
    is_copilot_panel_open: false,
    is_contact_sidebar_open: false,
  });
};

// --- Chat methods ---

const scrollToBottom = () => {
  nextTick(() => {
    if (chatScrollEl.value) {
      chatScrollEl.value.scrollTop = chatScrollEl.value.scrollHeight;
    }
  });
};

const buildMetaLabel = (meta, key) => {
  const m = meta?.[key];
  if (!m || !m.k) return '';
  const all = Array.isArray(m.sources) ? m.sources : [];
  const shown = all.slice(0, 3);
  const extra = all.length - shown.length;
  let src = shown.join(', ');
  if (extra > 0) src += ` +${extra} more`;
  return src ? `${src} (k=${m.k})` : `k=${m.k}`;
};

const sendChat = async (overrideText, displayLabel) => {
  const question = (overrideText || chatInput.value).trim();
  if (!question || chatLoading.value) return;

  chatMessages.value.push({ id: ++chatMsgId, role: 'user', content: displayLabel || question });
  chatInput.value = '';
  chatLoading.value = true;
  scrollToBottom();

  const history = chatMessages.value
    .slice(0, -1)
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const res = await himatildaAPI.askCopilot({
      ...basePayload.value,
      question,
      history,
    });
    const text = sanitizeCopilotText(res?.data?.text || '');
    chatMessages.value.push({
      id: ++chatMsgId,
      role: 'assistant',
      content: text,
      memoryLabel: buildMetaLabel(res?.data?.meta, 'memory'),
      docsLabel: buildMetaLabel(res?.data?.meta, 'documents'),
    });
  } catch (err) {
    chatMessages.value.push({
      id: ++chatMsgId,
      role: 'assistant',
      content: err?.message || 'Something went wrong',
      isError: true,
    });
  } finally {
    chatLoading.value = false;
    scrollToBottom();
  }
};

const handleChatKeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
};

const handleChipClick = chip => {
  sendChat(chip.prompt, chip.label);
};

const handleUseChatMsg = text => {
  if (!text) return;
  const event = useRichEditor.value
    ? BUS_EVENTS.INSERT_INTO_RICH_EDITOR
    : BUS_EVENTS.INSERT_INTO_NORMAL_EDITOR;
  emitter.emit(event, text);
};

watch(() => currentChat.value?.id, () => {
  chatMessages.value = [];
  chatInput.value = '';
  chatLoading.value = false;
  chatMsgId = 0;
});
</script>

<template>
  <div class="flex flex-col h-full text-sm leading-6 tracking-tight w-full">
    <SidebarActionsHeader
      title="Copilot"
      @close="closeCopilotPanel"
    />

    <!-- Chat section -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Messages -->
      <div
        ref="chatScrollEl"
        class="flex-1 overflow-y-auto px-4 pt-3 pb-1 space-y-3"
      >
        <!-- Empty state -->
        <div
          v-if="chatMessages.length === 0"
          class="space-y-1 py-2"
        >
          <h3 class="text-base font-medium text-n-slate-12 leading-8">
            Himatilda Copilot
          </h3>
          <p class="text-sm text-n-slate-11 leading-6">
            Ask anything about this conversation.
          </p>
        </div>

        <!-- Chat messages -->
        <template v-for="msg in chatMessages" :key="msg.id">
          <div
            v-if="msg.role === 'user'"
            class="flex justify-end"
          >
            <div class="max-w-[85%] rounded-lg bg-n-blue-3 text-n-blue-11 px-3 py-2 text-sm">
              {{ msg.content }}
            </div>
          </div>
          <div v-else class="flex justify-start">
            <div class="max-w-[85%] rounded-lg border border-n-weak bg-n-surface-1 px-3 py-2 space-y-1">
              <p
                class="text-sm text-n-slate-11 break-words whitespace-pre-wrap"
                :class="{ 'text-n-ruby-11': msg.isError }"
              >
                {{ msg.content }}
              </p>
              <p
                v-if="msg.docsLabel"
                class="text-xs text-n-slate-9"
              >
                Used docs: {{ msg.docsLabel }}
              </p>
              <p
                v-if="msg.memoryLabel"
                class="text-xs text-n-slate-9"
              >
                Used memory snippets: {{ msg.memoryLabel }}
              </p>
              <button
                v-if="!msg.isError"
                class="text-xs text-n-blue-11 hover:underline"
                @click="handleUseChatMsg(msg.content)"
              >
                Use this
              </button>
            </div>
          </div>
        </template>

        <!-- Loading bubble -->
        <div
          v-if="chatLoading"
          class="flex justify-start"
        >
          <div class="rounded-lg border border-n-weak bg-n-surface-1 px-3 py-2 flex items-center gap-2 text-n-slate-10">
            <Icon icon="i-lucide-loader-2" class="text-base animate-spin" />
            <span>Thinking...</span>
          </div>
        </div>
      </div>

      <!-- Quick chips -->
      <div
        v-if="visibleChips.length"
        class="shrink-0 px-4 py-2 border-t border-n-weak"
      >
        <span class="text-xs text-n-slate-10 block mb-1.5">Быстрые подсказки</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="chip in visibleChips"
            :key="chip.id"
            class="px-2.5 py-1 rounded-full text-xs border border-n-blue-6 text-n-blue-11 bg-n-blue-2 hover:bg-n-blue-3 transition-colors disabled:opacity-50"
            :disabled="chatLoading"
            @click="handleChipClick(chip)"
          >
            {{ chip.label }}
          </button>
        </div>
      </div>

      <!-- Chat input -->
      <div class="shrink-0 px-4 py-2 border-t border-n-weak">
        <div class="flex gap-2 items-end">
          <textarea
            v-model="chatInput"
            class="flex-1 rounded-md border border-n-weak bg-n-slate-2 text-n-slate-11 px-3 py-2 text-sm resize-none focus:outline-none focus:border-n-blue-7"
            rows="1"
            placeholder="Ask about this conversation..."
            @keydown="handleChatKeydown"
          />
          <button
            class="shrink-0 p-2 rounded-md bg-n-blue-9 text-white hover:bg-n-blue-10 transition-colors disabled:opacity-50"
            :disabled="!chatInput.trim() || chatLoading"
            @click="sendChat"
          >
            <Icon icon="i-lucide-send" class="text-base" />
          </button>
        </div>
      </div>
    </div>

    <!-- Actions section -->
    <div class="shrink-0 border-t border-n-weak px-4 py-3 space-y-3 max-h-[45%] overflow-y-auto">
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

      <!-- Result card (action buttons only) -->
      <div
        v-if="displayText"
        class="w-full rounded-lg border border-n-weak bg-n-surface-1 p-4 space-y-3"
      >
        <div class="font-medium text-n-slate-12">Copilot</div>
        <p class="text-n-slate-11 break-words whitespace-pre-wrap">
          {{ displayText }}
        </p>
        <p
          v-if="docsLabel"
          class="text-xs text-n-slate-9"
        >
          Used docs: {{ docsLabel }}
        </p>
        <p
          v-if="memoryLabel"
          class="text-xs text-n-slate-9"
        >
          Used memory snippets: {{ memoryLabel }}
        </p>
        <div class="flex flex-row mt-1">
          <Button
            label="Use this"
            faded
            sm
            slate
            :disabled="!displayText"
            @click="handleUse"
          />
        </div>
      </div>
    </div>
  </div>
</template>
