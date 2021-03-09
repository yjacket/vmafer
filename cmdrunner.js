const child_process = require('child_process');
let seq = 0;

class CmdRunmer {

    run(cmd, args, onClose) {

        const output = { id: seq++, result: false, out: "", err: "", start: new Date(), get elapsed() { return elapse(this.finish, this.start);} };

        console.debug(`JOB#${output.id}\t${cmd}\t${args.join(" ")}`);

        const child = child_process.spawn(cmd, args, { encoding: 'utf8', shell: true });

        child.on('error', (error) => {
            console.error("Fail to run command:", error);
            output.finish = new Date();
            output.result = false;
            onClose(output);
        });

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        child.stdout.on('data', data => output.out += data.toString());
        child.stderr.on('data', data => output.err += data.toString());
        child.on('close', (code, signal) => {
            output.finish = new Date();
            output.result = code == 0;
            console.log(`JOB$${output.id}\t${output.elapsed / 1000}s\tExit with ${code} [${signal}]`);
            onClose(output);
        });
    }

}

function elapse(finish, start) {
    return (finish == null ? new Date() : finish).getTime() - start.getTime();
}
module.exports = new CmdRunmer();