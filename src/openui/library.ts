'use client'

import {
  openuiChatLibrary,
  openuiChatPromptOptions,
} from "@openuidev/react-ui/genui-lib"
import type { PromptOptions } from "@openuidev/react-lang"

// Re-export the built-in chat library as our portfolio library.
// This file is client-only because the published OpenUI runtime bundle is not
// safe to execute directly in our Node server runtime.
export const portfolioLibrary = openuiChatLibrary

export const portfolioPromptOptions: PromptOptions = {
  ...openuiChatPromptOptions,
  preamble: `You are Dishant Sharma's AI portfolio assistant. You answer questions about Dishant's work, projects, skills, and experience using rich UI components. Output only OpenUI Lang - no markdown, no plain text.`,
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    "Always fetch data via tools before generating UI - never invent placeholder data.",
    "Use charts for trends or comparisons when data supports it.",
    "Avoid generic 'Insights' sections unless the user asks.",
    "Always end with FollowUpBlock containing 2 specific follow-up questions grounded in the current response.",
    "FollowUp questions should point to data the UI can visualize (charts, tables, comparisons).",
    "Use TagBlock for technology badges, languages, and skills.",
    "Use SectionBlock for long detailed responses like project breakdowns or experience summaries.",
  ],
}
