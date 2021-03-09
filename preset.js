module.exports = class Preset {
    input(value) { this.data.input = value; return this; }
    speed(value) { this.data.speed = value; return this; }
    maxrate(value) { this.data.maxrate = value; return this; }
    vrate(value) { this.data.vrate = value; return this; }
    arate(value) { this.data.arate = value; return this; }
    crf(value) { this.data.crf = value; return this; }
    threads(value) { this.data.threads = value; return this;}
    get args() {
        let a = ["-i", `"${this.data.input}"`];
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
        return a;
    }
    get name() {
        let ext = this.data.input.substring(this.data.input.lastIndexOf("."));
        let n = [];
        n.push(this.data.speed ? this.data.speed : "no_speed");
        n.push(this.data.arate ? this.data.arate : "no_arate");
        n.push(this.data.vrate ? this.data.vrate : "no_vrate");
        n.push(this.data.maxrate ? this.data.maxrate : "no_mrate");
        n.push(this.data.crf ? this.data.crf : "no_crf");
        n.push(this.data.threads ? this.data.threads : "no_threads");
        return n.join("-") + ext;
    }
    start() { this.data.start = new Date(); }
    finish() { this.data.finish = new Date(); }
    get path() { return this.data.path; }
    set path(dir) { this.data.path = dir; }
    get elapsed() { return elapse(this.data.finish, this.data.start);}
}

function elapse(finish, start) {
    return (finish == null ? new Date() : finish).getTime() - start.getTime();
}