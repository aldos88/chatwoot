import { frontendURL } from '../../../helper/URLHelper';

import AiAgentsPageRouteView from './pages/AiAgentsPageRouteView.vue';
import FaqsIndex from './faqs/Index.vue';
import DocumentsIndex from './documents/Index.vue';
import MemoriesIndex from './memories/Index.vue';
import PlaygroundIndex from './playground/Index.vue';
import InboxesIndex from './inboxes/Index.vue';
import SettingsIndex from './settings/Index.vue';

const meta = {
  permissions: ['administrator', 'agent'],
};

const aiAgentChildRoutes = [
  {
    path: 'faqs',
    component: FaqsIndex,
    name: 'ai_agents_faqs_index',
    meta,
  },
  {
    path: 'documents',
    component: DocumentsIndex,
    name: 'ai_agents_documents_index',
    meta,
  },
  {
    path: 'memories',
    component: MemoriesIndex,
    name: 'ai_agents_memories_index',
    meta,
  },
  {
    path: 'playground',
    component: PlaygroundIndex,
    name: 'ai_agents_playground_index',
    meta,
  },
  {
    path: 'inboxes',
    component: InboxesIndex,
    name: 'ai_agents_inboxes_index',
    meta,
  },
  {
    path: 'settings',
    component: SettingsIndex,
    name: 'ai_agents_settings_index',
    meta,
  },
];

export const routes = [
  {
    path: frontendURL('accounts/:accountId/ai-agents'),
    component: AiAgentsPageRouteView,
    redirect: to => ({
      name: 'ai_agents_faqs_index',
      params: to.params,
    }),
    children: [...aiAgentChildRoutes],
  },
];
