"""One lossy quantum link evaluated by the SimQN discrete-event engine."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qns.simulator.simulator import Simulator
    from qns.simulator.event import func_to_event
    from qns.entity.node.node import QNode
    from qns.entity.node.app import Application
    from qns.entity.qchannel.qchannel import QuantumChannel, RecvQubitPacket
    from qns.models.epr.werner import WernerStateEntanglement
    from qns.utils.rnd import set_seed

    set_seed(v["seed"])
    end = (v["attempts"] - 1) * v["intervalSeconds"] + v["delaySeconds"] + 2 / v["timeSlotsPerSecond"]
    simulator = Simulator(0, end, accuracy=v["timeSlotsPerSecond"])
    source, destination = QNode("source"), QNode("destination")
    arrivals = []

    class Receiver(Application):
        def handle(self, node, event):
            if isinstance(event, RecvQubitPacket):
                arrivals.append({"attempt": int(event.qubit.name), "timeSeconds": float(event.t.sec), "fidelity": float(event.qubit.fidelity)})
                return True
            return False

    destination.add_apps(Receiver())
    channel = QuantumChannel("link", node_list=[source, destination], bandwidth=0,
                             delay=v["delaySeconds"], drop_rate=v["dropProbability"],
                             length=v["lengthMeters"], decoherence_rate=v["decoherencePerMeter"])
    source.install(simulator)
    destination.install(simulator)
    channel.install(simulator)
    for index in range(v["attempts"]):
        pair = WernerStateEntanglement(fidelity=v["initialFidelity"], name=str(index))
        simulator.add_event(func_to_event(simulator.time(sec=index * v["intervalSeconds"]), channel.send,
                                         qubit=pair, next_hop=destination))
    simulator.run()
    arrivals.sort(key=lambda row: row["attempt"])
    received = len(arrivals)
    return {
        "transmitted": v["attempts"], "received": received, "dropped": v["attempts"] - received,
        "deliveryFraction": received / v["attempts"], "arrivals": arrivals,
        "simulatedDurationSeconds": float(simulator.te.sec), "eventCount": simulator.total_events,
        "model": "independent Werner-state transmissions; unlimited bandwidth; no memories or swapping",
    }, [
        "This is a single-link stochastic transport model, not a full quantum repeater or QKD protocol.",
        "The Werner parameter decays as exp(-decoherencePerMeter * lengthMeters); channel delay alone does not model memory decoherence.",
        "Times are quantized down to SimQN time slots. Loss is sampled; finite trials are not a guaranteed channel performance bound.",
    ]


if __name__ == "__main__":
    execute(compute)
