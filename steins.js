//steins gate pc
let fs = require("fs");
let path = require("path");

//node steins.js export <file_name>
//node steins.js import <dir_name>
//node steins.js ref_import <dir_name> <file_name> (referenced import for file order problem)

//68 archive_header
//256 file_header
//* file_length

let ref_files = [];

let exporter = () => {

    function readBytes(filePosition, numBytesToRead) {
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
        return buf.toString("hex");
    }

    let save_poss = 8;
    function readHex(...params) {
        save_poss += params[1];
        return Buffer.from(readBytes(...params), 'hex').readUInt32LE();
    }

    function str_counter(start) {
        let str_poss = 0;
        while (1) {
            if (readBytes(start + str_poss, 1) == "00") {
                return Buffer.from(readBytes(start, str_poss), 'hex').toString()
            }
            str_poss++
        }
    }

    function dirControl(filePath) {
        let dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        fs.mkdirSync(dirname, {
            recursive: true
        });
    }

    let files_count,
        file_count,
        file_name,
        file_offset,
        file_offset_len,
        scanned_file_len = 0;

    files_count = readHex(save_poss, 4);
    save_poss += 56;
    while (files_count > scanned_file_len) {
        file_count = readHex(save_poss, 4);
        file_offset = readHex(save_poss, 4);
        save_poss += 12;
        file_offset_len = readHex(save_poss, 4);
        save_poss += 4;
        file_name = str_counter(save_poss);
		ref_files[ref_files.length] = `${process.argv[3].split(".")[0]}\\` + file_name;
        save_poss += 228;
        if (scanned_file_len != file_count) {
            file_name = "Removed File"
        }else if(process.argv[2] === "export"){
            dirControl(`${process.argv[3].split(".")[0]}\\` + file_name);
            fs.writeFileSync(`${process.argv[3].split(".")[0]}\\` + file_name, Buffer.from(readBytes(file_offset, file_offset_len), "hex"))
        }
        console.log(files_count, file_count + 1, file_name, file_offset, file_offset_len)
        scanned_file_len += 1;
    }
    // console.log("toplam dosya", files_count)
    // readHex(save_poss,4).readInt32LE();
    // readHex(save_poss,4).toString();
}

////

let importer = () => {

    const searchDir = (p, a = []) => {
        if (fs.statSync(p).isDirectory()) {
            fs.readdirSync(p).map(f => searchDir(a[a.push(path.join(p, f)) - 1], a))
            a.map(function(x) {
                if (fs.statSync(x).isDirectory()) {
                    a.splice(a.indexOf(x), 1)
                }
            })
        }
        return a //.map(x => x.replace(`${p}\\`, ""));
    }

    function d2h(d) { //int32
        let h = (d).toString(16),
            x = Buffer.alloc(4);
        h = h.length % 2 ? '0' + h : h;
        h = h.match(/.{1,2}/g).reverse().join('');
        h = Buffer.from(h, "hex");
        x.fill(h, 0, h.length);
        return x;
    }

    let imported_files = (process.argv[2] === "ref_import") ? ref_files : searchDir(process.argv[3]),
        file_distance = 0,
        dist_per_file = 0,
        scanned_file_len = 0;

    let archive_header = Buffer.alloc(68); //Archive Header
    archive_header.fill(Buffer.from("4D504B0000000200", "hex"), 0, 8);
    archive_header.fill(d2h(imported_files.length), 8, 12);
    fs.writeFileSync(`${process.argv[3]}.mpk`, archive_header);

    while (imported_files.length > scanned_file_len) {

        let file_header = Buffer.alloc(256); //File Header
        let file_length = fs.readFileSync(imported_files[scanned_file_len]).length;
        let file_length_prev = fs.readFileSync(imported_files[dist_per_file]).length;
        if (scanned_file_len === 0) {
            file_distance = 68 + (imported_files.length * 256);
        } else {
            file_distance += file_length_prev;
            dist_per_file += 1
        }

        file_header.fill(d2h(scanned_file_len), 0, 4);
        file_header.fill(d2h(file_distance), 4, 8);
        file_header.fill(d2h(file_length), 12, 16);
        file_header.fill(d2h(file_length), 20, 24);
        file_header.fill(imported_files[scanned_file_len].replace(`${process.argv[3]}\\`, ""), 28, 28 + imported_files[scanned_file_len].replace(`${process.argv[3]}\\`, "").length);
        console.log(scanned_file_len + 1, imported_files[scanned_file_len].replace(`${process.argv[3]}\\`, ""), file_distance, file_length)
        fs.appendFileSync(`${process.argv[3]}.mpk`, file_header);
        scanned_file_len += 1;
        continue

    }

    scanned_file_len = 0;
    while (imported_files.length > scanned_file_len) {
        fs.appendFileSync(`${process.argv[3]}.mpk`, fs.readFileSync(imported_files[scanned_file_len]));
        scanned_file_len += 1;
        continue
    }

}

if (process.argv[2] === "import" && process.argv[3] != undefined) {
    importer()
}
else if (process.argv[2] === "ref_import" && process.argv[3] != undefined && process.argv[4] != undefined) {
	let org_file = process.argv[3];
	process.argv[3] = process.argv[4];
    exporter()
	process.argv[3] = org_file;
	importer()
}
else if (process.argv[2] === "export" && process.argv[3] != undefined) {
    exporter()
} else {
console.log(`
//node steins.js export <file_name>
//node steins.js import <dir_name>
//node steins.js ref_import <dir_name> <file_name> (referenced import for file order problem)`);
}
