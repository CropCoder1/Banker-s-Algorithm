import { useEffect, useMemo, useState } from 'react';
import './App.css';

const BASE_ALLOCATION = [
  [0, 1, 0],
  [2, 0, 0],
  [3, 0, 2],
  [2, 1, 1],
  [0, 0, 2],
];

const BASE_MAX = [
  [7, 5, 3],
  [3, 2, 2],
  [9, 0, 2],
  [2, 2, 2],
  [4, 3, 3],
];

const shapeMatrix = (matrix, rows, cols) =>
  Array.from({ length: rows }, (_, rowIndex) => {
    const sourceRow = matrix[rowIndex] || [];
    return Array.from({ length: cols }, (_, colIndex) => {
      const value = Number(sourceRow[colIndex]);
      return Number.isFinite(value) ? value : 0;
    });
  });

const resizeNames = (names, count) =>
  Array.from({ length: count }, (_, index) => names[index] || `R${index + 1}`);

const resizeTotals = (values, count) =>
  Array.from({ length: count }, (_, index) => values[index] ?? '');

const buildDefaultSimulation = () => ({
  processCount: 5,
  resourceCount: 3,
  resourceNames: ['R1', 'R2', 'R3'],
  totalResources: ['', '', ''],
  allocation: shapeMatrix(BASE_ALLOCATION, 5, 3),
  maxMatrix: shapeMatrix(BASE_MAX, 5, 3),
});

const computeNeedMatrix = (allocation, maxMatrix) =>
  allocation.map((row, rowIndex) =>
    row.map((value, colIndex) => Math.max(0, Number(maxMatrix[rowIndex][colIndex] || 0) - value))
  );

const computeAvailable = (totalResources, allocation) =>
  totalResources.map((total, index) => {
    const used = allocation.reduce((sum, row) => sum + (Number(row[index]) || 0), 0);
    return Math.max(0, total - used);
  });

const computeSafetyTrace = (allocation, maxMatrix, totalResources) => {
  const need = computeNeedMatrix(allocation, maxMatrix);
  const work = computeAvailable(totalResources, allocation);
  const finish = new Array(allocation.length).fill(false);
  const sequence = [];
  const steps = [];
  let progress = true;

  while (progress) {
    progress = false;

    for (let processIndex = 0; processIndex < allocation.length; processIndex += 1) {
      if (finish[processIndex]) continue;

      const canFinish = need[processIndex].every((value, resourceIndex) => value <= work[resourceIndex]);

      if (canFinish) {
        const beforeWork = [...work];
        const release = allocation[processIndex];

        release.forEach((value, resourceIndex) => {
          work[resourceIndex] += value;
        });

        finish[processIndex] = true;
        sequence.push(processIndex);
        progress = true;

        steps.push({
          processIndex,
          processLabel: `P${processIndex + 1}`,
          need: need[processIndex],
          beforeWork,
          afterWork: [...work],
          reason: need[processIndex]
            .map((value, resourceIndex) => `${value} <= ${beforeWork[resourceIndex]}`)
            .join(' and '),
        });
        break;
      }
    }
  }

  const safe = sequence.length === allocation.length;

  return {
    safe,
    sequence,
    steps,
    need,
    available: work,
    summary: safe
      ? `Safe sequence found: ${sequence.map((index) => `P${index + 1}`).join(' → ')}`
      : 'No safe sequence exists. The system is in an unsafe state.',
  };
};

const simulateRequest = (allocation, maxMatrix, totalResources, processIndex, requestVector) => {
  const nextAllocation = allocation.map((row) => [...row]);

  requestVector.forEach((value, resourceIndex) => {
    nextAllocation[processIndex][resourceIndex] += value;
  });

  const available = computeAvailable(totalResources, nextAllocation);
  const safe = computeSafetyTrace(nextAllocation, maxMatrix, totalResources);

  return {
    allocation: nextAllocation,
    available,
    safe,
  };
};

