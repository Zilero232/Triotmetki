import { onDomReady } from '@/shared/lib/dom/on-dom-ready';
import { startPresetAdvisor } from '@/views/preset-advisor';

onDomReady(() => startPresetAdvisor(window));
