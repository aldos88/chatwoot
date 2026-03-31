<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import himatildaAPI from 'dashboard/api/himatilda';
import Button from 'dashboard/components-next/button/Button.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const { t } = useI18n();

const documents = ref([]);
const assistants = ref([]);
const isFetching = ref(true);
const isCreating = ref(false);
const deleteTarget = ref(null);
const isDeleting = ref(false);
const errorMessage = ref('');

// Dialog refs
const createDialogRef = ref(null);
const deleteDialogRef = ref(null);

// Create form
const formName = ref('');
const formUrl = ref('');
const formAssistantId = ref('default');
const formError = ref('');

const isEmpty = computed(() => !isFetching.value && documents.value.length === 0);

const assistantMap = computed(() => {
  const map = {};
  for (const a of assistants.value) {
    map[a.id] = a.name;
  }
  return map;
});

async function fetchData() {
  isFetching.value = true;
  errorMessage.value = '';
  try {
    const [aRes, dRes] = await Promise.all([
      himatildaAPI.listAssistants(),
      himatildaAPI.listDocuments(),
    ]);
    assistants.value = aRes.data || [];
    documents.value = dRes.data || [];
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err.message;
  } finally {
    isFetching.value = false;
  }
}

function openCreateDialog() {
  formName.value = '';
  formUrl.value = '';
  formAssistantId.value = assistants.value[0]?.id || 'default';
  formError.value = '';
  createDialogRef.value?.open();
}

async function handleCreateConfirm() {
  formError.value = '';
  if (!formName.value.trim()) {
    formError.value = t('AI_AGENTS.DOCUMENTS.FORM.NAME_REQUIRED');
    return;
  }
  if (!formUrl.value.trim()) {
    formError.value = t('AI_AGENTS.DOCUMENTS.FORM.URL_REQUIRED');
    return;
  }
  try {
    new URL(formUrl.value);
  } catch {
    formError.value = t('AI_AGENTS.DOCUMENTS.FORM.URL_INVALID');
    return;
  }

  isCreating.value = true;
  try {
    await himatildaAPI.createDocument({
      assistantId: formAssistantId.value,
      type: 'url',
      name: formName.value.trim(),
      url: formUrl.value.trim(),
    });
    createDialogRef.value?.close();
    await fetchData();
  } catch (err) {
    formError.value = err?.response?.data?.error || err.message;
  } finally {
    isCreating.value = false;
  }
}

function confirmDelete(doc) {
  deleteTarget.value = doc;
  deleteDialogRef.value?.open();
}

function cancelDelete() {
  deleteTarget.value = null;
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await himatildaAPI.deleteDocument(deleteTarget.value.id);
    deleteDialogRef.value?.close();
    deleteTarget.value = null;
    await fetchData();
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err.message;
    deleteDialogRef.value?.close();
  } finally {
    isDeleting.value = false;
  }
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

onMounted(fetchData);
</script>

