import { spawn } from "child_process";
import { Hook } from "../hooker/hook";
import { env_, path_, classLoader_, errorMsg_, caller_ } from "../index";
import { gHookRoot, gNativBridge } from "../utils/utils";

export const listModules = () => {
    Java.perform(function(){
        let pid = Process.id
        let map_path = "/proc/" + pid + "/maps";
        let cmd = "cat "+ map_path +" | grep -iE '.so$' | sort |awk '!a[$6]++'"
        console.log(2)
        let process = spawn(cmd);
        console.log(pid)
        console.log(process.stdout)
        
    });
}

export const findModule = (name:string) =>{
    Java.perform(function(){
    })
}

export const loadArmModule = (path:string) =>{
    loadArmSoFromNativeBridge(path);
}

/**模拟Android的loadlibrary过程
 * 
 * @param fullPath  
 * @returns 
 */
function loadArmSoFromNativeBridge(fullPath:string){
    Java.perform(function(){
        let handle =gNativBridge.LoadLibrary(fullPath);
        let list = fullPath.split("/");
        console.log(list[list.length - 1]);
        if(handle !== null){
            findSymbolAndInvoke(handle, 'JNI_OnLoad');
        }else{
            console.log('Can not Load target library => ' + fullPath);
        }
    });
}

/**
 * 
 * @param handle 
 * @param symName 
 */
let findSymbolAndInvoke = (handle:any , symName:string) => {
    Java.perform(function(){
        try {
            let func = gNativBridge.GetTrampoline(handle, symName);
            if(func !== null){
                console.log('JNI_OnLoad addr:' + ptr(func.toLocaleString()));
                let jni_OnLoad = new NativeFunction(ptr(func.toLocaleString()), "int", ["pointer", "int"]);
                // jni_OnLoad(env_, 0);
            }else{
                console.log('JNI_OnLoad not found!');
            }
        } catch (error) {
            console.log(error);
        }
    });
}

function loadArmModuleFromAndroid(path:string){
    Java.perform(function(){
        let LoadNativeLibraryStr = '_ZN3art9JavaVMExt17LoadNativeLibraryEP7_JNIEnvRKNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEP8_jobjectP7_jclassPS9_';
        let hooker = gHookRoot.get(LoadNativeLibraryStr);
        if(hooker === null){
            hooker = new Hook('libart.so', LoadNativeLibraryStr);
        
            hooker.targetFuncRetType = "bool";
            hooker.targetFuncParameterType = ["pointer", "pointer", "pointer", "pointer", "pointer"];
        
            gHookRoot.add(hooker);
        }

        let arg0 = env_;
        let arg1 = Memory.allocUtf8String(path);
        console.log(arg1.readUtf8String());
        // let arg1 = path_;
        let arg2 = classLoader_;
        let arg3 = caller_;
        let arg4 = errorMsg_;

        if(arg1.isNull()){
            console.log("AllocAnsiString faile!");
            return;
        }else{
            hooker?.invoke(arg0, arg1, arg2, arg3, arg4);
        }
    });
}

function loadArmModuleFromJVM(path:string){
    Java.perform(function(){
        let jvm_NativeLoad = 'JVM_NativeLoad';
        let hooker = gHookRoot.get(jvm_NativeLoad);
        if(hooker === null){
            hooker = new Hook('libopenjdkjvm.so', jvm_NativeLoad);

            hooker.targetFuncRetType = "pointer";
            hooker.targetFuncParameterType = ["pointer", "pointer", "pointer", "pointer"];
        
            gHookRoot.add(hooker);
        }
        // let arg0 = env_;
        // let arg1 = Java.vm.getEnv().newStringUtf(path);
        // let arg2 = classLoader_;
        // let arg3 = caller_;

        let arg1 = Java.vm.getEnv().newStringUtf(path);

        let vm = Java.vm;

    });
}

function loadArmModuleFromFridaModule(path:string){
    Module.load(path);
}