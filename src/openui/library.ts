'use client'

import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"

// Re-export the built-in chat library as our portfolio library.
// This file is client-only because the published OpenUI runtime bundle is not
// safe to execute directly in our Node server runtime.
export const portfolioLibrary = openuiChatLibrary
