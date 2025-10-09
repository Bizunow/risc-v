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

    test('Should execute ADDI instruction', () => {
        // ADDI x1, x0, 42 (0x02a00093)
        // This adds 42 to register x0 (which is always 0) and stores in x1
        memory.write(0, 0x93);
        memory.write(1, 0x00);
        memory.write(2, 0xa0);
        memory.write(3, 0x02);

        cpu.step();

        cpu.dump = jest.fn(); // Mock dump to avoid console output
        expect(cpu.getRegisterValue(0)).toBe(0);
        expect(cpu.getRegisterValue(1)).toBe(42);
    });
});