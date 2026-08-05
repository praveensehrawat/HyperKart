/**
 * SockJS Client Browser Shim
 * ==========================
 * SockJS-client expects a 'global' object to exist in the global execution context (common in Node).
 * In modern browser runtimes compiled under ESM / Vite, 'global' is not defined.
 * This shim defines 'window.global' before importing SockJS to prevent runtime bootstrapping errors.
 */

if (typeof global === 'undefined') {
  // eslint-disable-next-line no-undef
  window.global = window
}

// Dynamically import SockJS-client and export default module bindings safely
const mod = await import('sockjs-client')
export default (mod && mod.default) ? mod.default : mod
