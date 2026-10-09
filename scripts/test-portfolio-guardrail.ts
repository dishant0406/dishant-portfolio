/**
 * Regression test for the portfolio guardrail: it must still block off-topic
 * messages and still allow portfolio ones.
 *
 * Requires OPENCODE_API_KEY.
 *
 *   pnpm test:guardrail
 */

import {
  evaluatePortfolioGuardrail,
  isThreadMessageLimitExceeded,
} from '../mastra-server/portfolio-guardrail';
import { DEFAULT_BASE_URL, getEnvModelConfig, type ModelConfig } from '../src/lib/model-config';

type TestCase = {
  name: string;
  expectedAllowed: boolean;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};

const BIG_PICKLE_BASE_URL = 'https://opencode.ai/zen/v1';

const testCases: TestCase[] = [
  {
    name: 'blocks unrelated code generation',
    expectedAllowed: false,
    messages: [{ role: 'user', content: 'write the code for simple todo list in react' }],
  },
  {
    name: 'allows resume request',
    expectedAllowed: true,
    messages: [{ role: 'user', content: 'Can you share your resume?' }],
  },
  {
    name: 'allows portfolio follow-up',
    expectedAllowed: true,
    messages: [
      { role: 'user', content: 'Tell me about Dishant projects' },
      { role: 'assistant', content: 'Dishant has projects like Quickleap and Vocapp.' },
      { role: 'user', content: 'Which one is most recent?' },
    ],
  },
];

const baseConfig = getEnvModelConfig();

const suites: Array<{ name: string; config: ModelConfig }> = [
  { name: 'configured', config: baseConfig },
  {
    name: 'big-pickle',
    config: {
      ...baseConfig,
      guardrailModel: 'big-pickle',
      baseURL: BIG_PICKLE_BASE_URL,
      guardrailBaseURL: BIG_PICKLE_BASE_URL,
    },
  },
];

const assertThreadLimit = () => {
  const messages = Array.from({ length: 11 }, (_, index) => ({
    role: 'user' as const,
    content: `portfolio question ${index}`,
  }));

  if (!isThreadMessageLimitExceeded(messages)) {
    throw new Error('Expected 11 user messages to exceed the thread limit');
  }
};

const run = async () => {
  assertThreadLimit();

  if (!baseConfig.apiKey) {
    throw new Error(`OPENCODE_API_KEY is required. Base URL: ${baseConfig.baseURL || DEFAULT_BASE_URL}`);
  }

  for (const suite of suites) {
    for (const testCase of testCases) {
      const result = await evaluatePortfolioGuardrail(testCase.messages, suite.config);

      const passed = result.allowed === testCase.expectedAllowed;
      console.log(JSON.stringify({
        suite: suite.name,
        model: suite.config.guardrailModel,
        case: testCase.name,
        passed,
        result,
      }));

      if (!passed) {
        throw new Error(`${suite.name} failed: ${testCase.name}`);
      }
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
