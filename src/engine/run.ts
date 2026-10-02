import type { AlgorithmDefinition } from '../algorithms/types';
import { buildFrames } from './frames';
import { Tracer } from './tracer';
import type { Trace } from './types';

/**
 * Executa o algoritmo de verdade sobre uma cópia da entrada e produz a
 * linha do tempo completa (eventos + quadros). Como toda a execução fica
 * registrada, é possível avançar, voltar e saltar para qualquer passo sem
 * reexecutar nem corromper o estado.
 */
export function runAlgorithm(algorithm: AlgorithmDefinition, input: readonly number[]): Trace {
  const tracer = new Tracer(input, algorithm.code);
  algorithm.run(tracer);
  const output = tracer.finish();
  const { frames, calls, milestones } = buildFrames(input, tracer.events, { usesAux: algorithm.usesAux });
  return {
    algorithm: algorithm.id,
    input: [...input],
    output,
    events: tracer.events,
    frames,
    calls,
    milestones,
  };
}
