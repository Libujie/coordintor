import os
import click

from tabulate import tabulate
from frida.core import Device
from config import AGENT_SCRIPT_PATH

from _agent import Agent
from debugger.agent.command.helpers import sizeof_fmt

class Module(object):
    def __init__(self, 
                 modname:str = None,
                 baseaddr:str = None,
                 modsize:int = None,
                 modpath:str = None,
                 modtype:str = None,
                 ) -> None:
        self.modname = modname
        self.baseaddr = baseaddr
        self.modsize = modsize
        self.modpath = modpath
        self.modtype = modtype

class CommandAgent(Agent):
    def __init__(self, pid:int=None, connection=None, device:Device = None):
        self._device = device
        self._pid = pid
        super().__init__(connection=connection, script_file=AGENT_SCRIPT_PATH)
    
    def on_message(self, message, data):
        if message['type'] == 'send':
            print("[*] {0}".format(message))
        else:
            print(message)
    
    def hexDump(self, addr: int, length: int):
        return self._rpc.hexdump(addr, length)
    
    def breadPoint(self, addr: int):
        return self._rpc.breakpoint(addr)
    
    def listModules(self, modname:str =None):
        reg_exp:str = ".so$" if modname == None else "({})+.*so".format(modname)
        maps_path = "/proc/{}/maps".format(self._pid)
        cmd = "cat {} | grep -iE '{}' | sort |awk '!a[$6]++{{print $1,$5,$6}}'".format(maps_path, reg_exp) 
        ret = self.execute(cmd)
        mod_type:dict = self._getSoType()

        modules = []
        while True:
            data = ret.readline()
            if data == None or data == "":
                break
            
            (addr_range, size, path) = data.split(maxsplit=-1)
            (baseaddr) = addr_range.split("-")[0]
            size = int(size, 10)
            name = os.path.basename(path)
            modules.append(Module(modname=name,
                   baseaddr=baseaddr,
                   modsize=size,
                   modpath=path,
                   modtype=mod_type[path]
                   ))

        click.secho(tabulate(
            [[
              mod.modname,
              "0x"+mod.baseaddr,
              mod.modtype,
              str(mod.modsize) + ' (' + sizeof_fmt(mod.modsize) + ')' ,
              mod.modpath
            ] for mod in modules], headers=['Name', 'Base', 'Type', 'Size', 'Path'],
        ))
        return

    def execute(self, cmd:str):
        devcie_id = ""
        if(self._device != None): 
            devcie_id  += ("-s " + self._device.id)
        
        full_cmd = '''adb {} shell {}'''.format(devcie_id, cmd)    
        return os.popen(full_cmd)    
    
    def loadArmModule(self, path:str):
        return self._rpc.loadarmmodule(path)
    
    def apiMonitor(self, funcName:"str", libName:"str", args:"dict[int, str]"):
        
        pass
    def _getSoType(self):
        maps_path = "/proc/{}/maps".format(self._pid)
        cmd = '''\"cat {} | grep -iE '.so$' | sort | awk \!a[\\\\\$6]++{{print\\\\\$6}} | xargs file \"'''.format(maps_path)         
        ret = self.execute(cmd)
        
        mods_type = {}        
        while True:
            data = ret.readline()
            if data == None or data == "":
                break
            data = data.split(maxsplit=-1)
            mod_path = data[0].replace(":", "")
            mod_type = data[6].replace(",", "")
            mods_type[mod_path] = mod_type
        
        return mods_type
        
        