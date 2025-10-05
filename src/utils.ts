export function extractBits(value: number, low: number, high: number): number {
    if (!Number.isInteger(low) || !Number.isInteger(high)) {
        throw new TypeError("Аргументы low и high должны быть целыми числами");
    }
    if (low < 0 || high > 31) {
        throw new RangeError("Индексы битов должны быть в диапазоне [0, 31]");
    }
    if (low > high) {
        throw new RangeError("Аргумент low не может быть больше high");
    }

    const width = high - low + 1;

    // Приводим к беззнаковому 32-битному представлению
    const u32 = value >>> 0;

    // Сдвигаем вправо до младшего выбранного бита
    const shifted = u32 >>> low;

    // Маска шириной width бит. Работает корректно и для width = 32.
    const mask = width === 32 ? 0xFFFFFFFF : (0xFFFFFFFF >>> (32 - width));

    return (shifted & mask) >>> 0;
}