<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col w-full h-full overflow-auto bg-n-surface-1">
    <header class="sticky top-0 z-10 px-6">
      <div class="w-full max-w-[60rem] mx-auto">
        <div class="flex items-center justify-between w-full py-6 lg:py-0 lg:h-20">
          <div class="flex flex-col gap-0.5">
            <h1 class="text-xl font-medium text-n-slate-12">
              {{ t('AI_AGENTS.PLAYGROUND.TITLE') }}
            </h1>
            <p class="text-sm text-n-slate-11">
              {{ t('AI_AGENTS.PLAYGROUND.DESCRIPTION') }}
            </p>
          </div>
        </div>
      </div>
    </header>
    <main class="flex-1 px-6">
      <div class="w-full max-w-[60rem] mx-auto py-4">
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <span class="i-lucide-flask-conical size-12 text-n-slate-8 mb-4" />
          <h3 class="text-lg font-medium text-n-slate-12 mb-1">
            {{ t('AI_AGENTS.PLAYGROUND.EMPTY_TITLE') }}
          </h3>
          <p class="text-sm text-n-slate-11 max-w-md">
            {{ t('AI_AGENTS.PLAYGROUND.EMPTY_MESSAGE') }}
          </p>
        </div>
      </div>
    </main>
  </section>
</template>
