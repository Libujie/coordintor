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
    private hookRoot_: HookManager;
    private _libName: string = 'libhoudini.so';
    private _bridgeStructSym: string = 'NativeBridgeItf';
    private _bridgeStructSymAddr: NativePointer | null = null;
    private symTables_: BridgeType[] = [];


    private set version(ver: number) { this._version = ver; }
    public get version(){ return this._version;}

    constructor() {
        this.hookRoot_ = HookManager.getInstance();
        this._initNativeBridgeItf();
    }
    public LoadLibrary(libname:string){return new NativePointer(0);}
    public GetTrampoline(handl:NativePointer, symName:string){return new NativePointer(0);}

    private _initFuncations() {
        this.symTables_.forEach(element => {
            let hooker = this._findFunAddr(
                element.symName,
                element.retType,
                element.paramType
            );
            if (hooker != undefined) { this.hookRoot_.add(hooker); }
            else { console.log('error! _init funcation => ' + element.symName); }
        });
    }

    private _findFunAddr(sym: string, retType: NativeType, paramType: NativeType[]) {
        if (!sym) { return }
        let addr = this.hookRoot_.get(sym);
        if (addr !== null) { return addr };

        let hooker = new Hook(this._libName, sym);

        hooker.targetFuncRetType = retType;
        hooker.targetFuncParameterType = paramType;

        this.hookRoot_.add(hooker);
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
        switch (this.version) {
            case 1:
                {
                    break;
                };
            case 2:
                {
                    break;
                };
            case 3:
                {
                    break;
                };
            case 4:
                {
                    break;
                };
            case 5:
                {
                    break;
                };
            case 6:
                {
                    break;
                };                                                                               
            default:
                break;
        }
    }


} 