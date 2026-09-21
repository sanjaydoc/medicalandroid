import SimulatorBrowser from './SimulatorBrowser';

/**
 * Protocol Simulator — the REAL 7-step pipeline, run entirely in the browser
 * (same engine as the De Novo chat assistant). No backend; the genome never
 * leaves the device.
 */
export default function Simulator() {
  return <SimulatorBrowser />;
}
