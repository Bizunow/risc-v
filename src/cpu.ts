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

    constructor(mem: Memory) {
        this.mem = mem;
    }

    private setRegister(xd: number, value: number) {
        if (xd !== 0) {
            this.register[xd] = value & 0xffffffff;
        }
    }

    private processRV32I(instruction: number): boolean {
        const uTypeOpCode = extractBits(instruction, 0, 6);
        const uTypeXd = extractBits(instruction, 7, 11);
        const uTypeImmd = extractBits(instruction, 12, 31);

        console.log(instruction, uTypeOpCode, uTypeXd, uTypeImmd);

        switch (uTypeOpCode) {
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
            default: {
                return false;
            }
        }

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

        const modules: ((i: number) => boolean)[] = [
            this.processRV32I.bind(this),
            this.processM.bind(this)
        ];

        for (const moduleExecutor of modules) {
            if (moduleExecutor(instruction)) {
                break;
            }
        }

        // Change PC
    }

    public dump() {
        console.log(this.register);
    }
}