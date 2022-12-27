import { sys } from "typescript";
import { Hook } from "../hooker/hook";
import { HookManager } from "../hooker/HookManager";
import { SimpleLog } from "../utils/simplelog";

let logger = SimpleLog.getLogger();

interface BridgeType {
    symName: string;
    retType: NativeType;
    paramType: NativeType[];
}

type NativeBridgeItf = NativeBridgeItf_v1 | NativeBridgeItf_v2 | NativeBridgeItf_v3 | NativeBridgeItf_v4 | NativeBridgeItf_v5 | NativeBridgeItf_v6

export class NativeBridgeWrapper implements NativeBridgeItf_v6 {
    private _version: number = 0;
    private _hookRoot: HookManager;
    private _libName: string = 'libhoudini.so';
    private _bridgeStructSym: string = 'NativeBridgeItf';
    private _bridgeStructSymAddr: NativePointer | null = null;
    private _symTables: BridgeType[] = [];
    // private _functionsMap: {[version:number]:[func:(value:NativePointer)=>null]} = {};
    private _functionsMap: Map<number, Function> = new Map();

    private set version(ver: number) { this._version = ver; }
    public get version(){ return this._version;}

    constructor() {
        this._hookRoot = HookManager.getInstance();
        this._initFuncMaps();
        this._initNativeBridgeItf();
    }
    preZygoteFork(): null {
        throw new Error("Method not implemented.");
    }
    getExportedNamespace(name: NativePointer): NativePointer {
        throw new Error("Method not implemented.");
    }
    getVendorNamespace(): NativePointer {
        throw new Error("Method not implemented.");
    }
    unloadLibrary(handle: NativePointer): number {
        throw new Error("Method not implemented.");
    }
    getError(): NativePointer {
        throw new Error("Method not implemented.");
    }
    isPathSupported(path: NativePointer): boolean {
        throw new Error("Method not implemented.");
    }
    initAnonymousNamespace(public_ns_sonames: NativePointer, anon_ns_library_path: NativePointer): boolean {
        throw new Error("Method not implemented.");
    }
    createNamespace(name: NativePointer, ld_library_path: NativePointer, default_library_path: NativePointer, type: number, permitted_when_isolated_path: NativePointer, parent_ns: NativePointer): NativePointer {
        throw new Error("Method not implemented.");
    }
    linkNamespaces(from: NativePointer, to: NativePointer, shared_libs_soname: NativePointer): boolean {
        throw new Error("Method not implemented.");
    }
    loadLibraryExt(libpath: NativePointer, flag: number, ns: NativePointer): NativePointer {
        throw new Error("Method not implemented.");
    }
    isCompatibleWith(version: number): boolean {
        throw new Error("Method not implemented.");
    }
    getSignalHandler(signal: number): NativePointer {
        throw new Error("Method not implemented.");
    }
    initialize(arg_cbs: NativePointer, app_code_cache_dir: NativePointer, isa: NativePointer): boolean {
        let offset:number = 1;
        throw new Error("Method not implemented.");
    }
    loadLibrary(libpath: NativePointer, flag: number): NativePointer {
        throw new Error("Method not implemented.");
    }
    getTrampoline(hanlde: NativePointer, name: NativePointer, shorty: NativePointer, len: number): NativePointer {
        throw new Error("Method not implemented.");
    }
    isSupported(libpath: NativePointer): boolean {
        throw new Error("Method not implemented.");
    }
    getAppEnv(abi: NativePointer): NativePointer {
        throw new Error("Method not implemented.");
    }
    public LoadLibrary(libname:string){return new NativePointer(0);}
    public GetTrampoline(handl:NativePointer, symName:string){return new NativePointer(0);}

