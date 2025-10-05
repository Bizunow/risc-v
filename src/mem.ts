export class Memory {
    public cell;

    constructor() {
        this.cell = new Uint8Array(0xffff + 1);
    }

    public read(addr: number): number {
        return this.cell[addr & 0xffff];
    }

    public write(addr: number, value: number): void {
        this.cell[addr & 0xffff] = value & 0xff;
    }
}