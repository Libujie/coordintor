/*
 * @Author: BujJieLi chengjie.li1@pacteraedge.com
 * @Date: 2022-11-07 15:51:13
 * @LastEditors: BujJieLi chengjie.li1@pacteraedge.com
 * @LastEditTime: 2022-11-07 16:04:05
 * @FilePath: /coordinator/agent/src/monitor/monitor.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by BujJieLi chengjie.li1@pacteraedge.com, All Rights Reserved. 
 */
import { Hook } from "../hook";

function APIMonitor(name: string, libname?: string|null, callBacks?: InvocationListenerCallbacks|null ) {
    let hooker = new Hook(libname, name);
    if (callBacks !== undefined && callBacks !== null) {
        hooker.hook(callBacks);
        return null;
    }
    return hooker.hook({
        onEnter: function () {
            console.log('[+] ' + name + ' start');
        },
        onLeave: function () {
            console.log('[+] ' + name + ' end');
        }
    });
}

function Watchdog(func_name: string, libname?:string|null, 
    preArgs?: {[index:number]:[argType:string]}[] | null, 
    postArgs?: {[index:number]:[argType:string]}[] | null){
    if(func_name === null){
        return null;
    }

    if(libname === undefined){
        APIMonitor(func_name);
    }else if(preArgs === undefined ){
        APIMonitor(func_name, libname);
    }else if(preArgs !== null && preArgs !== undefined){
        APIMonitor(func_name, libname, {
            onEnter:function(args){
                preArgs.forEach(element => {
                    // console.log("[+] "+ func_name +" => " + args[])
                });
            }
        });
    }

}