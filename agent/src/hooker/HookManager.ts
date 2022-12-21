import { Hook } from "./hook";

export class HookManager{
    private _hookDict:{[key:string]: Hook} = {};

    public constructor(){}

    public pushBack(key:string, value:Hook){
        this._hookDict[key] = value;
    }

    public getValue(key:string){
        for (const _key in this._hookDict) {
            if (_key === key) {
                return this._hookDict[key];
            }
        }
        return null;
    }

}
