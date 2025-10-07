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

// ToDo: проверить jal, jalr

const main = async () => {
    const mem = new Memory();
    
    const [b0, b1, b2, b3] = toLittleEndianBytes(0x00001097);
    mem.write(0, b0);
    mem.write(1, b1);
    mem.write(2, b2);
    mem.write(3, b3);

    const cpu = new CPU(mem);
    cpu.step();
    cpu.dump();
}

main();
