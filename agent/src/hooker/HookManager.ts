import { Hook } from "./hook";

export class HookManager{
    private static instance:HookManager;
    private _hookSet:Set<Hook> = new Set();
    
    private constructor(){}

    public static getInstance(){
        if(!this.instance){
            this.instance = new HookManager();
        }
        return this.instance;
    }

    public pushBack(value:Hook){
        this._hookSet.add(value);
    }

    public getValue(value:string|number){
        for (let item of this._hookSet){
            if(typeof value === 'string'){
                if(item.hookName === value) return item;
                continue;
            }else if(typeof value === 'number'){
                if(item.hookAddr === value) return item;
                continue;
            }
        }
    }

}
