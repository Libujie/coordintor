import { Hook } from "../hooker/hook";
import { HookManager } from "../hooker/HookManager";
import { retValueToPointer } from "../utils/utils";

interface BridgeType{
    symName:string;
    retType: NativeType;
    paramType: NativeType[];
}

export class NativeBridgeWrapper{
    private hookRoot_: HookManager;
    private libName_: string = 'libnativebridge.so';
    private symTables_: BridgeType[] = [
        {
            symName: 'NativeBridgeLoadLibraryExt',
            retType: 'pointer',
            paramType: ["pointer", "int", "int"]
        },
        {
            symName: 'NativeBridgeGetTrampoline',
            retType: 'pointer',
            paramType: ["pointer", "pointer", "int", "int"]
        },
    ];

    constructor(){
        this.hookRoot_ = HookManager.getInstance();
        this._initFuncations();
    }

    public LoadLibrary(path:string){
        let loadLibrary = this.hookRoot_.getValue('NativeBridgeLoadLibraryExt');
        if(loadLibrary == null){ 
            console.warn('can not found func sym!');
            return null;
        }else{
            let handle = loadLibrary.invoke(
                Memory.allocUtf8String(path), 
                0, 
                4);
            return handle? ptr(handle.toString()):null;
        }
    }

    public GetTrampoline(hanlde: NativePointer ,sym_name: string){
        let getTrampoline = this.hookRoot_.getValue('NativeBridgeGetTrampoline');
        if(getTrampoline == null){ 
            console.warn('can not found func sym!');
            return null;
        }else{
            let symAddr = getTrampoline.invoke(
                hanlde, 
                Memory.allocUtf8String(sym_name), 
                0, 
                0);
            return symAddr? ptr(symAddr.toString()):null;
        }
    }

    private _initFuncations(){
        this.symTables_.forEach(element => {
            let hooker = this._findFunAddr(
                element.symName,
                element.retType,
                element.paramType
            );
            if(hooker != undefined){ this.hookRoot_.pushBack(hooker);}
            else{ console.warn('error! _init funcation => ' + element.symName);}
        });
    }

    private _findFunAddr(sym:string, retType:NativeType, paramType:NativeType[]){
        if(!sym) {return}
        let addr = this.hookRoot_.getValue(sym);
        if(addr !== null){return addr};

        let hooker = new Hook(this.libName_, sym);
        
        hooker.targetFuncRetType = retType;
        hooker.targetFuncParameterType = paramType;
    
        this.hookRoot_.pushBack(hooker);
    }

} 