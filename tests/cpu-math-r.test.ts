import { CPU } from '../src/cpu';
import { Memory } from '../src/mem';

describe('CPU R-Type Instructions', () => {
    let cpu: CPU;
    let memory: Memory;

    beforeEach(() => {
        memory = new Memory();
        cpu = new CPU(memory);
    });

    // Helper function to set register value using ADDI
    const setRegister = (reg: number, value: number) => {
        // ADDI xreg, x0, value
        const imm = value & 0xFFF;
        const instruction = 0x13 | (reg << 7) | (imm << 20);
        
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, (instruction >> 0) & 0xFF);
        memory.write(pc + 1, (instruction >> 8) & 0xFF);
        memory.write(pc + 2, (instruction >> 16) & 0xFF);
        memory.write(pc + 3, (instruction >> 24) & 0xFF);
        
        cpu.step();
    };

    test('ADD - Add two positive numbers', () => {
        // Set x1 = 100
        setRegister(1, 100);
        
        // Set x2 = 50
        setRegister(2, 50);
        
        // ADD x3, x1, x2 (0x002081b3)
        // opcode=0x33, xd=3, func3=0x0, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0x81);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(150);
    });

    test('ADD - Add with overflow wraps around', () => {
        // Test that addition wraps around correctly
        // Set x1 = 0xFFFFFFFF (using ADDI with -1)
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0xf0);
        memory.write(3, 0xff);
        cpu.step();
        
        // Set x2 = 1
        memory.write(4, 0x13);
        memory.write(5, 0x01);
        memory.write(6, 0x10);
        memory.write(7, 0x00);
        cpu.step();
        
        // ADD x3, x1, x2 (0xFFFFFFFF + 1 should wrap to 0)
        memory.write(8, 0xb3);
        memory.write(9, 0x81);
        memory.write(10, 0x20);
        memory.write(11, 0x00);
        cpu.step();
        
        // Should wrap around to 0
        expect(cpu.getRegisterValue(3)).toBe(0);
    });

    test('SUB - Subtract two numbers', () => {
        // Set x1 = 100
        setRegister(1, 100);
        
        // Set x2 = 30
        setRegister(2, 30);
        
        // SUB x3, x1, x2 (0x402081b3)
        // opcode=0x33, xd=3, func3=0x0, xs1=1, xs2=2, func7=0x20
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0x81);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x40);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(70);
    });

    test('SUB - Subtract resulting in negative', () => {
        // Set x1 = 30
        setRegister(1, 30);
        
        // Set x2 = 100
        setRegister(2, 100);
        
        // SUB x3, x1, x2
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0x81);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x40);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(-70);
    });

    test('SLL - Shift left logical', () => {
        // Set x1 = 5
        setRegister(1, 5);
        
        // Set x2 = 2 (shift amount)
        setRegister(2, 2);
        
        // SLL x3, x1, x2 (0x002091b3)
        // opcode=0x33, xd=3, func3=0x1, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0x91);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(20); // 5 << 2 = 20
    });

    test('SLL - Shift with large shift amount (only lower 5 bits used)', () => {
        // Set x1 = 1
        setRegister(1, 1);
        
        // Set x2 = 33 (0x21, only lower 5 bits = 1 should be used)
        setRegister(2, 33);
        
        // SLL x3, x1, x2
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0x91);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(2); // 1 << 1 = 2
    });

    test('SLT - Set less than (signed) - true case', () => {
        // Set x1 = -5
        setRegister(1, -5 & 0xFFF);
        
        // Set x2 = 10
        setRegister(2, 10);
        
        // SLT x3, x1, x2 (0x002121b3)
        // opcode=0x33, xd=3, func3=0x2, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xa1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(1); // -5 < 10 is true
    });

    test('SLT - Set less than (signed) - false case', () => {
        // Set x1 = 10
        setRegister(1, 10);
        
        // Set x2 = -5
        setRegister(2, -5 & 0xFFF);
        
        // SLT x3, x1, x2
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xa1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(0); // 10 < -5 is false
    });

    test('SLTU - Set less than unsigned - true case', () => {
        // Set x1 = 5
        setRegister(1, 5);
        
        // Set x2 = 10
        setRegister(2, 10);
        
        // SLTU x3, x1, x2 (0x002131b3)
        // opcode=0x33, xd=3, func3=0x3, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xb1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(1); // 5 < 10 is true
    });

    test('SLTU - Set less than unsigned - treats negative as large positive', () => {
        // Set x1 = 10
        setRegister(1, 10);
        
        // Set x2 = -1 (0xFFFFFFFF unsigned)
        setRegister(2, -1 & 0xFFF);
        
        // SLTU x3, x1, x2
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xb1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(1); // 10 < 0xFFFFFFFF is true (unsigned)
    });

    test('XOR - Exclusive OR', () => {
        // Set x1 = 0b1010 (10)
        setRegister(1, 0b1010);
        
        // Set x2 = 0b1100 (12)
        setRegister(2, 0b1100);
        
        // XOR x3, x1, x2 (0x002141b3)
        // opcode=0x33, xd=3, func3=0x4, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xc1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(0b0110); // 10 XOR 12 = 6
    });

    test('XOR - XOR with itself gives zero', () => {
        // Set x1 = 42
        setRegister(1, 42);
        
        // XOR x2, x1, x1 (0x001141b3)
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0x33);
        memory.write(pc + 1, 0xc1);
        memory.write(pc + 2, 0x10);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(2)).toBe(0); // 42 XOR 42 = 0
    });

    test('SRL - Shift right logical', () => {
        // Set x1 = 0x80000000 (sign bit set)
        // LUI x1, 0x80000
        memory.write(0, 0xb7);
        memory.write(1, 0x00);
        memory.write(2, 0x00);
        memory.write(3, 0x80);
        cpu.step();
        
        // Set x2 = 4 (shift amount)
        setRegister(2, 4);
        
        // SRL x3, x1, x2 (0x002151b3)
        // opcode=0x33, xd=3, func3=0x5, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xd1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(0x08000000); // Logical shift, no sign extension
    });

    test('SRA - Shift right arithmetic', () => {
        // Set x1 = 0x80000000 (sign bit set, -2147483648)
        // LUI x1, 0x80000
        memory.write(0, 0xb7);
        memory.write(1, 0x00);
        memory.write(2, 0x00);
        memory.write(3, 0x80);
        cpu.step();
        
        // Set x2 = 4 (shift amount)
        setRegister(2, 4);
        
        // SRA x3, x1, x2 (0x402151b3)
        // opcode=0x33, xd=3, func3=0x5, xs1=1, xs2=2, func7=0x20
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xd1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x40);
        
        cpu.step();
        
        // Arithmetic shift, sign extended: 0x80000000 >> 4 = 0xF8000000
        // JavaScript may return this as a signed value, so convert to unsigned for comparison
        expect(cpu.getRegisterValue(3) >>> 0).toBe(0xF8000000);
    });

    test('OR - Bitwise OR', () => {
        // Set x1 = 0b1010 (10)
        setRegister(1, 0b1010);
        
        // Set x2 = 0b1100 (12)
        setRegister(2, 0b1100);
        
        // OR x3, x1, x2 (0x002161b3)
        // opcode=0x33, xd=3, func3=0x6, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xe1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(0b1110); // 10 OR 12 = 14
    });

    test('OR - OR with zero gives original value', () => {
        // Set x1 = 42
        setRegister(1, 42);
        
        // OR x2, x1, x0 (x0 is always 0)
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0x33);
        memory.write(pc + 1, 0xe1);
        memory.write(pc + 2, 0x00);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(2)).toBe(42);
    });

    test('AND - Bitwise AND', () => {
        // Set x1 = 0b1010 (10)
        setRegister(1, 0b1010);
        
        // Set x2 = 0b1100 (12)
        setRegister(2, 0b1100);
        
        // AND x3, x1, x2 (0x002171b3)
        // opcode=0x33, xd=3, func3=0x7, xs1=1, xs2=2, func7=0x00
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0xb3);
        memory.write(pc + 1, 0xf1);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(3)).toBe(0b1000); // 10 AND 12 = 8
    });

    test('AND - AND with zero gives zero', () => {
        // Set x1 = 42
        setRegister(1, 42);
        
        // AND x2, x1, x0 (x0 is always 0)
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0x33);
        memory.write(pc + 1, 0xf1);
        memory.write(pc + 2, 0x00);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(2)).toBe(0);
    });

    test('R-Type instructions should not modify x0', () => {
        // Set x1 = 100
        setRegister(1, 100);
        
        // Set x2 = 50
        setRegister(2, 50);
        
        // ADD x0, x1, x2 (try to write to x0)
        const pc = cpu.getProgramCounter();
        memory.write(pc + 0, 0x33);
        memory.write(pc + 1, 0x80);
        memory.write(pc + 2, 0x20);
        memory.write(pc + 3, 0x00);
        
        cpu.step();
        
        expect(cpu.getRegisterValue(0)).toBe(0); // x0 should remain 0
    });
});