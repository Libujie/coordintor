
import { msg } from "../utils/utils";


export const breakPoint = (addr:number) => {
    msg(addr == null, "Invalid address!");
    if(addr == null) return;
    
    let bp = 0x01de;
    let count = 2;
    let src = new ArrayBuffer(count);    
    let dataview = new DataView(src);

    dataview.setInt16(0, bp, true);

    let dst = new NativePointer(addr);
    let ret = Memory.protect(dst, count, "rwx");
    msg(ret == false, "Memory protection property modification failed!");
    if(ret == false) return false;

    Memory.copy(dst, src.unwrap(), 2);
}

