import type { ErrorCode, Result } from './types.js';
export declare class Fault extends Error {
    code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
export declare function ensure(condition: unknown, code: ErrorCode, message: string): asserts condition;
export declare function integer(v: unknown, min?: number, max?: number): v is number;
export declare function record(v: unknown, keys: string[]): asserts v is Record<string, unknown>;
export declare function result<T>(fn: () => T): Result<T>;