    private _initFuncations() {
        this._symTables.forEach(element => {
            let hooker = this._findFunAddr(
                element.symName,
                element.retType,
                element.paramType
            );
            if (hooker != undefined) { this._hookRoot.add(hooker); }
            else { console.log('error! _init funcation => ' + element.symName); }
        });
    }
    private _initFuncMaps(){
        this._functionsMap.clear();
        this._functionsMap.set(1, this._initNativeBridgeItfV1);
        this._functionsMap.set(2, this._initNativeBridgeItfV2);
        this._functionsMap.set(3, this._initNativeBridgeItfV3);
        this._functionsMap.set(4, this._initNativeBridgeItfV4);
        this._functionsMap.set(5, this._initNativeBridgeItfV5);
        this._functionsMap.set(6, this._initNativeBridgeItfV6);
    }

    private _findFunAddr(sym: string, retType: NativeType, paramType: NativeType[]) {
        if (!sym) { return }
        let addr = this._hookRoot.get(sym);
        if (addr !== null) { return addr };

        let hooker = new Hook(this._libName, sym);

        hooker.targetFuncRetType = retType;
        hooker.targetFuncParameterType = paramType;

        this._hookRoot.add(hooker);
    }

    private _checkHoudini(): boolean {
        return Module.findBaseAddress(this._libName) ? true : false;
    }

    private _getNativeBridgeItf() {
        if (!this._checkHoudini()) {
            console.log("No dynamic link library libhoudini.so was found.")
            return
        }
        this._bridgeStructSymAddr = Module.findExportByName(this._libName, this._bridgeStructSym);
        if (!this._bridgeStructSymAddr) {
            console.log("Not find " + this._bridgeStructSym + " in " + this._libName);
            return
        }
        return this._bridgeStructSymAddr;
    }


    private _initNativeBridgeItf() {
        if (!this._getNativeBridgeItf()) {
            console.log("InitNativeBridgeItf failed! Not find symbol of " + this._bridgeStructSym);
        }
        this.version = this._bridgeStructSymAddr!.readInt();
        console.debug("version:" + this.version);
        try {
            this._functionsMap.get(this._version)?.call(this, this._bridgeStructSymAddr);
        } catch (error) {
            console.error("Unsupported Houdini version "+ this._version +" !");
            sys.exit(-1);
        }
    }

    private _initNativeBridgeItfV1(pointer:NativePointer){
        NativeBridgeWrapper.prototype['initialize'] = this._default;
        NativeBridgeWrapper.prototype['loadLibrary'] = this._default;
        NativeBridgeWrapper.prototype['getTrampoline'] = this._default;
        NativeBridgeWrapper.prototype['isSupported'] = this._default;
        NativeBridgeWrapper.prototype['getAppEnv'] = this._default;
    }
    private _initNativeBridgeItfV2(pointer:NativePointer){
        NativeBridgeWrapper.prototype['isCompatibleWith'] = this._default;
        NativeBridgeWrapper.prototype['getSignalHandler'] = this._default;
    }
    private _initNativeBridgeItfV3(pointer:NativePointer){
        NativeBridgeWrapper.prototype['unloadLibrary'] = this._default;
        NativeBridgeWrapper.prototype['getError'] = this._default;
        NativeBridgeWrapper.prototype['isPathSupported'] = this._default;
        NativeBridgeWrapper.prototype['initAnonymousNamespace'] = this._default;
        NativeBridgeWrapper.prototype['createNamespace'] = this._default;
        NativeBridgeWrapper.prototype['linkNamespaces'] = this._default;
        NativeBridgeWrapper.prototype['loadLibraryExt'] = this._default;

    }
    private _initNativeBridgeItfV4(pointer:NativePointer){
        NativeBridgeWrapper.prototype['getVendorNamespace'] = this._default;
    }
    private _initNativeBridgeItfV5(pointer:NativePointer){
        NativeBridgeWrapper.prototype['getExportedNamespace'] = this._default;
    }
    private _initNativeBridgeItfV6(pointer:NativePointer){
        NativeBridgeWrapper.prototype['preZygoteFork'] = this._default;
    }
    private _default(...opt:any):any{
        console.warn("Function not implemented!");
    }

} 