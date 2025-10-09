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
});