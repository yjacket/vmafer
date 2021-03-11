const { createLogger, format, transports } = require('winston');
const level = process.env.NODE_ENV !== 'production' ? 'debug' : 'info';
const logfile = `${process.env.APP_PATH}/vmafer.log`;
const option = {
    file: {
        level: level,
        filename: logfile,
        handleExceptions: true,
        maxsize: 5242880,
        maxFiles: 2,
        format: format.combine(
            format.timestamp({
                format: "YYYY-MM-DD HH:mm:ss.SSS"
            }),
            format.printf(({ timestamp, level, message, ...rest }) => {
                let splatString = toString(rest[Symbol.for('splat')]);
                if (splatString && splatString !== '{}' && splatString !== '[]') {
                    return `${timestamp} ${level.toUpperCase()} ${message} ${splatString}`;
                }
                return `${timestamp} ${level.toUpperCase()} ${message}`;
            })
        )
    },
    console: {
        level: level,
        handleExceptions: true,
        format: format.combine(
            format.colorize(),
            format.timestamp({
                format: "HH:mm:ss.SSS"
            }),
            format.printf(({ timestamp, level, message, ...rest }) => {
                let splatString = toString(rest[Symbol.for('splat')]);
                if (splatString && splatString !== '{}' && splatString !== '[]') {
                    return `${timestamp} ${level} ${message} ${splatString}`;
                }
                return `${timestamp} ${level} ${message}`;
            })
        )
    }
}

const logger = createLogger({
    transports: [new transports.File(option.file)],
    exitOnError: false
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console(option.console));
}

function toString(splat) {
    if (!splat) return splat;
    let t = Object.prototype.toString.call(splat).slice(8, -1);
    if (t === 'String' || t === 'Number' || t === 'Boolean') return splat;
    if (t !== 'Array')
        try {
            return JSON.stringify(splat);
        }
        catch (error) {
            return "<Unknown>";
        };
    let a = [];
    for (let e of splat)
        a.push(toString(e));
    return a.join(" ");
}

class Logger {
    /**
     * file:///     Renderer
     * /resource/app.asar   Production
     */
    m = this.getCaller().getFileName().replace("file:///", '').replace(/\\/gi, "/").replace('/resources/app.asar', '').replace(process.env.APP_PATH.replace(/\\/gi, "/"), '').substr(1);
    error(msg, ...args) { return this.log('error', msg, args); }
    warn(msg, ...args) { return this.log('warn', msg, args); }
    info(msg, ...args) { return this.log('info', msg, args); }
    http(msg, ...args) { return this.log('http', msg, args); }
    verbose(msg, ...args) { return this.log('verbose', msg, args); }
    debug(msg, ...args) { return this.log('debug', msg, args); }
    silly(msg, ...args) { return this.log('silly', msg, args); }
    log(level, msg, ...args) {
        return logger.log(level, (this.dev ? `${this.getCallerInfo()} ${toString(msg)}` : `(${this.m}) ${toString(msg)}`), args);
    }

    isRenderer() {
        // running in a web browser
        if (typeof process === 'undefined') return true
        // node-integration is disabled
        if (!process) return true
        // We're in node.js somehow
        if (!process.type) return false
        return process.type === 'renderer'
    }

    getCallerInfo() {
        /* 
            'new Error().stack' returns below 

            Error
                at Logger.getCallerInfo (D:\dev\study\uploader\app\core\log.js:93:22)
                at Logger.log (D:\dev\study\uploader\app\core\log.js:81:54)
            --------------------------------------------------------------------------- -> Splice here
                at Logger.info (D:\dev\study\uploader\app\core\log.js:69:21)           -> Skip Logger method
            ✓   at Object.<anonymous> (D:\dev\study\uploader\app\core\storage.js:6:5)  -> Pick 
                at Module._compile (internal/modules/cjs/loader.js:880:30)"
               ...        
        */
        let stacks = new Error().stack.split('\n').splice(3);
        for (let s of stacks) {
            if (s && s.trim().indexOf("at Logger.") == -1) { // Skip Logger methods
                let origin = s.trim().split(' ');
                let func = origin[origin.length - 2];
                let file = origin[origin.length - 1];

                if (this.isRenderer() && file.indexOf('file:///') === -1) {
                    file = `file:///${file.substr(1).replace(/\\/gi, '/')}`;
                }

                return `${func} ${file}`;
            }
        }
        return '<Unknown> <Unknown>';
    }

    getCaller() {
        let stacks = this.getStacks();
        for (let s of stacks) {
            if (__filename !== s.getFileName()) {
                return s;
            }
        }
        return stacks.pop();
    }

    getStacks() {
        // Save original Error.prepareStackTrace
        var origPrepareStackTrace = Error.prepareStackTrace;

        // Override with function that just returns `stack`
        Error.prepareStackTrace = function (_, stack) { return stack; }

        // Create a new `Error`, which automatically gets `stack`
        // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
        var stack = new Error().stack;

        // Restore original `Error.prepareStackTrace`
        Error.prepareStackTrace = origPrepareStackTrace;

        // Remove superfluous function call on stack
        // stack.shift(); // getStack --> Error

        return stack;
    }

    dev = process.env.NODE_ENV !== 'production';
}

module.exports = () => new Logger();