
enum HookState {
    HK_ATTACHED,
    HK_REPLACED,
    HK_DISABLE,
}

declare global {
    interface NativePointer {
        toInt(): number;
    }
}

NativePointer.prototype.toInt = function (): number {
    return parseInt(this.toString(16), 16);
}

export { };


export class Hook {
    private _hookTargetName: string | null = null;
    private _hookTargetAddr: number | null = null;
    private _hookTargetModuleName: string | null = null;
    private _hookCallBack: InvocationListenerCallbacks | null = null;
    private _hookStatus: HookState = HookState.HK_DISABLE;

    private _hookTargetFuncRetType: NativeType | null = null;
    private _hookTargetFuncParamterTyep: NativeType[] | null = null;
    private _invocationListener: InvocationListener | null = null;

    constructor(
        moduleName: string | null = null,
        name: string | null = null,
        addr: number | null = null,
        callback: InvocationListenerCallbacks | null = null
    ) {
        this._hookTargetModuleName = moduleName;

        if (!name && !addr) throw new Error("The name or address that must be set!")

        this._hookTargetName = typeof name === 'string' ? name : 'sub_' + addr?.toString(16);
        try {
            this._hookTargetAddr = typeof addr === 'number' ? addr : Module.findExportByName(moduleName, name!)?.toInt()!;
        } catch (error) {
            throw new Error("Not found target func => " + name);
        }
        this._hookCallBack = callback;
    }


    set funcName(name: string) { this._hookTargetName = name; }
    get funcName() { return this._hookTargetName!; }

    set funcAddr(addr: number) { this._hookTargetAddr = addr; }
    get funcAddr() { return this._hookTargetAddr!; }

    set moduleName(moduleName: string) { this._hookTargetModuleName = moduleName; }
    get moduleName() { return this._hookTargetModuleName ? this._hookTargetModuleName : "Null"; }

    set targetFuncRetType(retType: NativeType) { this._hookTargetFuncRetType = retType; }
    set targetFuncParameterType(parameterType: NativeType[]) { this._hookTargetFuncParamterTyep = parameterType; }
    set callBack(callback: InvocationListenerCallbacks) { this._hookCallBack = callback; }

    get status() { return this._hookStatus; }

    private _hook(callBack: InvocationListenerCallbacks) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                this._hookCallBack = callBack;
                this._invocationListener = Interceptor.attach(nativeFuncAddr, callBack);
                this._hookStatus = HookState.HK_ATTACHED;
                Interceptor.flush();
                console.log(this._hookTargetName + ' is hooked!');
                return this._invocationListener;
            }
        } else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public hook() {
        if (this._hookCallBack) return this._hook(this._hookCallBack);
        else console.warn("CallBack is undefined!");
    }

    public invoke(...args: NativeArgumentValue[]) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.getExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                if (this._hookTargetFuncRetType === null) {
                    console.error('funcation ret type must be set!');
                    return;
                }
                if (this._hookTargetFuncRetType !== null &&
                    this._hookTargetFuncParamterTyep !== null
                ) {
                    let nativeFunc = new NativeFunction(nativeFuncAddr, this._hookTargetFuncRetType, this._hookTargetFuncParamterTyep);
                    if (nativeFunc.isNull()) { console.log('NativeFunc is null!'); }
                    console.log("calling " + this._hookTargetName);
                    return nativeFunc(...args);
                }
            }
        }
    }

    public replace(callBacks: NativeCallback) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                Interceptor.replace(nativeFuncAddr, callBacks);
                Interceptor.flush();
                this._hookStatus = HookState.HK_REPLACED;
                console.log(this._hookTargetName + ' is replaced!');
                return;
            }
        } else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public detach() {
        if (this._invocationListener) {
            this._invocationListener.detach()
            this._hookStatus = HookState.HK_DISABLE;
        }
    }

}

