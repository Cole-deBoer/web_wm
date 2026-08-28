import { describe, it, expect, vi } from "vitest";
import { createSignal } from "./signal.js";

describe("createSignal", () => {
    it("returns the initial value from get()", () => {
        const signal = createSignal(42);
        expect(signal.get()).toBe(42);
    });

    it("updates the value visible to get() on set()", () => {
        const signal = createSignal(1);
        signal.set(2);
        expect(signal.get()).toBe(2);
    });

    it("notifies subscribers with (newValue, previousValue) on set()", () => {
        const signal = createSignal("a");
        const subscriber = vi.fn();
        signal.subscribe(subscriber);

        signal.set("b");

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith("b", "a");
    });

    it("does not notify subscribers when the new value === the current value", () => {
        const signal = createSignal(5);
        const subscriber = vi.fn();
        signal.subscribe(subscriber);

        signal.set(5);

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("stops notifying a subscriber after it unsubscribes", () => {
        const signal = createSignal(0);
        const subscriber = vi.fn();
        const unsubscribe = signal.subscribe(subscriber);

        signal.set(1);
        unsubscribe();
        signal.set(2);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith(1, 0);
    });
});
