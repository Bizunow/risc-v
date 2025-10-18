import { CPU } from '../src/cpu';
import { Memory } from '../src/mem';

describe('CPU I-Type Arithmetic and Logic Instructions', () => {
    let cpu: CPU;
    let memory: Memory;

    beforeEach(() => {
        memory = new Memory();
        cpu = new CPU(memory);
    });

    describe('SLTI - Set Less Than Immediate (signed)', () => {
        test('SLTI: positive < positive (true)', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SLTI x2, x1, 20 (10 < 20 = true, x2 = 1)
            // 0x01412113 = slti x2, x1, 20
            memory.write(4, 0x13);
            memory.write(5, 0x21);
            memory.write(6, 0x41);
            memory.write(7, 0x01);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(1);
        });

        test('SLTI: positive < positive (false)', () => {
            // ADDI x1, x0, 30
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xe0);
            memory.write(3, 0x01);
            cpu.step();

            // SLTI x2, x1, 20 (30 < 20 = false, x2 = 0)
            // 0x0140a113 = slti x2, x1, 20
            memory.write(4, 0x13);
            memory.write(5, 0xa1);
            memory.write(6, 0x40);
            memory.write(7, 0x01);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0);
        });

        test('SLTI: negative < positive (true)', () => {
            // ADDI x1, x0, -10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x60);
            memory.write(3, 0xff);
            cpu.step();

            // SLTI x2, x1, 5 (-10 < 5 = true, x2 = 1)
            // 0x0050a113 = slti x2, x1, 5
            memory.write(4, 0x13);
            memory.write(5, 0xa1);
            memory.write(6, 0x50);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(1);
        });

        test('SLTI: positive < negative (false)', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SLTI x2, x1, -5 (10 < -5 = false, x2 = 0)
            // 0xffb0a113 = slti x2, x1, -5
            memory.write(4, 0x13);
            memory.write(5, 0xa1);
            memory.write(6, 0xb0);
            memory.write(7, 0xff);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0);
        });
    });

    describe('SLTIU - Set Less Than Immediate Unsigned', () => {
        test('SLTIU: small < large (true)', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SLTIU x2, x1, 20 (10 < 20 = true, x2 = 1)
            // 0x0140b113 = sltiu x2, x1, 20
            memory.write(4, 0x13);
            memory.write(5, 0xb1);
            memory.write(6, 0x40);
            memory.write(7, 0x01);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(1);
        });

        test('SLTIU: large < small (false)', () => {
            // ADDI x1, x0, 30
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xe0);
            memory.write(3, 0x01);
            cpu.step();

            // SLTIU x2, x1, 20 (30 < 20 = false, x2 = 0)
            // 0x0140b113 = sltiu x2, x1, 20
            memory.write(4, 0x13);
            memory.write(5, 0xb1);
            memory.write(6, 0x40);
            memory.write(7, 0x01);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0);
        });

        test('SLTIU: comparing with sign-extended negative immediate', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SLTIU x2, x1, -1 (10 < 0xFFFFFFFF unsigned = true, x2 = 1)
            // 0xfff0b113 = sltiu x2, x1, -1
            memory.write(4, 0x13);
            memory.write(5, 0xb1);
            memory.write(6, 0xf0);
            memory.write(7, 0xff);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(1);
        });
    });

    describe('XORI - XOR Immediate', () => {
        test('XORI: basic XOR operation', () => {
            // ADDI x1, x0, 0x0AA
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x0a);
            cpu.step();

            // XORI x2, x1, 0x055 (0x0AA ^ 0x055 = 0x0FF)
            // 0x0550c113 = xori x2, x1, 0x055
            memory.write(4, 0x13);
            memory.write(5, 0xc1);
            memory.write(6, 0x50);
            memory.write(7, 0x05);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x0ff);
        });

        test('XORI: XOR with -1 (bitwise NOT)', () => {
            // ADDI x1, x0, 0xAA
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x0a);
            cpu.step();

            // XORI x2, x1, -1 (0xAA ^ 0xFFFFFFFF = bitwise NOT)
            // 0xfff0c113 = xori x2, x1, -1
            memory.write(4, 0x13);
            memory.write(5, 0xc1);
            memory.write(6, 0xf0);
            memory.write(7, 0xff);
            cpu.step();

            // Result is -171 in signed representation (0xFFFFFF55 unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-171);
        });

        test('XORI: XOR with 0 (identity)', () => {
            // ADDI x1, x0, 123
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xb0);
            memory.write(3, 0x07);
            cpu.step();

            // XORI x2, x1, 0 (123 ^ 0 = 123)
            // 0x0000c113 = xori x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0xc1);
            memory.write(6, 0x00);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(123);
        });
    });

    describe('ORI - OR Immediate', () => {
        test('ORI: basic OR operation', () => {
            // ADDI x1, x0, 0x0F0
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0x0f);
            cpu.step();

            // ORI x2, x1, 0x00F (0x0F0 | 0x00F = 0x0FF)
            // 0x00f0e113 = ori x2, x1, 0x00f
            memory.write(4, 0x13);
            memory.write(5, 0xe1);
            memory.write(6, 0xf0);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x0ff);
        });

        test('ORI: OR with 0 (identity)', () => {
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            cpu.step();

            // ORI x2, x1, 0 (42 | 0 = 42)
            // 0x0000e113 = ori x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0xe1);
            memory.write(6, 0x00);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(42);
        });

        test('ORI: OR with -1 (all bits set)', () => {
            // ADDI x1, x0, 0x123
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x30);
            memory.write(3, 0x12);
            cpu.step();

            // ORI x2, x1, -1 (0x123 | 0xFFFFFFFF = 0xFFFFFFFF)
            // 0xfff0e113 = ori x2, x1, -1
            memory.write(4, 0x13);
            memory.write(5, 0xe1);
            memory.write(6, 0xf0);
            memory.write(7, 0xff);
            cpu.step();

            // Result is -1 in signed representation (0xFFFFFFFF unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-1);
        });
    });

    describe('ANDI - AND Immediate', () => {
        test('ANDI: basic AND operation', () => {
            // ADDI x1, x0, 0x0FF
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0x0f);
            cpu.step();

            // ANDI x2, x1, 0x0F0 (0x0FF & 0x0F0 = 0x0F0)
            // 0x0f00f113 = andi x2, x1, 0x0f0
            memory.write(4, 0x13);
            memory.write(5, 0xf1);
            memory.write(6, 0x00);
            memory.write(7, 0x0f);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x0f0);
        });

        test('ANDI: AND with 0 (clear all)', () => {
            // ADDI x1, x0, 0x123
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x30);
            memory.write(3, 0x12);
            cpu.step();

            // ANDI x2, x1, 0 (0x123 & 0 = 0)
            // 0x0000f113 = andi x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0xf1);
            memory.write(6, 0x00);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0);
        });

        test('ANDI: AND with -1 (identity)', () => {
            // ADDI x1, x0, 0x456
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x60);
            memory.write(3, 0x45);
            cpu.step();

            // ANDI x2, x1, -1 (0x456 & 0xFFFFFFFF = 0x456)
            // 0xfff0f113 = andi x2, x1, -1
            memory.write(4, 0x13);
            memory.write(5, 0xf1);
            memory.write(6, 0xf0);
            memory.write(7, 0xff);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x456);
        });
    });

    describe('SLLI - Shift Left Logical Immediate', () => {
        test('SLLI: shift by 0 (identity)', () => {
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            cpu.step();

            // SLLI x2, x1, 0 (42 << 0 = 42)
            // 0x00009113 = slli x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0x91);
            memory.write(6, 0x00);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(42);
        });

        test('SLLI: shift by 1', () => {
            // ADDI x1, x0, 5
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x50);
            memory.write(3, 0x00);
            cpu.step();

            // SLLI x2, x1, 1 (5 << 1 = 10)
            // 0x00109113 = slli x2, x1, 1
            memory.write(4, 0x13);
            memory.write(5, 0x91);
            memory.write(6, 0x10);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(10);
        });

        test('SLLI: shift by 4', () => {
            // ADDI x1, x0, 0x0F
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0x00);
            cpu.step();

            // SLLI x2, x1, 4 (0x0F << 4 = 0xF0)
            // 0x00409113 = slli x2, x1, 4
            memory.write(4, 0x13);
            memory.write(5, 0x91);
            memory.write(6, 0x40);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0xf0);
        });

        test('SLLI: shift with overflow', () => {
            // ADDI x1, x0, -1 (0xFFFFFFFF)
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0xff);
            cpu.step();

            // SLLI x2, x1, 8 (0xFFFFFFFF << 8 = 0xFFFFFF00)
            // 0x00809113 = slli x2, x1, 8
            memory.write(4, 0x13);
            memory.write(5, 0x91);
            memory.write(6, 0x80);
            memory.write(7, 0x00);
            cpu.step();

            // Result is -256 in signed representation (0xFFFFFF00 unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-256);
        });
    });

    describe('SRLI - Shift Right Logical Immediate', () => {
        test('SRLI: shift by 0 (identity)', () => {
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            cpu.step();

            // SRLI x2, x1, 0 (42 >> 0 = 42)
            // 0x0000d113 = srli x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x00);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(42);
        });

        test('SRLI: shift by 1', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SRLI x2, x1, 1 (10 >> 1 = 5)
            // 0x0010d113 = srli x2, x1, 1
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x10);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(5);
        });

        test('SRLI: shift by 4', () => {
            // ADDI x1, x0, 0xF0
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0x0f);
            cpu.step();

            // SRLI x2, x1, 4 (0xF0 >> 4 = 0x0F)
            // 0x0040d113 = srli x2, x1, 4
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x40);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x0f);
        });

        test('SRLI: logical shift of negative number', () => {
            // ADDI x1, x0, -1 (0xFFFFFFFF)
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0xff);
            cpu.step();

            // SRLI x2, x1, 8 (0xFFFFFFFF >>> 8 = 0x00FFFFFF)
            // 0x0080d113 = srli x2, x1, 8
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x80);
            memory.write(7, 0x00);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(0x00ffffff);
        });
    });

    describe('SRAI - Shift Right Arithmetic Immediate', () => {
        test('SRAI: shift positive number by 0 (identity)', () => {
            // ADDI x1, x0, 42
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x02);
            cpu.step();

            // SRAI x2, x1, 0 (42 >> 0 = 42)
            // 0x4000d113 = srai x2, x1, 0
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x00);
            memory.write(7, 0x40);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(42);
        });

        test('SRAI: shift positive number by 1', () => {
            // ADDI x1, x0, 10
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xa0);
            memory.write(3, 0x00);
            cpu.step();

            // SRAI x2, x1, 1 (10 >> 1 = 5)
            // 0x4010d113 = srai x2, x1, 1
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x10);
            memory.write(7, 0x40);
            cpu.step();

            expect(cpu.getRegisterValue(2)).toBe(5);
        });

        test('SRAI: arithmetic shift of negative number', () => {
            // ADDI x1, x0, -8 (0xFFFFFFF8)
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x80);
            memory.write(3, 0xff);
            cpu.step();

            // SRAI x2, x1, 1 (-8 >> 1 = -4, 0xFFFFFFFC)
            // 0x4010d113 = srai x2, x1, 1
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x10);
            memory.write(7, 0x40);
            cpu.step();

            // Result is -4 in signed representation (0xFFFFFFFC unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-4);
        });

        test('SRAI: arithmetic shift of -1', () => {
            // ADDI x1, x0, -1 (0xFFFFFFFF)
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0xf0);
            memory.write(3, 0xff);
            cpu.step();

            // SRAI x2, x1, 8 (-1 >> 8 = -1, 0xFFFFFFFF)
            // 0x4080d113 = srai x2, x1, 8
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x80);
            memory.write(7, 0x40);
            cpu.step();

            // Result is -1 in signed representation (0xFFFFFFFF unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-1);
        });

        test('SRAI: arithmetic shift preserves sign bit', () => {
            // ADDI x1, x0, -128 (0xFFFFFF80)
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x80);
            memory.write(3, 0xf8);
            cpu.step();

            // SRAI x2, x1, 4 (-128 >> 4 = -8, 0xFFFFFFF8)
            // 0x4040d113 = srai x2, x1, 4
            memory.write(4, 0x13);
            memory.write(5, 0xd1);
            memory.write(6, 0x40);
            memory.write(7, 0x40);
            cpu.step();

            // Result is -8 in signed representation (0xFFFFFFF8 unsigned)
            expect(cpu.getRegisterValue(2)).toBe(-8);
        });
    });

    describe('Combined operations', () => {
        test('Chain multiple I-Type operations', () => {
            // ADDI x1, x0, 100
            memory.write(0, 0x93);
            memory.write(1, 0x00);
            memory.write(2, 0x40);
            memory.write(3, 0x06);
            cpu.step();
            expect(cpu.getRegisterValue(1)).toBe(100);

            // SLLI x2, x1, 2 (100 << 2 = 400)
            memory.write(4, 0x13);
            memory.write(5, 0x91);
            memory.write(6, 0x20);
            memory.write(7, 0x00);
            cpu.step();
            expect(cpu.getRegisterValue(2)).toBe(400);

            // ANDI x3, x2, 0xFF (400 & 0xFF = 144)
            // 0x0ff17193 = andi x3, x2, 0xff
            memory.write(8, 0x93);
            memory.write(9, 0x71);
            memory.write(10, 0xf1);
            memory.write(11, 0x0f);
            cpu.step();
            expect(cpu.getRegisterValue(3)).toBe(144);

            // XORI x4, x3, 0x0F (144 ^ 15 = 159)
            memory.write(12, 0x13);
            memory.write(13, 0xc2);
            memory.write(14, 0xf1);
            memory.write(15, 0x00);
            cpu.step();
            expect(cpu.getRegisterValue(4)).toBe(159);
        });
    });
});