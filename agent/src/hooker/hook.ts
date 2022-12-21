
enum HookState{
    HK_ENABLE,
    HK_DISABLE,
}


export class Hook {
    private _hookTargetName: string | null = null;
    private _hookTargetAddr: number | null = null;
    private _hookTargetModuleName: string | null = null;
    private _hookStatus: HookState = HookState.HK_DISABLE;

    private _hookTargetFuncRetType: NativeType | null = null;
    private _hookTargetFuncParamterTyep: NativeType[] | null = null;

    constructor(
        moduleName: string | null = null,
        name: string | null = null,
        addr: number | null = null
    ) {
        this._hookTargetModuleName = moduleName;
        this._hookTargetName = name;
        this._hookTargetAddr = addr;
    }

    set hookName(name: string) { this._hookTargetName = name; }
    set hookAddr(addr: number) { this._hookTargetAddr = addr; }
    set hookModuleName(moduleName: string) { this._hookTargetModuleName = moduleName; }
    set targetFuncRetType(retType:NativeType) { this._hookTargetFuncRetType = retType;}
    set targetFuncParameterType(parameterType:NativeType[]) { this._hookTargetFuncParamterTyep = parameterType;}

    public hook(callBacks: InvocationListenerCallbacks) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }else {
                Interceptor.attach(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ENABLE;
                console.log(this._hookTargetName + ' is hooked!');
                return;
            }
        }else{
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public invoke(...args: NativeArgumentValue[]){
        if(this._hookTargetName !== null){
            let nativeFuncAddr = Module.getExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }else{
                if(this._hookTargetFuncRetType === null){
                    console.error('funcation ret type must be set!');
                    return;
                }
                if(this._hookTargetFuncRetType !== null &&
                    this._hookTargetFuncParamterTyep !== null
                    ){
                        let nativeFunc = new NativeFunction(nativeFuncAddr, this._hookTargetFuncRetType, this._hookTargetFuncParamterTyep);
                        if(nativeFunc.isNull()){console.log('NativeFunc is null!');}
                        console.log("calling "+ this._hookTargetName);
                        return nativeFunc(...args);
                    }
            }            
        }
    }

    public replace(callBacks: NativeCallback){
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }else {
                Interceptor.replace(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ENABLE;
                console.log(this._hookTargetName + ' is replaced!');
                return;
            }
        }else{
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public unHookAll() {
        Interceptor.detachAll();
        this._hookStatus = HookState.HK_DISABLE;
    }

}

