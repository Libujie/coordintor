__description__ = "a plugin to help you debug native world."

import argparse
from email import parser
import os
import sys

sys.path.append(os.path.dirname(__file__))

from sys import implementation
from objection.utils.plugin import Plugin

from config import AGENT_SCRIPT_PATH

from debugger.agent.command import CommandAgent

class ObjectionAgent(CommandAgent):
    def __init__(self, objection_plugin:Plugin):
        self.plugin = objection_plugin
        super().__init__()
    
    def attach(self):
        self._rpc = self.plugin.api
        self._pid = self.plugin.session._impl.pid
        self._device = self.plugin.agent.device


class Debugger(Plugin):
    def __init__(self, ns):
        """Create a new instance of the plugin

        Args:
            ns (_type_): _description_
        """
        self._parser = argparse.ArgumentParser(description="")
        self.script_path = os.path.join(AGENT_SCRIPT_PATH)
        implementation = self._init_env()
        
        super().__init__(__file__, ns, implementation)
        
        
        self.inject()
        self.plugin_agent = ObjectionAgent(self)
        self._pid = self.session._impl.pid
        
    
    def hexdump(self, args = None):
        """_summary_
        """
        addr = int(args[0], 16)
        length = int(args[1], 10)
        self.plugin_agent.hexDump(addr, length)

        pass 
    def breakpoint(self, args = None):
        """_summary_
        """
        addr = int(args[0], 16)
        self.plugin_agent.breadPoint(addr)        
        
        pass
    def listmodules(self, args = None):
        """_summary_
        """
        options = self._parser.parse_args(args)
        print(options)
        self.plugin_agent.listModules(options.modname)

    def execute(self, args = None):
        """_summary_
        """
        cmd = args[0]
        ret = self.plugin_agent.execute(cmd)
        print(ret.read())
    
    def loadArmModule(self, args = None):
        """_summary_

        Args:
            args (_type_, optional): _description_. Defaults to None.
        """
        path = args[0]
        self.plugin_agent.loadArmModule(path)
    
    def _apiMonitor(self, args = None):
        options = self._parser.parse_args(args)
        print(options)
        # self.plugin_agent.()
        pass
    
    def _init_env(self):
        implementation = {
            'meta': 'help you debug native world',
            'commands': {
                'hexdump':{
                    'meta': 'Dump target memory address',
                    'flags': [],
                    'exec': self.hexdump
                },
                'breakpoint': {
                    'meta': 'Write a breakpoint at the target address',
                    'flags': [],
                    'exec': self.breakpoint
                },
                'listmodule': {
                    'meta': 'Show all modules including arm',
                    'flags': ['--modname'],
                    'exec': self.listmodules
                },
                'execute': {
                    'meta': 'Execute command in android',
                    'flags': [],
                    'exec': self.execute
                },
                'loadArmModule': {
                    'meta': 'Show all modules including arm',
                    'flags': ['--modname'],
                    'exec': self.loadArmModule
                },
                'apiMonitor':{
                    'meta': 'Monitor Api',
                    'flags': [
                        '--libname',
                        ],
                    'exec':self._apiMonitor
                },
            }
        }
        
        self._parser.add_argument("--modname", help="show target module info", type=str)
        self._parser.add_argument("--libname", help="target so lib", type=str)
        
        return implementation        


namespace = 'coordinator'
plugin = Debugger 