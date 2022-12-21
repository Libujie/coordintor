/**
 * 注入so到目标进程中
 * 只对Android APK 有效
 */

import { assert } from "console";

export class Injector {
    private _pid: number | null = null;
    private _injectFilePath: string | null = null;
    private _injecTargetAddr: number | null = null;
    private _injectTragetFuncName: string | null = null;

    public constructor(
        pid: number,
        injectFilePath: string,
        injectTargetAddr: number | null,
        injectTragetFuncName: string | null
    ) {
        this._pid = pid;
        this._injectFilePath = injectFilePath;
        this._injecTargetAddr = injectTargetAddr;
        this._injectTragetFuncName = injectTragetFuncName;
    }

    set _injectTargetAddr(addr: number) { this._injecTargetAddr = addr; }
    set _injectTargetFuncName(name: string) { this._injectTargetFuncName = name; }

    private _checkParmeter(): boolean {
        if (this._pid === null || this._injectFilePath === null) {
            return false;
        }
        if (this._injectTargetAddr === null && this._injectTargetFuncName === null) {
            return false;
        }
        return true;
    }

    public inject() {
        assert(this._checkParmeter(), "Parameter error!");

        Java.perform(function(){
        });
    }

}