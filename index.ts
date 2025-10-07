import { CPU } from "./src/cpu";
import { Memory } from "./src/mem";

function toLittleEndianBytes(value: number): Uint8Array {
    const u = value >>> 0;
    return new Uint8Array([
        u & 0xFF,
        (u >>> 8) & 0xFF,
        (u >>> 16) & 0xFF,
        (u >>> 24) & 0xFF,
    ]);
}

// ToDo: separate program & data memory
// ToDo: проверить jalr
// Реализовать sX (store), потом тестить lb, lh, lw, lbu, lhu

const main = async () => {
    const mem = new Memory();
    let adress = 0;

    const memWrite = (word: number) => {
        const [b0, b1, b2, b3] = toLittleEndianBytes(word); 
        mem.write(adress + 0, b0);
        mem.write(adress + 1, b1);
        mem.write(adress + 2, b2);
        mem.write(adress + 3, b3);
        adress += 4;
    }

    memWrite(0x00001097);
    memWrite(0x00400083);

    const cpu = new CPU(mem);
    cpu.step();
    cpu.dump();

    cpu.step();
    cpu.dump();
}

main();
