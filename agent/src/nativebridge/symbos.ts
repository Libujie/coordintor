interface BridgeType{
    symName:string;
    retType: NativeType;
    paramType: NativeType[];
}

interface NativeBridgeItf_v1{
    version: number;
    initialize(arg_cbs:NativePointer, app_code_cache_dir: NativePointer, isa: NativePointer):boolean;
    loadLibrary(libpath:NativePointer, flag: number): NativePointer;
    getTrampoline(hanlde:NativePointer, name: NativePointer, shorty: NativePointer, len: number):NativePointer;
    isSupported(libpath: NativePointer):boolean;
    getAppEnv(abi: NativePointer):NativePointer;
}

interface NativeBridgeItf_v2 extends NativeBridgeItf_v1 {
    isCompatibleWith(version: number): boolean;
    getSignalHandler(signal: number): NativePointer;
}

interface NativeBridgeItf_v3 extends NativeBridgeItf_v2{
    unloadLibrary(handle: NativePointer): number;
    getError():NativePointer;
    isPathSupported(path:NativePointer):boolean;
    initAnonymousNamespace(public_ns_sonames : NativePointer, anon_ns_library_path: NativePointer): boolean;
    createNamespace(name: NativePointer, ld_library_path: NativePointer, default_library_path: NativePointer, type: number, permitted_when_isolated_path: NativePointer, parent_ns: NativePointer):NativePointer;
    linkNamespaces(from: NativePointer, to: NativePointer, shared_libs_soname: NativePointer):boolean;
    loadLibraryExt(libpath: NativePointer, flag: number, ns: NativePointer): NativePointer;
}

interface NativeBridgeItf_v4 extends NativeBridgeItf_v3{
    getVendorNamespace():NativePointer;
}

interface NativeBridgeItf_v5 extends NativeBridgeItf_v4{
    getExportedNamespace(name: NativePointer):NativePointer;
}

interface NativeBridgeItf_v6 extends NativeBridgeItf_v5{
    preZygoteFork():null;
}




let bridgeItfSymbos = [
    // v1
    "initialize",
    "loadLibrary",
    "getTrampoline",
    "isSupported",
    "getAppEnv",
    // v2
    "isCompatibleWith",
    "getSignalHandler",
    // v3
    "unloadLibrary",
    "getError",
    "isPathSupported",
    "initAnonymousNamespace",
    "createNamespace",
    "linkNamespaces",
    "loadLibraryExt",
    //4
    "getVendorNamespace",
    // v5
    "getExportedNamespace",
    // v6
    "preZygoteFork",
]



