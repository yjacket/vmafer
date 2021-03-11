const path = require("path");
const Utils = require('./utils');

module.exports = class Preset {
    constructor() { this.data = {} };
    input(value) { this.data.input = value; return this; }
    speed(value) { this.data.speed = value; return this; }
    maxrate(value) { this.data.maxrate = value; return this; }
    vrate(value) { this.data.vrate = value; return this; }
    arate(value) { this.data.arate = value; return this; }
    crf(value) { this.data.crf = value; return this; }
    threads(value) { this.data.threads = value; return this; }
    start(outdir) { 
        this.data.path = outdir;
        this.data.start = new Date(); 
    }
    finish() { this.data.finish = new Date(); }
    clips(outpath) { 
        let p = this.args(outpath); 
        p.unshift("-ss", "00:00:00", "-t", "180");
        return p;
    }
    args(outpath) {
        let a = ["-y", "-i", `"${this.data.input}"`];
        if (this.data.speed) {
            a.push("-preset");
            a.push(this.data.speed);
        }
        if (this.data.arate) {
            a.push("-b:a");
            a.push(`${this.data.arate}k`);
        }
        if (this.data.vrate) {
            a.push("-b:v");
            a.push(`${this.data.vrate}k`);
        }
        if (this.data.maxrate) {
            a.push("-maxrate");
            a.push(`${this.data.maxrate}k`);
        }
        if (this.data.vrate || this.data.maxrate) {
            a.push("-bufsize");
            a.push(`${(this.data.vrate ? this.data.vrate : this.data.maxrate) * 2}k`);
        }
        if (this.data.crf) {
            a.push("-crf");
            a.push(this.data.crf);
        }
        if (this.data.threads) {
            a.push("-threads");
            a.push(this.data.threads);
        }
        a.push(outpath);
        return a;
    }
    get name() {
        let n = [];
        n.push(this.data.speed ? this.data.speed : "medium");
        if (this.data.arate) n.push("ar" + this.data.arate);
        if (this.data.vrate) n.push("vr" + this.data.vrate);
        if (this.data.maxrate) n.push("mr" + this.data.maxrate);
        n.push(this.data.crf ? "c" + this.data.crf : "c23");
        if (this.data.threads) n.push("t" + this.data.threads);
        return n.join("-") + ".mp4";
    }
    get path() { return this.data.path; }
    get output() { return path.join(this.path, this.name); }
    get elapsed() { 
        return this.data.start 
            ? parseInt(Utils.elapse(this.data.finish, this.data.start) / 1000) 
            : "N/A"; 
    }
}