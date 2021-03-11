const fs = require("fs");
const path = require("path");
const es = require('event-stream');
const sleep = require('system-sleep');
const cmdrunner = require("./cmdrunner.js");
const Preset = require("./preset.js");
const Utils = require("./utils.js");
const MAX_WORKER = 6;

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
        fs.readdirSync(dist).forEach(fname => {
            if (!fname.endsWith(".csv")) {
                distortions.push({output: path.join(dist, fname), path: dist, name: fname});
            }
        });
        console.log(`Found ${distortions.length} files in ${dist}`);
    } else {
        distortions.push({output: dist, path: "", name: dist});
    }
    compare(ref, distortions);
}

function compare(ref, distortions) {
    const start = new Date();
    try {
        doCompare(ref, distortions);
    } catch (e) {
        console.error(e);
    } finally {
        console.log(`Elapsed: ${Utils.elapse(new Date(), start) / 1000}sec`);
    }
}

function doCompare(original, distortions) {

    const origSize = fs.lstatSync(original).size;
    const results = [];
    let working = 0;
    let done = 0;
    let index = 0;

    while (distortions.length != done) {
        if (working >= MAX_WORKER || distortions.length == index) {
            sleep(1000);
            continue;
        }
        working++;
        const dist = distortions[index++];
        const logfile = dist.path + "/" + Utils.changeExt(dist.name, "csv");
        //const args = `-y -ss 00:00:00 -i ${dist.path} -i ${original} -t 180 -lavfi libvmaf="model_path=vmaf_v0.6.1.json':psnr=1:ssim=1:log_fmt=csv:log_path='${logfile}'" -f null -`.split(" ");
        const args = `-y -i ${dist.output} -i ${original} -lavfi libvmaf="model_path=vmaf_v0.6.1.json':psnr=1:ssim=1:log_fmt=csv:log_path='${logfile}'" -f null -`.split(" ");
        cmdrunner.run("ffmpeg.exe", args, (output) => {
            working--;
            done++;
            if (!output.result) {
                console.error("Error", output);
                return;
            }
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
                    psnr = parseInt(psnr * 1000) / 1000;
                    ssim = parseInt(ssim * 100000) / 1000;
                    vmaf = parseInt(vmaf * 1000) / 1000;
                    let total = parseInt((psnr + ssim + vmaf) * 100) / 100;
                    let fsize = fs.lstatSync(dist.output).size;
                    let comp = parseInt(fsize * 1000 / origSize) / 10;
                    let elapsed = dist.elapsed || "";
                    results.push(`${psnr}\t${ssim}\t${vmaf}\t${total}\t${comp}\t${Utils.numberWithCommas(fsize)}\t${elapsed}\t${dist.name}`);
                    fs.unlink(logfile, (err) => { 
                        if (err) {
                            console.error("Failed to delete log file", err);
                        }
                    });
                })
            );
        });

    }
    
    console.log(`\r\n<Results>\r\n`);
    console.log(`Original: ${ref} (${Utils.humanFileSize(origSize)})`);
    console.log("------\t------\t------\t------\t------\t------------\t------\t------------");
    console.log(`PSNR\tSSIM\tVMAF\tTotal\tComp%\tSize(bytes)\tElapsed\tDistortion`);
    console.log("------\t------\t------\t------\t------\t------------\t------\t------------");
    results.forEach(r => console.log(r));
    console.log(`\r\nDone!`);
}

function getEncoderSettings(original) {
    return [
        new Preset().input(original),
        new Preset().input(original).crf(24),
        new Preset().input(original).crf(25),
        new Preset().input(original).crf(26),
        new Preset().input(original).crf(27),
        new Preset().input(original).crf(28),
        new Preset().input(original).crf(29),
        new Preset().input(original).crf(30),

        new Preset().input(original).speed("veryfast"),
        new Preset().input(original).speed("veryfast").crf(24),
        new Preset().input(original).speed("veryfast").crf(25),
        new Preset().input(original).speed("veryfast").crf(26),
        new Preset().input(original).speed("veryfast").crf(27),
        new Preset().input(original).speed("veryfast").crf(28),
        new Preset().input(original).speed("veryfast").crf(29),
        new Preset().input(original).speed("veryfast").crf(30),
    ];
}


function encodeAll(presets, onComplete) {

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
        dist.start(outdir);

        const param = dist.clips(dist.output);
        
        cmdrunner.run("ffmpeg.exe", param, (output) => {
            results.push(output);
            dist.finish();
            working--;
        });
    }

    onComplete();
}