export class Fault extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export function ensure(condition, code, message) { if (!condition)
    throw new Fault(code, message); }
export function integer(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max; }
export function record(v, keys) {
    ensure(v !== null && typeof v === 'object' && !Array.isArray(v), 'INVALID_COMMAND', 'Expected a data record.');
    ensure(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'INVALID_COMMAND', 'Expected plain data.');
    const names = Reflect.ownKeys(v);
    ensure(names.length === keys.length && keys.every(k => Object.hasOwn(v, k)) && names.every(k => typeof k === 'string' && keys.includes(k) && Object.hasOwn(Object.getOwnPropertyDescriptor(v, k), 'value')), 'INVALID_COMMAND', 'Unexpected or missing fields.');
}
export function result(fn) { try {
    return { ok: true, value: fn() };
}
catch (e) {
    if (e instanceof Fault)
        return { ok: false, error: { code: e.code, message: e.message } };
    throw e;
} }
