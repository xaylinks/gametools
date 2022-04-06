//MBD27

////
let fs = require("fs");
let file = fs.readFileSync(process.argv[2],"hex");
function readHex(filePosition, numBytesToRead) {
    const buf = Buffer.alloc(numBytesToRead, 0);
    let fd;

    try {
        fd = fs.openSync(process.argv[2], "r");
        fs.readSync(fd, buf, 0, numBytesToRead, filePosition);
    } finally {
        if (fd) {
            fs.closeSync(fd);
        }
    }
    return buf;
}
////
let i = 0,
    un_size;

let containerPos = 0,
    containerPosses = ['00000000c0270900','01000000c0270900'],
    containerPosIndex = [file.indexOf('00000000c0270900'),file.indexOf('01000000c0270900')],
    is_compressed=0;
	
while (i < containerPosIndex.length) {
  if(containerPosIndex[i] === -1){i++; continue}
  
  containerPos = containerPosIndex[i]/2;
  if(readHex(containerPos+16,4).readUInt32LE() < 5){containerPos+=20}else{containerPos+=16} //file size bytes
  if(readHex(containerPos,4).readUInt32LE() === 4000000000){containerPos+=4;un_size=-1}else{un_size=readHex(containerPos,4).readUInt32LE()} //uncompressed size missing
  if(readHex(containerPos+8,2).toString("hex") === "789c"){containerPos+=4;is_compressed=1}//is compressed with zlib
  
  const _log = [
    `[${containerPos}.dat1]`,
    `[is_compressed: ${is_compressed}]`,
    `[OFFSET: ${containerPos}-${containerPos + readHex(containerPos,4).readUInt32LE()}]`,
    `[UNCOMP_SIZE: ${un_size}]`,
    `[COMP_SIZE: ${readHex(containerPos,4).readUInt32LE()}]`,
  ]
  const log = _log.join('\n')
  
  fs.writeFileSync(`${containerPos}.dat1`,readHex(containerPos+4,readHex(containerPos,4).readUInt32LE()))
  console.log(`\n${log}`);is_compressed=0;
  containerPosIndex[i] = file.indexOf(containerPosses[i], containerPosIndex[i] + 1);
}