function App() {
  const [simulation, setSimulation] = useState(buildDefaultSimulation);
  const [requestProcess, setRequestProcess] = useState(0);
  const [requestVector, setRequestVector] = useState([0, 0, 0]);
  const [requestResult, setRequestResult] = useState(null);

  useEffect(() => {
    document.title = "Banker's Algorithm – Deadlock Avoidance Simulator";
  }, []);

  useEffect(() => {
    setRequestVector(Array.from({ length: simulation.resourceCount }, () => 0));
  }, [simulation.resourceCount]);

  useEffect(() => {
    setRequestProcess((current) => Math.min(current, Math.max(simulation.processCount - 1, 0)));
  }, [simulation.processCount]);

  const needMatrix = useMemo(
    () => computeNeedMatrix(simulation.allocation, simulation.maxMatrix),
    [simulation.allocation, simulation.maxMatrix]
  );

  const totalsComplete = simulation.totalResources.every(
    (total) => total !== '' && Number.isFinite(Number(total)) && Number(total) >= 0
  );
  const numericTotals = useMemo(
    () => simulation.totalResources.map((total) => Number(total) || 0),
    [simulation.totalResources]
  );
  const totalsBelowAllocation = totalsComplete && numericTotals.some((total, resourceIndex) => {
    const allocated = simulation.allocation.reduce((sum, row) => sum + row[resourceIndex], 0);
    return total < allocated;
  });

  const available = useMemo(
    () => computeAvailable(numericTotals, simulation.allocation),
    [numericTotals, simulation.allocation]
  );

  const safetyTrace = useMemo(
    () => {
      if (!totalsComplete) {
        return {
          safe: false,
          sequence: [],
          steps: [],
          summary: 'Enter the total number of instances for every resource to run the safety check.',
        };
      }
      if (totalsBelowAllocation) {
        return {
          safe: false,
          sequence: [],
          steps: [],
          summary: 'Total resources cannot be less than the resources already allocated.',
        };
      }
      return computeSafetyTrace(simulation.allocation, simulation.maxMatrix, numericTotals);
    },
    [simulation.allocation, simulation.maxMatrix, numericTotals, totalsComplete, totalsBelowAllocation]
  );

  const updateSimulationSize = (nextProcessCount, nextResourceCount) => {
    setSimulation((previous) => ({
      ...previous,
      processCount: nextProcessCount,
      resourceCount: nextResourceCount,
      resourceNames: resizeNames(previous.resourceNames, nextResourceCount),
      totalResources: resizeTotals(previous.totalResources, nextResourceCount),
      allocation: shapeMatrix(previous.allocation, nextProcessCount, nextResourceCount),
      maxMatrix: shapeMatrix(previous.maxMatrix, nextProcessCount, nextResourceCount),
    }));
  };

  const updateMatrixValue = (matrixType, rowIndex, colIndex, value) => {
    setSimulation((previous) => {
      const target = matrixType === 'allocation' ? previous.allocation : previous.maxMatrix;
      const nextMatrix = target.map((row) => [...row]);
      nextMatrix[rowIndex][colIndex] = Number(value) || 0;

      return {
        ...previous,
        [matrixType]: nextMatrix,
      };
    });
  };

  const handleRequestValueChange = (resourceIndex, value) => {
    setRequestVector((previous) => previous.map((current, index) => (index === resourceIndex ? Number(value) || 0 : current)));
  };

  const handleRequestSubmit = () => {
    if (!totalsComplete || totalsBelowAllocation) {
      setRequestResult({
        accepted: false,
        message: 'Enter valid total resources (at least as many as currently allocated) before simulating a request.',
      });
      return;
    }

    const maxRequest = needMatrix[requestProcess] || [];
    const requestExceedsNeed = requestVector.some((value, index) => value > maxRequest[index]);
    const requestExceedsAvailable = requestVector.some((value, index) => value > available[index]);

    if (requestExceedsNeed || requestExceedsAvailable) {
      setRequestResult({
        accepted: false,
        message: requestExceedsNeed
          ? 'Request exceeds the process need, so it cannot be granted.'
          : 'Request exceeds the current available resources.',
      });
      return;
    }

    const result = simulateRequest(
      simulation.allocation,
      simulation.maxMatrix,
      numericTotals,
      requestProcess,
      requestVector
    );

    setRequestResult({
      accepted: result.safe.safe,
      message: result.safe.safe
        ? `Granting this request keeps the system safe. Safe sequence: ${result.safe.sequence.map((index) => `P${index + 1}`).join(' → ')}`
        : 'Granting this request causes the system to become unsafe.',
      sequence: result.safe.sequence,
      steps: result.safe.steps,
    });
  };

  const startSimulation = () => {
    document.getElementById('configuration')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetSimulation = () => {
    const fresh = buildDefaultSimulation();
    setSimulation(fresh);
    setRequestProcess(0);
    setRequestVector([0, 0, 0]);
    setRequestResult(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar glass-card">
        <div>
          <div className="eyebrow-row">
            <span className="brand-chip">Operating Systems</span>
          </div>
          <h1>Banker's Algorithm</h1>
          <p>Deadlock Avoidance Simulator</p>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          Interactive Simulation
        </div>
      </header>

      <main className="dashboard">
        <section className="hero glass-card">
          <div>
            <div className="section-kicker">System Safety</div>
            <h2>
              Banker's <strong>Algorithm</strong>
              <br />
              Simulator
            </h2>
            <p>
              Explore how the Banker's Algorithm prevents deadlock by analyzing resource
              allocation, remaining needs, and system safety.
            </p>
            <button className="primary-btn" onClick={startSimulation}>
              Start Simulation
            </button>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon">✓</span>
              <span>Safety Detection</span>
            </div>
            <div className="feature-card">
              <span className="feature-icon">▣</span>
              <span>Need Matrix</span>
            </div>
            <div className="feature-card">
              <span className="feature-icon">→</span>
              <span>Safe Sequence</span>
            </div>
          </div>
        </section>

        <section id="configuration" className="glass-card section-card">
          <div className="section-header">
            <div>
              <div className="section-kicker">Input Configuration</div>
              <h3>Process and Resource Setup</h3>
            </div>
          </div>

          <div className="config-grid">
            <div className="counter-panel">
              <label>Processes</label>
              <div className="counter-row">
                <button
                  type="button"
                  onClick={() => updateSimulationSize(Math.max(1, simulation.processCount - 1), simulation.resourceCount)}
                >
                  −
                </button>
                <span>{simulation.processCount}</span>
                <button
                  type="button"
                  onClick={() => updateSimulationSize(Math.min(10, simulation.processCount + 1), simulation.resourceCount)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="counter-panel">
              <label>Resources</label>
              <div className="counter-row">
                <button
                  type="button"
                  onClick={() => updateSimulationSize(simulation.processCount, Math.max(1, simulation.resourceCount - 1))}
                >
                  −
                </button>
                <span>{simulation.resourceCount}</span>
                <button
                  type="button"
                  onClick={() => updateSimulationSize(simulation.processCount, Math.min(6, simulation.resourceCount + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="resource-edit-row">
            {simulation.resourceNames.map((name, index) => (
              <label className="resource-name-field" key={`resource-${index}`}>
                <span>Resource {index + 1}</span>
                <input
                  value={name}
                  onChange={(event) => {
                    const nextNames = [...simulation.resourceNames];
                    nextNames[index] = event.target.value || `R${index + 1}`;
                    setSimulation((previous) => ({ ...previous, resourceNames: nextNames }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <div className="matrix-grid">
          <section className="glass-card section-card">
            <div className="section-header compact">
              <div>
                <div className="section-kicker">Resource Allocation Table</div>
                <h3>Allocation Matrix</h3>
              </div>
            </div>
            <p className="muted-copy">Resources currently allocated to each process.</p>

            <div className="table-wrap">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Process</th>
                    {simulation.resourceNames.map((name, index) => (
                      <th key={`alloc-header-${index}`}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simulation.allocation.map((row, rowIndex) => (
                    <tr key={`allocation-row-${rowIndex}`}>
                      <td className="process-tag">P{rowIndex + 1}</td>
                      {row.map((value, colIndex) => (
                        <td key={`allocation-${rowIndex}-${colIndex}`}>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(event) =>
                              updateMatrixValue('allocation', rowIndex, colIndex, event.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card section-card">
            <div className="section-header compact">
              <div>
                <div className="section-kicker">Maximum Claim</div>
                <h3>Max Matrix</h3>
              </div>
            </div>
            <p className="muted-copy">Maximum resources every process may request.</p>

            <div className="table-wrap">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Process</th>
                    {simulation.resourceNames.map((name, index) => (
                      <th key={`max-header-${index}`}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simulation.maxMatrix.map((row, rowIndex) => (
                    <tr key={`max-row-${rowIndex}`}>
                      <td className="process-tag">P{rowIndex + 1}</td>
                      {row.map((value, colIndex) => (
                        <td key={`max-${rowIndex}-${colIndex}`}>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(event) =>
                              updateMatrixValue('maxMatrix', rowIndex, colIndex, event.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="glass-card section-card">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Need Matrix</div>
              <h3>Remaining Needs</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="matrix-table matrix-compact">
              <thead>
                <tr>
                  <th>Process</th>
                  {simulation.resourceNames.map((name, index) => (
                    <th key={`need-header-${index}`}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {needMatrix.map((row, rowIndex) => (
                  <tr key={`need-row-${rowIndex}`}>
                    <td className="process-tag">P{rowIndex + 1}</td>
                    {row.map((value, colIndex) => (
                      <td key={`need-${rowIndex}-${colIndex}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card section-card">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Available Resources</div>
              <h3>Current Work Vector</h3>
            </div>
          </div>

          <div className="available-row">
            {simulation.resourceNames.map((name, index) => (
              <div key={`available-${index}`} className="resource-pill">
                <span>{name}</span>
                <strong>{totalsComplete && !totalsBelowAllocation ? available[index] : '—'}</strong>
              </div>
            ))}
          </div>

          <div className="total-resources">
            <label>
              Total Resources
              <span className="input-hint">Enter the total instances available in the system for each resource.</span>
              <div className="total-resource-list">
                {simulation.resourceNames.map((name, index) => (
                  <input
                    key={`total-${index}`}
                    type="number"
                    min="0"
                    aria-label={`Total instances of ${name}`}
                    placeholder={`Enter ${name}`}
                    value={simulation.totalResources[index]}
                    onChange={(event) => {
                      const nextTotals = [...simulation.totalResources];
                      nextTotals[index] = event.target.value;
                      setSimulation((previous) => ({ ...previous, totalResources: nextTotals }));
                    }}
                  />
                ))}
              </div>
            </label>
          </div>
        </section>

        <section className="glass-card section-card">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Safety Algorithm Execution</div>
              <h3>Step-by-Step Evaluation</h3>
            </div>
          </div>

          <div className="execution-list">
            {safetyTrace.steps.length > 0 ? (
              safetyTrace.steps.map((step, index) => (
                <div className="execution-step" key={`${step.processLabel}-${index}`}>
                  <div className="step-number">{index + 1}</div>
                  <div className="step-body">
                    <h4>{step.processLabel} can finish</h4>
                    <p>
                      Need: [{step.need.join(', ')}] | Work before: [{step.beforeWork.join(', ')}]
                    </p>
                    <p>Work after release: [{step.afterWork.join(', ')}]</p>
                    <small>Condition: {step.reason}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="execution-step empty-step">
                <div className="step-number">!</div>
                <div className="step-body">
                  <h4>{totalsComplete && !totalsBelowAllocation ? 'No eligible process found' : 'Safety check needs valid totals'}</h4>
                  <p>{totalsComplete && !totalsBelowAllocation
                    ? 'The system is not in a safe state with the current allocation.'
                    : safetyTrace.summary}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="glass-card section-card result-panel">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Safe Sequence</div>
              <h3>Execution Outcome</h3>
            </div>
          </div>

          <div className={`status-banner ${safetyTrace.safe ? 'success' : (!totalsComplete || totalsBelowAllocation ? 'warning' : 'danger')}`}>
            <div className="status-badge">{safetyTrace.safe ? 'Safe' : (!totalsComplete || totalsBelowAllocation ? 'Check input' : 'Unsafe')}</div>
            <span>{safetyTrace.summary}</span>
          </div>

          <div className="sequence-row">
            {safetyTrace.sequence.length > 0 ? (
              safetyTrace.sequence.map((index) => (
                <span key={`safe-${index}`} className="sequence-chip">P{index + 1}</span>
              ))
            ) : (
              <span className="sequence-chip disabled">No sequence</span>
            )}
          </div>
        </section>

        <section className="glass-card section-card">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Resource Request Simulator</div>
              <h3>Request Evaluation</h3>
            </div>
          </div>

          <div className="request-simulator">
            <label>
              Select Process
              <select value={requestProcess} onChange={(event) => setRequestProcess(Number(event.target.value))}>
                {Array.from({ length: simulation.processCount }, (_, index) => (
                  <option key={`process-option-${index}`} value={index}>
                    P{index + 1}
                  </option>
                ))}
              </select>
            </label>

            <div className="request-inputs">
              {simulation.resourceNames.map((name, index) => (
                <label key={`request-${index}`}>
                  {name}
                  <input
                    type="number"
                    min="0"
                    value={requestVector[index] || 0}
                    onChange={(event) => handleRequestValueChange(index, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <button className="primary-btn" onClick={handleRequestSubmit}>
              Simulate Request
            </button>

            {requestResult && (
              <div className={`request-result ${requestResult.accepted ? 'safe' : 'danger'}`}>
                <strong>{requestResult.accepted ? 'Request accepted' : 'Request rejected'}</strong>
                <p>{requestResult.message}</p>
              </div>
            )}
          </div>
        </section>

        <section className="glass-card section-card">
          <div className="section-header compact">
            <div>
              <div className="section-kicker">Algorithm Explanation</div>
              <h3>How the Banker's Algorithm Works</h3>
            </div>
          </div>

          <ol className="explanation-list">
            <li>
              Compute the Need matrix as <strong>Max - Allocation</strong> for each process and resource.
            </li>
            <li>
              Compare the need of each unfinished process against the current available resources.
            </li>
            <li>
              If a process can finish, allocate its resources back to the system and continue scanning.
            </li>
            <li>
              The system is safe only if every process can eventually complete in sequence.
            </li>
          </ol>
        </section>

        <section className="glass-card section-card footer-actions">
          <button className="secondary-btn" onClick={resetSimulation}>
            Reset / New Simulation
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
