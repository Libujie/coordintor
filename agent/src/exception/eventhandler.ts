import { assert } from "console";
import { Arm32ExceptionContext } from "./exceptions"
import { gNativBridge } from "../utils/utils";

class EventHandler{
    private handle_: NativePointer | null = null;
    private libName_ = "/data/local/tmp/libsignalreger.so";

    constructor(){
        let handle = gNativBridge.LoadLibrary(this.libName_);
        assert(handle !== null, 'EventHandler initialization failed!');

        this.handle_ = handle;
    }

    public get _isArmException():boolean{
        let isExcption = false;
        if(this.handle_ !== null){
            let g_IsExpception = gNativBridge.GetTrampoline(this.handle_, "g_IsExpception");
            if(g_IsExpception === null) {
                console.warn("g_IsExpception symbol not found ")
                return false;
            }
            isExcption = g_IsExpception.readU8() == 0 ? false : true;
        }        
        return isExcption;
    };

    public get _armExceptionContext (): Arm32ExceptionContext | null{
        let exceptionContex = new Arm32ExceptionContext();
        if(this.handle_ !== null){
            let cpuContext = gNativBridge.GetTrampoline(this.handle_, "Arm32CPUContext");
            if(cpuContext == null) {
                console.warn("Arm32CPUContext symnol not found ")
                return null;
            }        
            let name_arr = Object.getOwnPropertyNames(exceptionContex); 
            name_arr.forEach(function(val, index, array){
                // 从Arm32CPUContext抽取数据，填充到新的数据结构中
                let data = cpuContext?.readInt()
                Object.defineProperty(exceptionContex, val, {
                    value:data
                });
                cpuContext?.add(4); // 指向下一个数据成员
            });
            return exceptionContex;
        }
        return null;
    };

    /**
     * 
     * @param exception 异常发生时X86的上下文环境
     * @returns 
     */
    notice(exception:ExceptionDetails):void{
        // 确定是ARM异常事件还是86异常事件
            // 确定条件是查看g_IsException是否为True
        if(!this._isArmException){
            this.conduct(exception);
            return;
        }
        if(this._armExceptionContext instanceof Arm32ExceptionContext){
            this.conduct(this._armExceptionContext);
            return;
        }

        console.error("Unknown exception!");
    }

    /**
     * 处理异常状态
     * @param exception 异常发生是存储上下文的结构 
     */
    conduct(exception:ExceptionDetails | Arm32ExceptionContext):void{
        // 如何处理
        console.log('Not implemented');
    }

    /**
     * 异常处理完毕后重置环境
     */
    reset(){}
}



export var g_EventHandler = new EventHandler();