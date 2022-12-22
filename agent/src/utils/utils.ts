import { HookManager } from "../hooker/HookManager";
import { NativeBridgeWrapper } from "../nativebridge/wrapper";

var gHookRoot = HookManager.getInstance();
var gNativBridge = new NativeBridgeWrapper();

export {gHookRoot, gNativBridge };

export const str_to_bytes = (hex: string) => {
    let ab = new ArrayBuffer(hex.length / 2);
    let u8 = new Uint8Array(ab);

    let i = 0;
    while (hex.length >= 2) {
        let x = parseInt(hex.substring(0, 2), 16);
        hex = hex.substring(2, hex.length);
        u8[i++] = x
    }

    return ab;
}

export const msg = (condition: boolean, msg: string, over: boolean = false) => {
    if (condition) {
        console.log(msg)
        if (over) process.exit(-1);
    };
}

export const printJavaStack = () => {
    Java.perform(function () {
        var Exception = Java.use("java.lang.Exception");
        var ins = Exception.$new("Exception");
        var straces = ins.getStackTrace();
        if (straces != undefined && straces != null) {
            var strace = straces.toString();
            var replaceStr = strace.replace(/,/g, "\r\n");
            console.log("=============================Stack strat=======================");
            console.log(replaceStr);
            console.log("=============================Stack end=======================\r\n");
            Exception.$dispose();
        }
    });
}

export const printSoStack = (context:CpuContext) =>{
    if(true){
        Java.perform(function(){
            console.log("=============================Stack strat=======================");
            console.log(' called from:\n' +Thread.backtrace(context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n') + '\n');//SO打印堆栈
            console.log("=============================Stack end=======================\r\n");
        });
    }
}


export const enumClassLoader = () => {
    Java.enumerateClassLoaders({
        onMatch(loader) {
            console.log(loader);
        },
        onComplete() {
            console.log('onComplete')
        },
    })
}

export const retValueToPointer = (value: NativeReturnValue) =>{
    return ptr(value.toString());
}


