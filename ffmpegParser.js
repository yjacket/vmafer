const LINE_KEYWORD_PROGRESS = ["frame=", "fps=", "time=", "bitrate=", "speed="];
const LINE_KEYWORD_DURATION = ["Duration:", "start:", "bitrate:"];

class FFmpegParser {
    isProgressLine(line) {
        for (const r of LINE_KEYWORD_PROGRESS) {
            if (line.indexOf(r) == -1) {
                return false;
            }
        }
        return true;
    }
    isDurationLine(line) {
        for (const r of LINE_KEYWORD_DURATION) {
            if (line.indexOf(r) == -1) {
                return false;
            }
        }
        return true;
    }
    parserLine(line) {
        if (isProgressLine(line)) {
            let pos = line.indexOf("time=") + 5;
            let progress = timestringToMillis(line.substr(pos, line.indexOf(" ", pos)));
        }
        if (isDurationLine(line)) {
            let pos = line.indexOf("Duration: ") + 10;
            let duration = timestringToMillis(line.substr(pos, line.indexOf(",", pos)));
        }
    }
    timestringToMillis(timestring) {
        let timestamp = timestring.split(".");
        let upper = timestamp[0].split(":");
        let hour = parseInt(upper[0]) * 60 * 60 * 1000;
        let min = parseInt(upper[1]) * 60 * 1000;
        let sec = parseInt(upper[2]) * 1000;
        let lower = parseInt(timestamp[1]);
        return hour + min + sec + lower;
    }
}

module.exports = new FFmpegParser();
