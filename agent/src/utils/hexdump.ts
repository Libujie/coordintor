
export const hexDump = (addr:number, length:number) => {
    Java.perform(function(){
        let paddr = new NativePointer(addr);
        console.log(
            hexdump(
                paddr,{
                offset: 0,
                length: length,
                header: true,
                ansi: true
        }));
    });
}