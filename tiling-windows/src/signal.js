/**
 * @template T
 * @param {T} initialValue
 * @returns {{
 *   get: () => T,
 *   set: (value: T) => void,
 *   subscribe: (subscriber: (value: T, previousValue: T) => void) => () => void,
 * }}
 */
export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const get = () => value;

    const set = (newValue) => {
        if (newValue === value) return;
        const previousValue = value;
        value = newValue;
        for (const subscriber of subscribers) {
            subscriber(value, previousValue);
        }
    };

    const subscribe = (subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
    };

    return { get, set, subscribe };
}
