import { g_EventHandler } from "./eventhandler"

export class Arm32ExceptionContext {
    trap_no: number = 0
    error_code: number = 0
    oldmask: number = 0
    arm_r0: number = 0
    arm_r1: number = 0
    arm_r2: number = 0
    arm_r3: number = 0
    arm_r4: number = 0
    arm_r5: number = 0
    arm_r6: number = 0
    arm_r7: number = 0
    arm_r8: number = 0
    arm_r9: number = 0
    arm_r10: number = 0
    arm_fp: number = 0
    arm_ip: number = 0
    arm_sp: number = 0
    arm_lr: number = 0
    arm_pc: number = 0
    arm_cpsr: number = 0
    fault_address: number = 0
};

/**
 * 注册异常处理，这需要在程序启动时处理
 */
export const registry_exception = () => {
    Process.setExceptionHandler(function(exception){
        console.log("");
        console.log("address: "+exception.address);
        console.log("type: "+exception.type);
        console.log("" + exception.context.pc);
        
        // 通知事件事件器有异常来到
        g_EventHandler.notice(exception);
    });
}
