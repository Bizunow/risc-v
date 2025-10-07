// Ширина: равна XLEN — 32 бита для RV32, 64 бита для RV64, 128 для RV128 (если поддерживается).
// Особый регистр x0: всегда равен нулю, запись в него игнорируется (hardwired zero).
// Имена по ABI и их типичные роли:
// x0 = zero — константа 0.
// x1 = ra — return address (адрес возврата).
// x2 = sp — stack pointer (указатель стека), должен быть корректно поддержан.
// x3 = gp — global pointer (глобальный указатель для мелких данных).
// x4 = tp — thread pointer (для TLS).
// x5–x7 = t0–t2 — временные / caller‑saved.
// x8 = s0 / fp — saved register или frame pointer (s0 и одно и то же место).
// x9 = s1 — сохранённый регистр.
// x10–x17 = a0–a7 — аргументы / возвращаемые значения (caller‑saved).
// x18–x27 = s2–s11 — сохранённые регистры (callee‑saved).
// x28–x31 = t3–t6 — дополнительные временные (caller‑saved)

import { Memory } from "./mem";
import { extractBits } from "./utils";

export class CPU {
    private mem: Memory;

    private register: number[] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0
    ];

    private pc = 0;
    private nextPc = 0;

    constructor(mem: Memory) {
        this.mem = mem;
    }

    private setRegister(xd: number, value: number) {
        if (xd !== 0) {
            this.register[xd] = value & 0xffffffff;
        }
    }

    private processRV32I(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);

        const uTypeXd = extractBits(instruction, 7, 11);
        const uTypeImmd = extractBits(instruction, 12, 31);

        switch (opCode) {
            case 0x37: {
                // LUI
                // X[xd] = imm;
                this.setRegister(uTypeXd, uTypeImmd);
            } break;
            case 0x17: {
                // AUIPC
                // X[xd] = $pc + $signed(imm);
                const s32 = uTypeImmd | 0;
                this.setRegister(uTypeXd, (this.pc + s32) >>> 0);
            } break;
        }

        // J-Type instruction decoding
        const jTypeXd = extractBits(instruction, 7, 11);
        // J-Type immediate is encoded in a special order:
        // inst[31]    -> imm[20]
        // inst[30:21] -> imm[10:1]
        // inst[20]    -> imm[11]
        // inst[19:12] -> imm[19:12]
        const jTypeImm20 = extractBits(instruction, 31, 31);
        const jTypeImm10_1 = extractBits(instruction, 21, 30);
        const jTypeImm11 = extractBits(instruction, 20, 20);
        const jTypeImm19_12 = extractBits(instruction, 12, 19);
        const jTypeImmd = (jTypeImm20 << 20) | (jTypeImm19_12 << 12) | (jTypeImm11 << 11) | (jTypeImm10_1 << 1);

        switch (opCode) {
            case 0x6f: {
                // JAL
                // XReg return_addr = $pc + 4;
                // X[xd] = return_addr;
                // jump_halfword($pc + $signed(imm));
                const returnAddr = (this.pc + 4) >>> 0;
                this.setRegister(jTypeXd, returnAddr);
                const signedImm = (jTypeImmd << 11) >> 11;
                this.nextPc = (this.pc + signedImm) >>> 0;
            } break;
        }

        const iTypeXd = extractBits(instruction, 7, 11);
        const iTypeFunc3 = extractBits(instruction, 12, 14);
        const iTypeXs1 = extractBits(instruction, 15, 19);
        const iTypeImmd = extractBits(instruction, 20, 31);

        switch (opCode) {
            case 0x67: {
                // JALR
                // XReg addr = (X[xs1] + $signed(imm)) & ~MXLEN'1;
                // XReg returnaddr;
                // returnaddr = $pc + 4;
                // X[xd] = returnaddr;
                // jump(addr);
                const signedImm = (iTypeImmd << 20) >> 20; // Sign extend 12-bit immediate
                const addr = ((this.register[iTypeXs1] + signedImm) & ~1) >>> 0;
                const returnAddr = (this.pc + 4) >>> 0;
                this.setRegister(iTypeXd, returnAddr);
                this.nextPc = addr;
            } break;
            case 0x03: {
                // Вычисляем виртуальный адрес
                const signedImm = (iTypeImmd << 20) >> 20; // Знаковое расширение 12-битного immediate
                const virtualAddress = (this.register[iTypeXs1] + signedImm) >>> 0;
                
                switch (iTypeFunc3) {
                    case 0x0: {
                        // LB - Load Byte (знаковое расширение)
                        const byte = this.mem.read(virtualAddress);
                        const signExtended = (byte << 24) >> 24;
                        this.setRegister(iTypeXd, signExtended >>> 0);
                    } break;
                    case 0x1: {
                        // LH - Load Halfword (знаковое расширение)
                        const byte0 = this.mem.read(virtualAddress + 0);
                        const byte1 = this.mem.read(virtualAddress + 1);
                        const halfword = (byte1 << 8) | byte0; // Little-endian
                        const signExtended = (halfword << 16) >> 16;
                        this.setRegister(iTypeXd, signExtended >>> 0);
                    } break;
                    case 0x2: {
                        // LW - Load Word
                        const byte0 = this.mem.read(virtualAddress + 0);
                        const byte1 = this.mem.read(virtualAddress + 1);
                        const byte2 = this.mem.read(virtualAddress + 2);
                        const byte3 = this.mem.read(virtualAddress + 3);
                        const word = (byte3 << 24) | (byte2 << 16) | (byte1 << 8) | byte0;
                        this.setRegister(iTypeXd, word >>> 0);
                    } break;
                    case 0x4: {
                        // LBU - Load Byte Unsigned
                        const byte = this.mem.read(virtualAddress);
                        this.setRegister(iTypeXd, byte);
                    } break;
                    case 0x5: {
                        // LHU - Load Halfword Unsigned
                        const byte0 = this.mem.read(virtualAddress + 0);
                        const byte1 = this.mem.read(virtualAddress + 1);
                        const halfword = (byte1 << 8) | byte0; // Little-endian
                        this.setRegister(iTypeXd, halfword);
                    } break;
                }
            } break;
        }

        // bType
        // beq, bne, blt, bge, bltu, bgeu

        return true;
    }

    private processM(): boolean {
        return false;
    }

    public step() {
        const instruction: number = (
            (this.mem.read(this.pc + 0) <<  0) |
            (this.mem.read(this.pc + 1) <<  8) |
            (this.mem.read(this.pc + 2) << 16) |
            (this.mem.read(this.pc + 3) << 24)
        );

        this.nextPc = this.pc + 4;

        const modules: ((i: number) => boolean)[] = [
            this.processRV32I.bind(this),
            this.processM.bind(this)
        ];

        for (const moduleExecutor of modules) {
            if (moduleExecutor(instruction)) {
                break;
            }
        }

        this.pc = this.nextPc;
    }

    public dump() {
        console.log(this.register);
        console.log(this.pc);
    }
}