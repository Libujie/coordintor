import { breakPoint } from "./breakpoint";
import { hexDump } from "./hexdump"
import { listModules, loadArmModule } from "./module";
import { registry_exception } from "./exceptions";
import { Hook } from "./hooker/hook";
import { enumClassLoader, printJavaStack, printSoStack } from "./utils";

export var env_:NativePointer;
export var path_:NativePointer;
export var classLoader_:NativePointer;
export var caller_:NativePointer;
export var errorMsg_:NativePointer;

let main =  function(){
    Java.perform(function(){
        // registry_exception();
        let hook = new Hook('libnativebridge.so', 'NativeBridgeLoadLibraryExt');
        hook.hook({
            onEnter: function(args){
                console.log("NativeBridgeLoadLibraryExt => arg[0]: "+ args[0].readCString());
                console.log("NativeBridgeLoadLibraryExt => arg[1]: "+ args[1]);
                console.log("NativeBridgeLoadLibraryExt => arg[2]: "+ args[2]);
                // printSoStack(this.context);
            },
        });

        let hook2 = new Hook('libnativebridge.so', 'NativeBridgeGetTrampoline');
        hook2.hook({
            onEnter:function(args){
                console.log("NativeBridgeGetTrampoline => arg[0]: "+ args[0].readCString());
                console.log("NativeBridgeGetTrampoline => arg[1]: "+ args[1].readCString());
                console.log("NativeBridgeGetTrampoline => arg[2]: "+ args[2]);
                console.log("NativeBridgeGetTrampoline => arg[3]: "+ args[3]);
                // printSoStack(this.context);
            }
        });

        let hook3 = new Hook('libart.so', '_ZN3art9JavaVMExt17LoadNativeLibraryEP7_JNIEnvRKNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEP8_jobjectP7_jclassPS9_');
        hook3.hook({
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
        });

        let hook4 = new Hook('libopenjdkjvm.so', 'JVM_NativeLoad');
        hook4.hook({
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