import { CPU } from '../src/cpu';
import { Memory } from '../src/mem';

/**
 * Helper function to encode a B-type instruction
 * B-type format: imm[12|10:5] | rs2 | rs1 | funct3 | imm[4:1|11] | opcode
 * @param opcode - 7-bit opcode (0x63 for branches)
 * @param funct3 - 3-bit function code
 * @param rs1 - 5-bit source register 1
 * @param rs2 - 5-bit source register 2
 * @param imm - 13-bit signed immediate (must be even)
 * @returns 32-bit instruction
 */
function encodeBType(opcode: number, funct3: number, rs1: number, rs2: number, imm: number): number {
    // Extract immediate bits
    const imm12 = (imm >> 12) & 0x1;
    const imm11 = (imm >> 11) & 0x1;
    const imm10_5 = (imm >> 5) & 0x3f;
    const imm4_1 = (imm >> 1) & 0xf;
    
    // Construct instruction
    const instruction = (
        (imm12 << 31) |
        (imm10_5 << 25) |
        (rs2 << 20) |
        (rs1 << 15) |
        (funct3 << 12) |
        (imm4_1 << 8) |
        (imm11 << 7) |
        opcode
    );
    
    return instruction >>> 0;
}

/**
 * Helper function to write a 32-bit instruction to memory in little-endian format
 */
function writeInstruction(memory: Memory, address: number, instruction: number): void {
    memory.write(address + 0, (instruction >> 0) & 0xFF);
    memory.write(address + 1, (instruction >> 8) & 0xFF);
    memory.write(address + 2, (instruction >> 16) & 0xFF);
    memory.write(address + 3, (instruction >> 24) & 0xFF);
}

