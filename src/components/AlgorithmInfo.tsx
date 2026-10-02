import type { AlgorithmDefinition } from '../algorithms/types';

interface AlgorithmInfoProps {
  algorithm: AlgorithmDefinition;
  n: number;
}

export function AlgorithmInfo({ algorithm, n }: AlgorithmInfoProps) {
  const c = algorithm.complexity;
  const nSquared = n * n;
  const nLogN = Math.round(n * Math.log2(Math.max(n, 2)));
  return (
    <section className="panel info" aria-labelledby="info-title">
      <header className="panel__header">
        <h2 className="panel__title" id="info-title">
          Sobre o {algorithm.name}
        </h2>
      </header>
      <p className="info__tagline">{algorithm.tagline}</p>
      <p>{algorithm.description}</p>

      <h3 className="info__subtitle">Como funciona</h3>
      <ol className="info__steps">
        {algorithm.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3 className="info__subtitle">Complexidade</h3>
      <table className="complexity">
        <tbody>
          <tr>
            <th scope="row">Melhor caso</th>
            <td>{c.best}</td>
          </tr>
          <tr>
            <th scope="row">Caso médio</th>
            <td>{c.average}</td>
          </tr>
          <tr>
            <th scope="row">Pior caso</th>
            <td>{c.worst}</td>
          </tr>
          <tr>
            <th scope="row">Memória extra</th>
            <td>{c.space}</td>
          </tr>
        </tbody>
      </table>
      <div className="badges">
        <span className={`badge ${algorithm.stable ? 'badge--yes' : 'badge--no'}`} title="Elementos iguais mantêm a ordem original?">
          {algorithm.stable ? '✓ Estável' : '✗ Não estável'}
        </span>
        <span className={`badge ${algorithm.inPlace ? 'badge--yes' : 'badge--no'}`} title="Ordena sem precisar de outro vetor?">
          {algorithm.inPlace ? '✓ No próprio vetor' : '✗ Usa vetor auxiliar'}
        </span>
      </div>
      <p className="small">{algorithm.complexityNote}</p>

      <details className="info__details">
        <summary>O que significa O(n²), O(n log n)…?</summary>
        <p>
          A notação <strong>O</strong> (“O grande”) descreve como o trabalho cresce quando a quantidade de elementos{' '}
          <em>n</em> aumenta — sem se preocupar com o computador ou o tempo exato.
        </p>
        <ul>
          <li>
            <strong>O(n)</strong>: dobrar <em>n</em> dobra o trabalho.
          </li>
          <li>
            <strong>O(n log n)</strong>: cresce um pouco mais que linear; típico de “dividir e conquistar”.
          </li>
          <li>
            <strong>O(n²)</strong>: dobrar <em>n</em> quadruplica o trabalho.
          </li>
          <li>
            <strong>O(1)</strong> de memória: usa só algumas variáveis, independentemente de <em>n</em>.
          </li>
        </ul>
        <p className="small">
          Para a sequência atual (n = {n}): n² = {nSquared} e n·log₂n ≈ {nLogN}. Compare com as métricas reais da execução!
        </p>
      </details>
    </section>
  );
}
