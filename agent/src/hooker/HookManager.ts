import { Hook } from "./hook";

export class HookManager {
    private static instance: HookManager;
    private _hookSet: Set<Hook> = new Set();

    private constructor() { }

    public static getInstance() {
        if (!HookManager.instance) {
            HookManager.instance = new HookManager();
        }
        return HookManager.instance;
    }

    public add(value: Hook) {
        this._hookSet.add(value);
    }

    public newHook(
        moduleName: string | null = null,
        name: string | null = null,
        addr: number | null = null,
        callback: InvocationListenerCallbacks | null = null
    ){
        let hook = new Hook(moduleName, name, addr, callback);
        this._hookSet.add(hook);
        return hook;
    }

    /**
     * @param value funcName or funcAddr
     */
    public get(value: string | number) {
        for (let item of this._hookSet) {
            if (typeof value === 'string') {
                if (item.funcName === value) return item;
                continue;
            } else if (typeof value === 'number') {
                if (item.funcAddr === value) return item;
                continue;
            }
        }
    }

    public delete(value: string | number) {
        let hook = this.get(value)
        if (hook) {
            hook.detach()
            this._hookSet.delete(hook);
        } else console.warn("target func not found!");
    }

    public chgCallback(value: string | number, callBack: InvocationListenerCallbacks) {
        let hook = this.get(value)
        if (hook) {
            hook.detach();
            hook.callBack = callBack;
            hook.hook();
        } else console.warn("target func not found!");
    }

    public flush() {
        this._hookSet.forEach(hook => {
            hook.hook();
        });
    }

    public clear() {
        Interceptor.detachAll();
        this._hookSet.clear();
    }
}