describe('CPU Branching Instructions', () => {
    let cpu: CPU;
    let memory: Memory;

    beforeEach(() => {
        memory = new Memory();
        cpu = new CPU(memory);
    });

    describe('BEQ - Branch if Equal', () => {
        test('should branch when registers are equal', () => {
            // Setup: x1 = 42, x2 = 42
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BEQ x1, x2, 8 (branch forward by 8 bytes if x1 == x2)
            const beqInst = encodeBType(0x63, 0x0, 1, 2, 8);
            writeInstruction(memory, 8, beqInst);
            
            cpu.step(); // Execute ADDI x1, x0, 42
            expect(cpu.getRegisterValue(1)).toBe(42);
            expect(cpu.getProgramCounter()).toBe(4);
            
            cpu.step(); // Execute ADDI x2, x0, 42
            expect(cpu.getRegisterValue(2)).toBe(42);
            expect(cpu.getProgramCounter()).toBe(8);
            
            cpu.step(); // Execute BEQ - should branch
            // PC should be 8 + 8 = 16
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when registers are not equal', () => {
            // Setup: x1 = 42, x2 = 10
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BEQ x1, x2, 8
            const beqInst = encodeBType(0x63, 0x0, 1, 2, 8);
            writeInstruction(memory, 8, beqInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BEQ - should NOT branch
            
            // PC should be 8 + 4 = 12 (no branch taken)
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('BNE - Branch if Not Equal', () => {
        test('should branch when registers are not equal', () => {
            // Setup: x1 = 42, x2 = 10
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BNE x1, x2, 8 (func3=0x1 for BNE)
            const bneInst = encodeBType(0x63, 0x1, 1, 2, 8);
            writeInstruction(memory, 8, bneInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BNE - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when registers are equal', () => {
            // Setup: x1 = 42, x2 = 42
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BNE x1, x2, 8
            const bneInst = encodeBType(0x63, 0x1, 1, 2, 8);
            writeInstruction(memory, 8, bneInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BNE - should NOT branch
            
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('BLT - Branch if Less Than (signed)', () => {
        test('should branch when rs1 < rs2 (positive numbers)', () => {
            // Setup: x1 = 10, x2 = 42
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BLT x1, x2, 8 (func3=0x4 for BLT)
            const bltInst = encodeBType(0x63, 0x4, 1, 2, 8);
            writeInstruction(memory, 8, bltInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BLT - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should branch when rs1 is negative and rs2 is positive', () => {
            // Setup: x1 = -5, x2 = 10
            // ADDI x1, x0, -5
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xb0);
            memory.write(3, 0xff);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BLT x1, x2, 8
            const bltInst = encodeBType(0x63, 0x4, 1, 2, 8);
            writeInstruction(memory, 8, bltInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BLT - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when rs1 >= rs2', () => {
            // Setup: x1 = 42, x2 = 10
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BLT x1, x2, 8
            const bltInst = encodeBType(0x63, 0x4, 1, 2, 8);
            writeInstruction(memory, 8, bltInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BLT - should NOT branch
            
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('BGE - Branch if Greater or Equal (signed)', () => {
        test('should branch when rs1 >= rs2', () => {
            // Setup: x1 = 42, x2 = 10
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BGE x1, x2, 8 (func3=0x5 for BGE)
            const bgeInst = encodeBType(0x63, 0x5, 1, 2, 8);
            writeInstruction(memory, 8, bgeInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGE - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should branch when rs1 == rs2', () => {
            // Setup: x1 = 42, x2 = 42
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BGE x1, x2, 8
            const bgeInst = encodeBType(0x63, 0x5, 1, 2, 8);
            writeInstruction(memory, 8, bgeInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGE - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when rs1 < rs2', () => {
            // Setup: x1 = 10, x2 = 42
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BGE x1, x2, 8
            const bgeInst = encodeBType(0x63, 0x5, 1, 2, 8);
            writeInstruction(memory, 8, bgeInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGE - should NOT branch
            
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('BLTU - Branch if Less Than (unsigned)', () => {
        test('should branch when rs1 < rs2 (unsigned)', () => {
            // Setup: x1 = 10, x2 = 42
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BLTU x1, x2, 8 (func3=0x6 for BLTU)
            const bltuInst = encodeBType(0x63, 0x6, 1, 2, 8);
            writeInstruction(memory, 8, bltuInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BLTU - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when negative number is treated as large unsigned', () => {
            // Setup: x1 = -5 (0xFFFFFFFB unsigned), x2 = 10
            // In unsigned comparison, -5 is very large
            // ADDI x1, x0, -5
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xb0);
            memory.write(3, 0xff);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BLTU x1, x2, 8
            const bltuInst = encodeBType(0x63, 0x6, 1, 2, 8);
            writeInstruction(memory, 8, bltuInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BLTU - should NOT branch (0xFFFFFFFB > 10 unsigned)
            
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('BGEU - Branch if Greater or Equal (unsigned)', () => {
        test('should branch when rs1 >= rs2 (unsigned)', () => {
            // Setup: x1 = 42, x2 = 10
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BGEU x1, x2, 8 (func3=0x7 for BGEU)
            const bgeuInst = encodeBType(0x63, 0x7, 1, 2, 8);
            writeInstruction(memory, 8, bgeuInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGEU - should branch
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should branch when negative number is treated as large unsigned', () => {
            // Setup: x1 = -5 (0xFFFFFFFB unsigned), x2 = 10
            // ADDI x1, x0, -5
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xb0);
            memory.write(3, 0xff);
            
            // ADDI x2, x0, 10
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x00);
            
            // BGEU x1, x2, 8
            const bgeuInst = encodeBType(0x63, 0x7, 1, 2, 8);
            writeInstruction(memory, 8, bgeuInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGEU - should branch (0xFFFFFFFB >= 10 unsigned)
            
            expect(cpu.getProgramCounter()).toBe(16);
        });

        test('should not branch when rs1 < rs2 (unsigned)', () => {
            // Setup: x1 = 10, x2 = 42
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            
            // ADDI x2, x0, 42
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BGEU x1, x2, 8
            const bgeuInst = encodeBType(0x63, 0x7, 1, 2, 8);
            writeInstruction(memory, 8, bgeuInst);
            
            cpu.step(); // ADDI x1
            cpu.step(); // ADDI x2
            cpu.step(); // BGEU - should NOT branch
            
            expect(cpu.getProgramCounter()).toBe(12);
        });
    });

    describe('Backward branches', () => {
        test('should handle backward branch correctly', () => {
            // Setup: x1 = 42, x2 = 42
            // ADDI x1, x0, 42 at address 0
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            
            // ADDI x2, x0, 42 at address 4
            memory.write(4, 0x13);
            memory.write(5, 0x01);
            memory.write(6, 0xa0);
            memory.write(7, 0x02);
            
            // BEQ x1, x2, -8 (branch backward by 8 bytes if x1 == x2)
            const beqInst = encodeBType(0x63, 0x0, 1, 2, -8);
            writeInstruction(memory, 8, beqInst);
            
            cpu.step(); // Execute ADDI x1
            cpu.step(); // Execute ADDI x2
            cpu.step(); // Execute BEQ - should branch backward
            
            // PC should be 8 + (-8) = 0
            expect(cpu.getProgramCounter()).toBe(0);
        });
    });
});