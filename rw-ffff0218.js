//Renderware DAT Archive version ffff0218 exporter
let fs = require("fs");

////
function readBytes(filePosition, numBytesToRead) {
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
    return buf.toString("hex");
}

function readHex(...params) {
  return Buffer.from(readBytes(...params), 'hex')
}
////

if(readHex(0,3).toString() === "Z01"){console.log("The file is ZLIB, please unzip the archive first.\n(offzip or another tools)");process.exit();}
let index = fs.readFileSync(process.argv[2],"hex");
fs.writeFileSync(`${process.argv[2]}.log`,"");

let containerPos = index.indexOf('16070000') //dat container search
let unStart=0; //unfiltered files, start byte. line:101
while (containerPos !== -1) {
	
  let temp; //just a temp
  let _temp; //just a temp
  
  //for the 2byte hex system
  let containerTemp = containerPos/2;
  
  //container header 4
  let temp0 = readBytes(containerTemp,4);
  
  //container size 4
  let temp1 = readHex(containerTemp+4,4).readInt32LE()
  
  //container version 4
  let temp2 = readBytes(containerTemp+8,4);
  
  if(temp2 != "ffff0218"){ //search in temp2 for renderware version
  console.log(`[OFFSET: ${containerTemp}] Container Header include unknown renderware version`);
  containerPos = index.indexOf('16070000', containerPos + 1)
  continue}
  
  //header size 4
  let temp3 = readHex(containerTemp+12,4).readInt32LE()
  
  //file size 4
  let temp4 = readHex(containerTemp+16+temp3,4).readInt32LE()
  
  ///////////////////////
  let temp3_1; //file type x
  let temp3_2; //file path x
  if(readHex(containerTemp+16,4).readInt32LE() === 4){
  temp3_1 = readHex(containerTemp+40,4).readInt32LE()
  temp3_2 = readHex(containerTemp+44+temp3_1,4).readInt32LE()
  temp3_2 = readHex(containerTemp+48+temp3_1,temp3_2).toString()
  temp3_1 = readHex(containerTemp+44,temp3_1).toString()
  }else{
  _temp = readHex(containerTemp+16,4).readInt32LE()
  temp = readHex(containerTemp+36+_temp,4).readInt32LE()
  temp3_1 = readHex(containerTemp+40+_temp,temp).toString()
  temp3_2 = readHex(containerTemp+40+_temp+temp,4).readInt32LE()
  temp3_2 = readHex(containerTemp+44+_temp+temp,temp3_2).toString()
  }
  ///////////////////////
  
  fs.mkdirSync(`.${process.argv[2]}`, { recursive: true })
  
  let temp3_1re = temp3_1.replace(/[^a-zA-Z0-9 ]/g, ""); //for file type cleaning
  
  //log
  const _log = [
    `[${temp3_1re}-${containerTemp}.dat]`,
    `[OFFSET: ${containerTemp}-${containerTemp + temp1}]`,
    `CONTAINER HEADER: ${temp0}`,
    `CONTAINER SIZE: ${temp1}`,
    `CONTAINER VER: ${temp2}`,
    `HEADER SIZE: ${temp3}`,
    `FILE SIZE: ${temp4}`,
    `FILE TYPE: ${temp3_1re}`,
    `FILE PATH: ${temp3_2}`
  ]
  const log = _log.join('\n')
  //
  
  //write & logging
  fs.writeFileSync(`.${process.argv[2]}/${temp3_1re}-${containerTemp}.dat`,readHex(containerTemp+20+temp3,temp4));
  fs.appendFileSync(`${process.argv[2]}.log`,`\n\n${log}`);
  console.log(`\n${log}`)
  //
  
  //unfiltered files
  fs.mkdirSync(`.${process.argv[2]}/junk`, { recursive: true })
  let unEnd = containerTemp-unStart; //unfiltered files, end byte.
  
  // if your file has an offset that you want to recover from unfiltered
  // if(readBytes(unStart,4) === "04000000"){
	  // do
  // } else if (readBytes(unStart,4) === "08000000"){
	  // do
  // } else {
  // fs.writeFileSync(`.${process.argv[2]}/junk/unfiltered_${unStart}-${containerTemp}.dat`,readHex(unStart,unEnd));
  // }
  
  fs.writeFileSync(`.${process.argv[2]}/junk/unfiltered_${unStart}-${containerTemp}.dat`,readHex(unStart,unEnd));
  unStart = containerTemp+temp1;
  //
  
  containerPos = index.indexOf('16070000', containerPos + 1)
  
}
