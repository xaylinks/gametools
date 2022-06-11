let fs = require("fs");
if (process.argv[2] === "--help" || process.argv[2] === undefined || process.argv[3] === undefined) {
    console.log(`\nUncharted Golden Abyss *.bsp Localization Tool. \nby iseeeva \n\ngolden_bsp.exe <export> *.bsp\ngolden_bsp.exe <build> *.ini`);
    process.exit()
}
if (!fs.existsSync(process.argv[3])) {
    console.log(`${process.argv[3]} file was not found`);
    process.exit()
}

////
let file = fs.readFileSync(process.argv[3]),
    file_export_name = `${process.argv[3].substr(0, process.argv[3].lastIndexOf('.'))}.ini`;
    file_build_name = `${process.argv[3].substr(0, process.argv[3].lastIndexOf('.'))}.bsp_build`;

let scan_pos = 16;
function readHex(filePosition, numBytesToRead, add_pos) {
    const buf = Buffer.alloc(numBytesToRead, 0);
    let fd;

    try {
        fd = fs.openSync(process.argv[3], "r");
        fs.readSync(fd, buf, 0, numBytesToRead, filePosition);
    } finally {
        if (fd) {
            fs.closeSync(fd);
        }
    }
    if (add_pos === true) {
        scan_pos += numBytesToRead;
    }
    return buf;
}

function int(d) {
    let h = (d).toString(16);
    h = h.length % 2 ? '0' + h : h;
    // h = h.match(/.{1,2}/g).reverse().join(''); //little endian
    h = Buffer.from(h, "hex");
    x = Buffer.alloc(h.length);
    x.fill(h, 0, h.length);
    return x;
}

function byte_length(str) {
    var s = str.length;
    if (Buffer.isBuffer(str)) {
        return s
    }
    for (var i = str.length - 1; i >= 0; i--) {
        var code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) s++;
        else if (code > 0x7ff && code <= 0xffff) s += 2;
        if (code >= 0xDC00 && code <= 0xDFFF) i--;
    }
    return s;
}

function gen_length(length) {
    let max = 0;
    let str = "";
    if (length > 127) {
        max = 128;
    }
    while (true) {
        if (length > 255) {
            max += 1;
            length -= 256
        } else {
            break
        }
    }
    if (max > 0) {
        str += int(max).toString("hex")
    }
    str += int(length).toString("hex");
    return Buffer.from(str, "hex");
}
////

if (process.argv[2] === "export") {
    bsp_export()
} else if (process.argv[2] === "build") {
    bsp_build()
}

function bsp_export() {
    fs.writeFileSync(file_export_name, "");
    while (scan_pos < file.length) {

        let container_size,
            value_size;

        if (readHex(scan_pos, 1, true).toString("hex") != "4b") {
            console.log("This container cant supported in this tool\nPlease contact the dev");
            process.exit();
        }

        if (parseInt(readHex(scan_pos, 1).toString("hex"), 16) > 128) {
            container_size = (parseInt(readHex(scan_pos, 1).toString("hex"), 16) - 128) * 2;
            container_size = 128 * container_size;
            scan_pos++;
            container_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16) + container_size;
        } else if (parseInt(readHex(scan_pos, 1).toString("hex"), 16) === 128) {
            scan_pos++;
            container_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16);
        } else {
            container_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16);
        }

        fs.appendFileSync(file_export_name, `\n[CONTAINER]`);

        for (let i = 0; i < 5; i++) {
            fs.appendFileSync(file_export_name, `\nValue=`);
            scan_pos++; //${parseInt(readHex(scan_pos,1,true).toString("hex"),16)}

            if (parseInt(readHex(scan_pos, 1).toString("hex"), 16) > 128) {
                value_size = (parseInt(readHex(scan_pos, 1).toString("hex"), 16) - 128) + 1;
                value_size = 128 * value_size;
                scan_pos++;
                value_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16) + value_size;
            } else if (parseInt(readHex(scan_pos, 1).toString("hex"), 16) === 128) {
                scan_pos++;
                value_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16);
            } else {
                value_size = parseInt(readHex(scan_pos, 1, true).toString("hex"), 16);
            }
            if (i === 0) {
                fs.appendFileSync(file_export_name, `${parseInt(readHex(scan_pos, value_size,true).toString("hex"), 16)}`);
            } else {
                fs.appendFileSync(file_export_name, `${readHex(scan_pos,value_size,true).toString()}`);
            }
        }

        fs.appendFileSync(file_export_name, `\n[END_OF_CONTAINER]\n`);
    }
	console.log(`${file_export_name} Finished`)
}

function bsp_build() {
    let container_starts = ['[CONTAINER]', '[END_OF_CONTAINER]'],
        container_startsIndex = [file.indexOf(container_starts[0]), file.indexOf(container_starts[1])];

    fs.writeFileSync(file_build_name, Buffer.from("EAF64788B6FDF49D1C5579F1EB700F98", "hex"));

    while (container_startsIndex[0] != -1) {
        let container = readHex(container_startsIndex[0] + container_starts[0].length + 1, container_startsIndex[1] - (container_startsIndex[0] + container_starts[0].length) - 1).toString();
        let container_content = [],
            container_values = [],
            container_length = 0;

        let container_split = container.split(/^Value\s*=(?<value>.*?)/gmi);
        for (let i = 1; i < container_split.length / 2; i++) {
            let value_string = container_split[2 * i].slice(0, -1);

            container_values.push(value_string);
            container_content.push(int(i));
            switch (i) {
                case 1:
                    let value_id = int(parseInt(value_string));
                    container_content.push(int(value_id.toString().length));
                    container_content.push(value_id);
                    break;
                default:
                    container_content.push(gen_length(byte_length(value_string)));
                    container_content.push(value_string);
                    break;
            }
        }
        fs.appendFileSync(file_build_name, Buffer.from("4B", "hex"));
        for (var key in container_content) {
            if (container_content instanceof Array) {
                container_length += byte_length(container_content[key]);
            }
        }
        fs.appendFileSync(file_build_name, gen_length(container_length));
        for (var key in container_content) {
            if (container_content instanceof Array) {
                fs.appendFileSync(file_build_name, container_content[key])
            }
        }
        console.log(container_values);
        container_startsIndex[0] = file.indexOf(container_starts[0], container_startsIndex[0] + 1);
        container_startsIndex[1] = file.indexOf(container_starts[1], container_startsIndex[1] + 1);
        // process.exit();
    }
	console.log(`\n${file_build_name} Finished`)
}
