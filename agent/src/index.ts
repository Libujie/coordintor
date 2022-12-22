import { breakPoint } from "./breakpoint/breakpoint";
import { hexDump } from "./utils/hexdump"
import { listModules, loadArmModule } from "./rpc/module";
import { registry_exception } from "./exception/exceptions";
import { Hook } from "./hooker/hook";
import { enumClassLoader, printJavaStack, printSoStack } from "./utils/utils";
import { HookManager } from "./hooker/HookManager";
import { NativeBridgeWrapper } from "./nativebridge/wrapper";

export var env_:NativePointer;
export var path_:NativePointer;
export var classLoader_:NativePointer;
export var caller_:NativePointer;
export var errorMsg_:NativePointer;

let main =  function(){
    Java.perform(function(){
        let hooker = HookManager.getInstance();
        // registry_exception();
        hooker.newHook('libnativebridge.so', 'NativeBridgeLoadLibraryExt',null,{
            onEnter: function(args){
                console.log("NativeBridgeLoadLibraryExt => arg[0]: "+ args[0].readCString());
                console.log("NativeBridgeLoadLibraryExt => arg[1]: "+ args[1]);
                console.log("NativeBridgeLoadLibraryExt => arg[2]: "+ args[2]);
                // printSoStack(this.context);
            },
        });

        hooker.newHook('libnativebridge.so', 'NativeBridgeGetTrampoline', null,{
            onEnter:function(args){
                console.log("NativeBridgeGetTrampoline => arg[0]: "+ args[0].readCString());
                console.log("NativeBridgeGetTrampoline => arg[1]: "+ args[1].readCString());
                console.log("NativeBridgeGetTrampoline => arg[2]: "+ args[2]);
                console.log("NativeBridgeGetTrampoline => arg[3]: "+ args[3]);
                // printSoStack(this.context);
            }
        });

        hooker.newHook('libart.so', '_ZN3art9JavaVMExt17LoadNativeLibraryEP7_JNIEnvRKNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEP8_jobjectP7_jclassPS9_',null,
            {
                onEnter:function(args){
                    // env_ = args[0];
                    // path_ = args[1];
                    // classLoader_ = args[2];
                    // caller_ = args[3];
                    // errorMsg_ = args[4];
                    console.log("LoadNativeLibrary Env=> : "+ args[0]);
                    console.log("LoadNativeLibrary Path=> : "+ args[1]);
                    console.log("LoadNativeLibrary ClassLoader => : "+ args[2]);
                    console.log("LoadNativeLibrary Caller => : "+ args[3]);
                    console.log("LoadNativeLibrary ErrorMsg=> : "+ args[4]);
                }
            }
        );

        hooker.newHook('libopenjdkjvm.so', 'JVM_NativeLoad',null, {
            onEnter:function(args){
                env_ = args[0];
                path_ = args[1];
                classLoader_ = args[2];
                caller_ = args[3];

                console.log("JVM_NativeLoad Env=> : "+ args[0]);
                console.log("JVM_NativeLoad Path=> : "+ args[1]);
                hexDump(Java.vm.getEnv().getStringUtfChars(args[1], null).toInt32(), 32);
                console.log("JVM_NativeLoad JavaLoader => : "+ args[2]);

                console.log("JVM_NativeLoad Caller => : "+ args[3]);
                // printSoStack(this.context);
                // printJavaStack();
            }
        });


        let itf = new NativeBridgeWrapper();
        console.log(itf.version);
        
    });
}

setImmediate(main);

rpc.exports = {
    hexdump: function(addr:number, length:number){
        return hexDump(addr, length);
    },
    listmodules: function(){
        return listModules();
    },
    breakpoint: function(addr:number){
        return breakPoint(addr);
    },
    loadarmmodule: function(path: string){
        return loadArmModule(path);
    }
}