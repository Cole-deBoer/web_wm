/**
 * Fails fast: throws instead of logging, so an invariant violation stops
 * execution immediately with a stack trace rather than silently
 * continuing (which is what console.assert does).
 * @param {unknown} condition
 * @param {string} message
 * @returns {asserts condition}
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
