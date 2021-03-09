const fs = require("fs");
const path = require("path");
const es = require('event-stream');
const cmdrunner = require("./cmdrunner.js");
const Preset = require("./preset.js");
const sleep = require('system-sleep');
const MAX_WORKER = 8;

if (process.argv.length < 3) {
    console.log("Usaeg: node app.js original distortion")
    return 1;
}
const ref = process.argv[2];
const dist = process.argv.length >= 4 ? process.argv[3] : null;

if (!fs.existsSync(ref)) {
    console.log("Original is not exist:", ref);
    return 1;
}

const distortions = [];

if (dist == null) {
    getEncoderSettings(ref).forEach(preset => distortions.push(preset));
    console.log(`Test ${distortions.length} cases`);
    encodeAll(distortions, () => compare(ref, distortions));
} else if (!fs.existsSync(dist)) {
    console.log("Distortion is not exist:", dist);
    return 1;
} else {
    if (fs.lstatSync(dist).isDirectory()) {
        fs.readdirSync(dist).forEach(fname => distortions.push({name: path.join(dist, fname)}));
        console.log(`Found ${distortions.length} files in ${dist}`);
    } else {
        distortions.push({name: dist});
    }
    compare(ref, distortions, test);
}


function compare(original, distortions) {

    const origStat = fs.lstatSync(original);
    const results = [];
    let working = 0;
    let index = 0;

    while (distortions.length != results.length) {
        if (working >= MAX_WORKER || distortions.length == index) {
            sleep(1000);
            continue;
        }
        working++;
        const dist = distortions[index++];
        const logfile = `${new Date().getTime()}.csv`;
        const args = `-y -ss 00:00:00 -i ${dist.name} -i ${original} -t 60 -lavfi libvmaf="model_path=vmaf_v0.6.1.json':psnr=1:ssim=1:log_fmt=csv:log_path='${logfile}'" -f null -`.split(" ");
        cmdrunner.run("ffmpeg.exe", args, (output) => {
            if (output.result) {
                let rows = -1, psnr = 0, ssim = 0, vmaf = 0;
                let s = fs.createReadStream(logfile)
                    .pipe(es.split())
                    .pipe(es.mapSync((line) => {
                        s.pause();
                        if (line && line.indexOf(",") > -1 && rows++ >= 0) {
                            const cols = line.split(",");
                            if (isNaN(cols[12])) {
                                console.warn(`Line has NaN value: ${line}`, cols[12], cols[13], cols[14]);
                                rows--;
                            } else {
                                psnr += parseFloat(cols[12]);
                                ssim += parseFloat(cols[13]);
                                vmaf += parseFloat(cols[14]);
                            }
                        }
                        s.resume();
                    })
                    .on('error', err => console.error("Error", err))
                    .on('end', () => {
                        psnr /= rows;
                        ssim /= rows;
                        vmaf /= rows;
                        let fsize = fs.lstatSync(dist.name).size;
                        results.push(`${parseInt(psnr)}\t${parseInt(ssim * 100)}\t${parseInt(vmaf)}\t${parseInt(psnr + ssim * 100 + vmaf)}\t${parseInt(fsize * 100 / origStat.size)}%\t${numberWithCommas(fsize)}\t${dist.elapsed}\t${dist.name}`);
                        fs.unlink(logfile, (err) => { 
                            if (err) {
                                console.error("Failed to delete log file", err);
                            }
                        });
                        working--;
                    })
                );
            }
        });

    }
    
    console.log(`\r\n<Results>\r\n`);
    console.log(`Original: ${ref} (${humanFileSize(origStat.size)})`);
    console.log("------\t------\t------\t------\t------\t------------\t------\t------------");
    console.log(`PSNR\tSSIM\tVMAF\tTotal\tComp%\tSize(bytes)\tElapsed\tDistortion`);
    console.log("------\t------\t------\t------\t------\t------------\t------\t------------");
    results.forEach(r => console.log(r));
    console.log("\r\nDone!");
}
function getEncoderSettings(original) {
    return [
        new Preset().input(original),
        new Preset().input(original).crf(25),
        // new Preset().input(original).crf(28).args(),
        // new Preset().input(original).speed("veryfast").args(),
        // new Preset().input(original).speed("veryfast").crf(25).args(),
        // new Preset().input(original).speed("veryfast").crf(28).args(),
        
        // new Preset().input(original).vrate("2000k").args(),
        // new Preset().input(original).maxrate("2000k").args(),
        // new Preset().input(original).vrate("2000k").maxrate("3000k").args(),
        
        // new Preset().input(original).speed("veryfast").vrate("2000k").args(),
        // new Preset().input(original).speed("veryfast").maxrate("2000k").args(),
        // new Preset().input(original).speed("veryfast").vrate("2000k").maxrate("3000k").args(),

        // new Preset().input(original).vrate("1000k").args(),
        // new Preset().input(original).maxrate("1000k").args(),
        // new Preset().input(original).vrate("1000k").maxrate("1500k").args(),

        // new Preset().input(original).speed("veryfast").vrate("1000k").args(),
        // new Preset().input(original).speed("veryfast").maxrate("1000k").args(),
        // new Preset().input(original).speed("veryfast").vrate("1000k").maxrate("1500k").args(),
    ];
}
/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function encodeAll(presets) {

    const outdir = "encoded-" + new Date().getTime();
    fs.mkdirSync(outdir);

    const results = [];
    let working = 0;
    let index = 0;

    while (presets.length != results.length) {
        if (working >= 1 || presets.length == index) {
            sleep(1000);
            continue;
        }
        working++;
        
        const dist = presets[index++];
        dist.path = outdir;
        dist.start = new Date();

        const param = dist.args;
        param.push(path.join(outdir, dist.name));
        
        cmdrunner.run("ffmpeg.exe", param, (output) => {
            dist.finish = new Date();
            working--;
        });
    }
}