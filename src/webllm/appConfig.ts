import {
  prebuiltAppConfig,
  type AppConfig,
  type ModelRecord,
} from '@mlc-ai/web-llm';
import { WEBLLM_MODEL_OPTIONS } from './models';

const modelOptions = new Map(
  WEBLLM_MODEL_OPTIONS.map((model) => [model.id, model]),
);

const patchModelRecord = (record: ModelRecord): ModelRecord => {
  const option = modelOptions.get(record.model_id);
  if (!option) return record;

  return {
    ...record,
    overrides: {
      ...record.overrides,
      sliding_window_size: -1,
    },
  };
};

export const createWebLlmAppConfig = (): AppConfig => ({
  ...prebuiltAppConfig,
  cacheBackend: 'indexeddb',
  model_list: prebuiltAppConfig.model_list.map(patchModelRecord),
});
