import { AskFrontendAdapter } from './adapter';
import { mockAdapter } from './mockAdapter';

export function createAskClient(): AskFrontendAdapter {
  // Future switch:
  // if (import.meta.env.VITE_ASK_ADAPTER === 'http') return httpAdapter;
  return mockAdapter;
}
