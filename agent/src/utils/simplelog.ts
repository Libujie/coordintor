


export class SimpleLog {
    private static instance:SimpleLog;
    private logger:any;
    private constructor(name?:string){
        let log4js = require("log4js");
        this.logger = log4js.getLogger(name);
    };

    public static getLogger(name?:string){
        if(!SimpleLog.instance){
            SimpleLog.instance = new SimpleLog(name)
        }
        return SimpleLog.instance;
    }

    public i(msg?:any){
        this.logger.info(msg)
    }
    public w(msg?:any){
        this.logger.warn(msg)
    }
    public d(msg?:any){
        this.logger.debug(msg)
    }
    public e(msg?:any){
        this.logger.error(msg)
        
    }
}