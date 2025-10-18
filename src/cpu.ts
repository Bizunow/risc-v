import { Memory } from "./mem";
import { extractBits } from "./utils";

// + lui
// + auipc
// + jal
// + jalr
// + beq
// + bne
// + blt
// + bge
// + bltu
// + bgeu
// + lb
// + lh
// + lw
// + lbu
// + lhu
// + sb
// + sh
// + sw
// + addi
// + slti
// + sltiu
// + xori
// + ori
// + andi
// + slli
// + srli
// + srai
// + add
// + sub
// + sll
// + slt
// + sltu
// + xor
// + srl
// + sra
// + or
// + and
// fence
// ecall
// ebreak

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

    private processUTypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
        const uTypeXd = extractBits(instruction, 7, 11);
        const uTypeImmd = extractBits(instruction, 12, 31);

        switch (opCode) {
            case 0x37: {
                // LUI - Load Upper Immediate
                // X[xd] = imm << 12;
                this.setRegister(uTypeXd, (uTypeImmd << 12) >>> 0);
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

    private processJTypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
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
            default: {
                return false;
            }
        }

        return true;
    }

    private processBTypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
        
        // B-Type instruction decoding
        const bTypeFunc3 = extractBits(instruction, 12, 14);
        const bTypeXs1 = extractBits(instruction, 15, 19);
        const bTypeXs2 = extractBits(instruction, 20, 24);
        
        // B-Type immediate is encoded in a special order:
        // inst[31]    -> imm[12]
        // inst[30:25] -> imm[10:5]
        // inst[11:8]  -> imm[4:1]
        // inst[7]     -> imm[11]
        const bTypeImm12 = extractBits(instruction, 31, 31);
        const bTypeImm10_5 = extractBits(instruction, 25, 30);
        const bTypeImm4_1 = extractBits(instruction, 8, 11);
        const bTypeImm11 = extractBits(instruction, 7, 7);
        const bTypeImmd = (bTypeImm12 << 12) | (bTypeImm11 << 11) | (bTypeImm10_5 << 5) | (bTypeImm4_1 << 1);
        
        switch (opCode) {
            case 0x63: {  // BRANCH opcode
                const rs1Value = this.register[bTypeXs1];
                const rs2Value = this.register[bTypeXs2];
                const signedImm = (bTypeImmd << 19) >> 19;  // Sign extend 13-bit immediate
                let takeBranch = false;
                
                switch (bTypeFunc3) {
                    case 0x0: {
                        // BEQ - Branch if Equal
                        // if (X[xs1] == X[xs2]) jump_halfword($pc + $signed(imm))
                        takeBranch = (rs1Value === rs2Value);
                    } break;
                    case 0x1: {
                        // BNE - Branch if Not Equal
                        // if (X[xs1] != X[xs2]) jump_halfword($pc + $signed(imm))
                        takeBranch = (rs1Value !== rs2Value);
                    } break;
                    case 0x4: {
                        // BLT - Branch if Less Than (signed)
                        // if ($signed(X[xs1]) < $signed(X[xs2])) jump_halfword($pc + $signed(imm))
                        const signedRs1 = rs1Value | 0;
                        const signedRs2 = rs2Value | 0;
                        takeBranch = (signedRs1 < signedRs2);
                    } break;
                    case 0x5: {
                        // BGE - Branch if Greater or Equal (signed)
                        // if ($signed(X[xs1]) >= $signed(X[xs2])) jump_halfword($pc + $signed(imm))
                        const signedRs1 = rs1Value | 0;
                        const signedRs2 = rs2Value | 0;
                        takeBranch = (signedRs1 >= signedRs2);
                    } break;
                    case 0x6: {
                        // BLTU - Branch if Less Than (unsigned)
                        // if (X[xs1] < X[xs2]) jump_halfword($pc + $signed(imm))
                        takeBranch = (rs1Value >>> 0) < (rs2Value >>> 0);
                    } break;
                    case 0x7: {
                        // BGEU - Branch if Greater or Equal (unsigned)
                        // if (X[xs1] >= X[xs2]) jump_halfword($pc + $signed(imm))
                        takeBranch = (rs1Value >>> 0) >= (rs2Value >>> 0);
                    } break;
                    default: {
                        return false;
                    }
                }
                
                if (takeBranch) {
                    this.nextPc = (this.pc + signedImm) >>> 0;
                }
            } break;
            default: {
                return false;
            }
        }
        
        return true;
    }

    private processITypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
        
        const iTypeXd = extractBits(instruction, 7, 11);
        const iTypeFunc3 = extractBits(instruction, 12, 14);
        const iTypeXs1 = extractBits(instruction, 15, 19);
        const iTypeImmd = extractBits(instruction, 20, 31);

        switch (opCode) {
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
                    default: {
                        return false;
                    }
                }
            } break;
            case 0x13: {
                // I-Type arithmetic/logic operations
                const signedImm = (iTypeImmd << 20) >> 20; // Sign extend 12-bit immediate
                
                switch (iTypeFunc3) {
                    case 0x0: {
                        // ADDI - Add Immediate
                        // X[xd] = X[xs1] + signed(imm)
                        const result = (this.register[iTypeXs1] + signedImm) >>> 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x2: {
                        // SLTI - Set Less Than Immediate (signed)
                        // X[xd] = ($signed(X[xs1]) < $signed(imm)) ? 1 : 0
                        const rs1Signed = this.register[iTypeXs1] | 0;
                        const result = (rs1Signed < signedImm) ? 1 : 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x3: {
                        // SLTIU - Set Less Than Immediate Unsigned
                        // X[xd] = (X[xs1] < imm) ? 1 : 0
                        // Note: immediate is sign-extended then treated as unsigned
                        const rs1Unsigned = this.register[iTypeXs1] >>> 0;
                        const immUnsigned = signedImm >>> 0;
                        const result = (rs1Unsigned < immUnsigned) ? 1 : 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x4: {
                        // XORI - XOR Immediate
                        // X[xd] = X[xs1] ^ $signed(imm)
                        const result = (this.register[iTypeXs1] ^ signedImm) >>> 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x6: {
                        // ORI - OR Immediate
                        // X[xd] = X[xs1] | $signed(imm)
                        const result = (this.register[iTypeXs1] | signedImm) >>> 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x7: {
                        // ANDI - AND Immediate
                        // X[xd] = X[xs1] & $signed(imm)
                        const result = (this.register[iTypeXs1] & signedImm) >>> 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x1: {
                        // SLLI - Shift Left Logical Immediate
                        // X[xd] = X[xs1] << shamt
                        // shamt is bits [24:20] of the immediate (lower 5 bits)
                        const shamt = extractBits(iTypeImmd, 0, 4);
                        const result = (this.register[iTypeXs1] << shamt) >>> 0;
                        this.setRegister(iTypeXd, result);
                    } break;
                    case 0x5: {
                        // SRLI or SRAI - Shift Right Logical/Arithmetic Immediate
                        // Differentiated by bit 30 (bit 10 of iTypeImmd)
                        const shamt = extractBits(iTypeImmd, 0, 4);
                        const bit30 = extractBits(iTypeImmd, 10, 10);
                        
                        if (bit30 === 0) {
                            // SRLI - Shift Right Logical Immediate
                            // X[xd] = X[xs1] >> shamt (logical)
                            const result = (this.register[iTypeXs1] >>> shamt) >>> 0;
                            this.setRegister(iTypeXd, result);
                        } else {
                            // SRAI - Shift Right Arithmetic Immediate
                            // X[xd] = $signed(X[xs1]) >> shamt (arithmetic)
                            const rs1Signed = this.register[iTypeXs1] | 0;
                            const result = (rs1Signed >> shamt) >>> 0;
                            this.setRegister(iTypeXd, result);
                        }
                    } break;
                    default: {
                        return false;
                    }
                }
            } break;
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
            default: {
                return false;
            }
        }

        return true;
    }

    private processSTypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
        
        // S-Type instruction decoding
        const sTypeFunc3 = extractBits(instruction, 12, 14);
        const sTypeXs1 = extractBits(instruction, 15, 19);  // Base address register
        const sTypeXs2 = extractBits(instruction, 20, 24);  // Source data register
        const sTypeImm4_0 = extractBits(instruction, 7, 11);
        const sTypeImm11_5 = extractBits(instruction, 25, 31);
        
        // Reconstruct the 12-bit immediate
        const sTypeImmd = (sTypeImm11_5 << 5) | sTypeImm4_0;
        
        switch (opCode) {
            case 0x23: {  // STORE opcode
                // Calculate virtual address with sign extension
                const signedImm = (sTypeImmd << 20) >> 20;  // Sign extend 12-bit immediate
                const virtualAddress = (this.register[sTypeXs1] + signedImm) >>> 0;
                const sourceValue = this.register[sTypeXs2];
                
                switch (sTypeFunc3) {
                    case 0x0: {
                        // SB - Store Byte
                        // M[addr] = X[xs2][7:0]
                        this.mem.write(virtualAddress, sourceValue & 0xFF);
                    } break;
                    case 0x1: {
                        // SH - Store Halfword (16-bit, little-endian)
                        // M[addr] = X[xs2][15:0]
                        this.mem.write(virtualAddress + 0, (sourceValue >> 0) & 0xFF);
                        this.mem.write(virtualAddress + 1, (sourceValue >> 8) & 0xFF);
                    } break;
                    case 0x2: {
                        // SW - Store Word (32-bit, little-endian)
                        // M[addr] = X[xs2][31:0]
                        this.mem.write(virtualAddress + 0, (sourceValue >>  0) & 0xFF);
                        this.mem.write(virtualAddress + 1, (sourceValue >>  8) & 0xFF);
                        this.mem.write(virtualAddress + 2, (sourceValue >> 16) & 0xFF);
                        this.mem.write(virtualAddress + 3, (sourceValue >> 24) & 0xFF);
                    } break;
                    default: {
                        return false;
                    }
                }
            } break;
            default: {
                return false;
            }
        }
        
        return true;
    }

    private processRTypeInstructions(instruction: number): boolean {
        const opCode = extractBits(instruction, 0, 6);
        
        // R-Type instruction decoding
        const rTypeXd = extractBits(instruction, 7, 11);
        const rTypeFunc3 = extractBits(instruction, 12, 14);
        const rTypeXs1 = extractBits(instruction, 15, 19);
        const rTypeXs2 = extractBits(instruction, 20, 24);
        const rTypeFunc7 = extractBits(instruction, 25, 31);
        
        switch (opCode) {
            case 0x33: {  // R-Type arithmetic/logic operations
                const rs1Value = this.register[rTypeXs1];
                const rs2Value = this.register[rTypeXs2];
                
                switch (rTypeFunc3) {
                    case 0x0: {
                        if (rTypeFunc7 === 0x00) {
                            // ADD - Add
                            // X[xd] = X[xs1] + X[xs2]
                            const result = (rs1Value + rs2Value) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else if (rTypeFunc7 === 0x20) {
                            // SUB - Subtract
                            // X[xd] = X[xs1] - X[xs2]
                            const result = (rs1Value - rs2Value) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x1: {
                        // SLL - Shift Left Logical
                        // X[xd] = X[xs1] << (X[xs2] & 0x1F)
                        if (rTypeFunc7 === 0x00) {
                            const shamt = rs2Value & 0x1F;
                            const result = (rs1Value << shamt) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x2: {
                        // SLT - Set Less Than (signed)
                        // X[xd] = ($signed(X[xs1]) < $signed(X[xs2])) ? 1 : 0
                        if (rTypeFunc7 === 0x00) {
                            const rs1Signed = rs1Value | 0;
                            const rs2Signed = rs2Value | 0;
                            const result = (rs1Signed < rs2Signed) ? 1 : 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x3: {
                        // SLTU - Set Less Than Unsigned
                        // X[xd] = (X[xs1] < X[xs2]) ? 1 : 0
                        if (rTypeFunc7 === 0x00) {
                            const rs1Unsigned = rs1Value >>> 0;
                            const rs2Unsigned = rs2Value >>> 0;
                            const result = (rs1Unsigned < rs2Unsigned) ? 1 : 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x4: {
                        // XOR - Exclusive OR
                        // X[xd] = X[xs1] ^ X[xs2]
                        if (rTypeFunc7 === 0x00) {
                            const result = (rs1Value ^ rs2Value) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x5: {
                        if (rTypeFunc7 === 0x00) {
                            // SRL - Shift Right Logical
                            // X[xd] = X[xs1] >> (X[xs2] & 0x1F) (logical)
                            const shamt = rs2Value & 0x1F;
                            const result = (rs1Value >>> shamt) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else if (rTypeFunc7 === 0x20) {
                            // SRA - Shift Right Arithmetic
                            // X[xd] = $signed(X[xs1]) >> (X[xs2] & 0x1F) (arithmetic)
                            const shamt = rs2Value & 0x1F;
                            const rs1Signed = rs1Value | 0;
                            const result = (rs1Signed >> shamt) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x6: {
                        // OR - Bitwise OR
                        // X[xd] = X[xs1] | X[xs2]
                        if (rTypeFunc7 === 0x00) {
                            const result = (rs1Value | rs2Value) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    case 0x7: {
                        // AND - Bitwise AND
                        // X[xd] = X[xs1] & X[xs2]
                        if (rTypeFunc7 === 0x00) {
                            const result = (rs1Value & rs2Value) >>> 0;
                            this.setRegister(rTypeXd, result);
                        } else {
                            return false;
                        }
                    } break;
                    default: {
                        return false;
                    }
                }
            } break;
            default: {
                return false;
            }
        }
        
        return true;
    }

    private processRV32I(instruction: number): boolean {
        return (
            this.processUTypeInstructions(instruction) ||
            this.processJTypeInstructions(instruction) ||
            this.processBTypeInstructions(instruction) ||
            this.processITypeInstructions(instruction) ||
            this.processSTypeInstructions(instruction) ||
            this.processRTypeInstructions(instruction)
        );
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

    public getRegisterValue(x: number): number {
        return this.register[x];
    }

    public getProgramCounter(): number {
        return this.pc;
    }
}