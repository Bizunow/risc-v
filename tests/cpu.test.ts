import { CPU } from '../src/cpu';
import { Memory } from '../src/mem';

describe('CPU', () => {
    let cpu: CPU;
    let memory: Memory;

    beforeEach(() => {
        memory = new Memory();
        cpu = new CPU(memory);
    });

    test('should create CPU instance', () => {
        expect(cpu).toBeDefined();
        expect(cpu).toBeInstanceOf(CPU);
    });

    test('Register x0 should be immutable', () => {
        // ADDI x0, x0, 42 (0x02a00013)
        memory.write(0, 0x13);
        memory.write(1, 0x00);
        memory.write(2, 0xa0);
        memory.write(3, 0x02);

        cpu.step();

        cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(0)).toBe(0);
    });

    test('Should execute ADDI instruction', () => {
        // ADDI x1, x0, 42 (0x02a00093)
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0xa0);
        memory.write(3, 0x02);

        cpu.step();

        cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(0)).toBe(0);
        expect(cpu.getRegisterValue(1)).toBe(42);
    });

    test('Load byte signed', () => {
        // 0x00500083
        // lb x1, 5(x0)
        memory.write(0, 0x83);
        memory.write(1, 0x00);
        memory.write(2, 0x50);
        memory.write(3, 0x00);
        
        memory.write(5, 0xff);

        cpu.step();

        // cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(1)).toBe(-1);
    });

    test('Load byte unsigned', () => {
        // 0x00504083
        // lbu x1, 5(x0)
        memory.write(0, 0x83);
        memory.write(1, 0x40);
        memory.write(2, 0x50);
        memory.write(3, 0x00);
        
        memory.write(5, 0xff);

        cpu.step();

        // cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(1)).toBe(0xff);
    });

    test('Load halfword signed', () => {
        // 0x00501083
        // lh x1, 5(x0)
        memory.write(0, 0x83);
        memory.write(1, 0x10);
        memory.write(2, 0x50);
        memory.write(3, 0x00);
        
        // Write 0xFFFF (two bytes) at address 5-6
        memory.write(5, 0xff);
        memory.write(6, 0xff);

        cpu.step();

        // cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(1)).toBe(-1);
    });

    test('Load halfword unsigned', () => {
        // 0x00505083
        // lhu x1, 5(x0)
        memory.write(0, 0x83);
        memory.write(1, 0x50);
        memory.write(2, 0x50);
        memory.write(3, 0x00);
        
        // Write 0xFFFF (two bytes) at address 5-6
        memory.write(5, 0xff);
        memory.write(6, 0xff);

        cpu.step();

        // cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(1)).toBe(0xffff);
    });

    test('Load word', () => {
        // 0x00502083
        // lw x1, 5(x0)
        memory.write(0, 0x83);
        memory.write(1, 0x20);
        memory.write(2, 0x50);
        memory.write(3, 0x00);
        
        // Write 0xFFFFFFFF (four bytes) at address 5-8 (little-endian)
        memory.write(5, 0xff);
        memory.write(6, 0xff);
        memory.write(7, 0xff);
        memory.write(8, 0xff);

        cpu.step();

        // cpu.dump = jest.fn(); // Mock dump to avoid console output
        // In JavaScript, 0xffffffff is represented as -1 in signed 32-bit format
        // expect(cpu.getRegisterValue(1)).toBe(-1);
        // Alternative: check unsigned representation
        expect(cpu.getRegisterValue(1)).toBe(-1);
    });

    test('Store and load byte (SB/LB)', () => {
        // Test: Load byte into x1, store via SB, load back via LB into x2
        
        // Step 1: ADDI x1, x0, -5 (load 0xFB into x1)
        // 0xffb00093 = addi x1, x0, -5
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0xb0);
        memory.write(3, 0xff);
        
        cpu.step();
        expect(cpu.getRegisterValue(1)).toBe(-5);
        
        // Step 2: SB x1, 100(x0) - store byte from x1 to memory[100]
        // 0x06102223 = sb x1, 100(x0)
        // offset=100=0x64, xs2=x1, xs1=x0, func3=0x0, opcode=0x23
        memory.write(4, 0x23);
        memory.write(5, 0x22);
        memory.write(6, 0x10);
        memory.write(7, 0x06);
        
        cpu.step();
        
        // Step 3: LB x2, 100(x0) - load byte from memory[100] to x2
        // 0x06400103 = lb x2, 100(x0)
        memory.write(8, 0x03);
        memory.write(9, 0x01);
        memory.write(10, 0x40);
        memory.write(11, 0x06);
        
        cpu.step();
        
        // Verify: x2 should contain the same value as x1 (-5)
        expect(cpu.getRegisterValue(2)).toBe(-5);
        expect(cpu.getRegisterValue(2)).toBe(cpu.getRegisterValue(1));
    });

    test('Store and load halfword (SH/LH)', () => {
        // Test: Load halfword into x1, store via SH, load back via LH into x2
        
        // Step 1: ADDI x1, x0, -1000 (load 0xFC18 into x1)
        // -1000 in 12-bit signed = 0xFC18
        // 0xc1 80 00 93 = addi x1, x0, -1000
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0x80);
        memory.write(3, 0xc1);
        
        cpu.step();
        expect(cpu.getRegisterValue(1)).toBe(-1000);
        
        // Step 2: SH x1, 200(x0) - store halfword from x1 to memory[200-201]
        // offset=200=0xC8: imm[11:5]=0x06, imm[4:0]=0x08
        // S-Type: imm[11:5] | xs2 | xs1 | func3 | imm[4:0] | opcode
        // 0x0c 10 14 23 = sh x1, 200(x0)
        memory.write(4, 0x23);
        memory.write(5, 0x14);
        memory.write(6, 0x10);
        memory.write(7, 0x0c);
        
        cpu.step();
        
        // Step 3: LH x2, 200(x0) - load halfword from memory[200-201] to x2
        // 0x0c801103 = lh x2, 200(x0)
        memory.write(8, 0x03);
        memory.write(9, 0x11);
        memory.write(10, 0x80);
        memory.write(11, 0x0c);
        
        cpu.step();
        
        // Verify: x2 should contain the same value as x1 (-1000)
        expect(cpu.getRegisterValue(2)).toBe(-1000);
        expect(cpu.getRegisterValue(2)).toBe(cpu.getRegisterValue(1));
    });

    test('Store and load word (SW/LW)', () => {
        // Test: Load word into x1, store via SW, load back via LW into x2
        
        // Step 1: ADDI x1, x0, -2048 (load 0xFFFFF800 into x1)
        // -2048 in 12-bit signed = 0x800
        // 0x80000093 = addi x1, x0, -2048
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0x00);
        memory.write(3, 0x80);
        
        cpu.step();
        expect(cpu.getRegisterValue(1)).toBe(-2048);
        
        // Step 2: SW x1, 300(x0) - store word from x1 to memory[300-303]
        // 0x12102623 = sw x1, 300(x0)
        // offset=300=0x12C, xs2=x1, xs1=x0, func3=0x2, opcode=0x23
        memory.write(4, 0x23);
        memory.write(5, 0x26);
        memory.write(6, 0x10);
        memory.write(7, 0x12);
        
        cpu.step();
        
        // Step 3: LW x2, 300(x0) - load word from memory[300-303] to x2
        // 0x12c02103 = lw x2, 300(x0)
        memory.write(8, 0x03);
        memory.write(9, 0x21);
        memory.write(10, 0xc0);
        memory.write(11, 0x12);
        
        cpu.step();
        
        // Verify: x2 should contain the same value as x1 (-2048)
        expect(cpu.getRegisterValue(2)).toBe(-2048);
        expect(cpu.getRegisterValue(2)).toBe(cpu.getRegisterValue(1));
    });
});