<template>
  <section class="flex flex-col w-full h-full overflow-auto bg-n-surface-1">
    <!-- Header -->
    <header class="sticky top-0 z-10 px-6 bg-n-surface-1">
      <div class="w-full max-w-[60rem] mx-auto">
        <div
          class="flex items-start lg:items-center justify-between w-full py-6 lg:py-0 lg:h-20 gap-4 lg:gap-2 flex-col lg:flex-row"
        >
          <div class="flex flex-col gap-0.5">
            <h1 class="text-xl font-medium text-n-slate-12">
              {{ t('AI_AGENTS.DOCUMENTS.TITLE') }}
            </h1>
            <p class="text-sm text-n-slate-11">
              {{ t('AI_AGENTS.DOCUMENTS.DESCRIPTION') }}
            </p>
          </div>
          <Button
            :label="t('AI_AGENTS.DOCUMENTS.CTA')"
            icon="i-lucide-plus"
            size="sm"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 px-6">
      <div class="w-full max-w-[60rem] mx-auto py-4">
        <!-- Error banner -->
        <div
          v-if="errorMessage"
          class="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-r-50 dark:bg-r-900/20 text-r-700 dark:text-r-300 text-sm"
        >
          <span class="i-lucide-alert-circle size-4 flex-shrink-0" />
          {{ errorMessage }}
        </div>

        <!-- Loading -->
        <div
          v-if="isFetching"
          class="flex items-center justify-center py-20 text-n-slate-11"
        >
          <Spinner />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="isEmpty"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <span class="i-lucide-file-text size-12 text-n-slate-8 mb-4" />
          <h3 class="text-lg font-medium text-n-slate-12 mb-1">
            {{ t('AI_AGENTS.DOCUMENTS.EMPTY_TITLE') }}
          </h3>
          <p class="text-sm text-n-slate-11 mb-4 max-w-md">
            {{ t('AI_AGENTS.DOCUMENTS.EMPTY_MESSAGE') }}
          </p>
          <Button
            :label="t('AI_AGENTS.DOCUMENTS.CTA')"
            icon="i-lucide-plus"
            size="sm"
            @click="openCreateDialog"
          />
        </div>

        <!-- Documents list -->
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-n-weak bg-n-solid-2 hover:bg-n-solid-3 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span class="i-lucide-globe size-5 text-n-slate-10 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-sm text-n-slate-12 truncate">
                  {{ doc.name }}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <a
                    :href="doc.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-n-brand truncate max-w-xs hover:underline"
                  >
                    {{ doc.url }}
                  </a>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span
                class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-n-alpha-1 text-xs text-n-slate-11"
              >
                <span class="i-lucide-bot size-3" />
                {{ assistantMap[doc.assistantId] || doc.assistantId }}
              </span>
              <span class="hidden sm:block text-xs text-n-slate-10">
                {{ formatDate(doc.createdAt) }}
              </span>
              <Button
                icon="i-lucide-trash-2"
                variant="ghost"
                color="slate"
                size="xs"
                class="!text-n-slate-10 hover:!text-r-600"
                @click="confirmDelete(doc)"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Document Dialog -->
    <Dialog
      ref="createDialogRef"
      :title="t('AI_AGENTS.DOCUMENTS.CREATE_TITLE')"
      :confirm-button-label="t('AI_AGENTS.DOCUMENTS.FORM.CREATE')"
      :cancel-button-label="t('AI_AGENTS.DOCUMENTS.FORM.CANCEL')"
      :is-loading="isCreating"
      @confirm="handleCreateConfirm"
    >
      <div class="flex flex-col gap-4">
        <div v-if="formError" class="text-sm text-r-600 dark:text-r-400">
          {{ formError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-n-slate-12">
            {{ t('AI_AGENTS.DOCUMENTS.FORM.NAME_LABEL') }}
          </label>
          <Input
            v-model="formName"
            :placeholder="t('AI_AGENTS.DOCUMENTS.FORM.NAME_PLACEHOLDER')"
            size="sm"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-n-slate-12">
            {{ t('AI_AGENTS.DOCUMENTS.FORM.URL_LABEL') }}
          </label>
          <Input
            v-model="formUrl"
            placeholder="https://..."
            size="sm"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-n-slate-12">
            {{ t('AI_AGENTS.DOCUMENTS.FORM.ASSISTANT_LABEL') }}
          </label>
          <select
            v-model="formAssistantId"
            class="w-full px-3 py-2 text-sm rounded-lg border border-n-weak bg-n-solid-2 text-n-slate-12 outline-none focus:border-n-brand"
          >
            <option
              v-for="a in assistants"
              :key="a.id"
              :value="a.id"
            >
              {{ a.name }}
            </option>
          </select>
        </div>
      </div>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      ref="deleteDialogRef"
      type="alert"
      :title="t('AI_AGENTS.DOCUMENTS.DELETE_TITLE')"
      :description="t('AI_AGENTS.DOCUMENTS.DELETE_CONFIRM', { name: deleteTarget?.name || '' })"
      :confirm-button-label="t('AI_AGENTS.DOCUMENTS.DELETE_ACTION')"
      :cancel-button-label="t('AI_AGENTS.DOCUMENTS.FORM.CANCEL')"
      :is-loading="isDeleting"
      @confirm="handleDeleteConfirm"
      @close="cancelDelete"
    />
  </section>
</template>
