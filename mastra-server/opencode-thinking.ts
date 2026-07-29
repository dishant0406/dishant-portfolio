type ThinkingMode = 'disabled' | 'enabled' | 'auto';

const OPENCODE_PROVIDER_KEY = 'opencode-go';

const DISABLED_VALUES = new Set(['disabled', 'disable', 'off', 'false', '0', 'none', 'no']);
const ENABLED_VALUES = new Set(['enabled', 'enable', 'on', 'true', '1', 'yes']);
const AUTO_VALUES = new Set(['auto', 'default', 'provider']);

export const getOpencodeThinkingMode = (
  value = process.env.OPENCODE_THINKING_MODE,
): ThinkingMode => {
  const normalized = String(value || 'disabled').trim().toLowerCase();

  if (ENABLED_VALUES.has(normalized)) return 'enabled';
  if (AUTO_VALUES.has(normalized)) return 'auto';
  if (DISABLED_VALUES.has(normalized)) return 'disabled';

  return 'disabled';
};

export const shouldForwardThinkingEvents = (mode = getOpencodeThinkingMode()) =>
  mode !== 'disabled';

export const getOpencodeProviderOptions = (mode = getOpencodeThinkingMode()) => {
  if (mode === 'auto') return undefined;

  return {
    [OPENCODE_PROVIDER_KEY]: {
      thinking: {
        type: mode,
      },
    },
  };
};
