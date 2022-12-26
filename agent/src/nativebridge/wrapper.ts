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

export class NativeBridgeWrapper {
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
            console.error("Unsupported Houdini version!");
            sys.exit(-1);
        }
    }

    private _initNativeBridgeItfV1(pointer:NativePointer){}
    private _initNativeBridgeItfV2(pointer:NativePointer){}
    private _initNativeBridgeItfV3(pointer:NativePointer){}
    private _initNativeBridgeItfV4(pointer:NativePointer){}
    private _initNativeBridgeItfV5(pointer:NativePointer){}
    private _initNativeBridgeItfV6(pointer:NativePointer){}
} 