import {
  evaluatePortfolioGuardrail,
  isThreadMessageLimitExceeded,
} from '../mastra-server/portfolio-guardrail';

type TestCase = {
  name: string;
  expectedAllowed: boolean;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};

const DEFAULT_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
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

const suites = [
  {
    name: 'configured',
    model: process.env.OPENCODE_GUARDRAIL_MODEL || 'deepseek-v4-flash',
    baseURL: process.env.OPENCODE_GUARDRAIL_BASE_URL || process.env.OPENCODE_BASE_URL || DEFAULT_GO_BASE_URL,
  },
  {
    name: 'big-pickle',
    model: 'big-pickle',
    baseURL: BIG_PICKLE_BASE_URL,
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

  for (const suite of suites) {
    for (const testCase of testCases) {
      const result = await evaluatePortfolioGuardrail(
        testCase.messages,
        suite.model,
        suite.baseURL,
      );

      const passed = result.allowed === testCase.expectedAllowed;
      console.log(JSON.stringify({
        suite: suite.name,
        model: suite.model,
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
