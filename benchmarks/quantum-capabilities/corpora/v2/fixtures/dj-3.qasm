OPENQASM 2.0;
include "qelib1.inc";
gate gate_Oracle q0,q1,q2 { x q0; x q1; cx q0,q2; cx q1,q2; x q0; x q1; }
qreg q[3];
creg c[2];
x q[2];
h q[2];
h q[0];
h q[1];
gate_Oracle q[0],q[1],q[2];
h q[0];
h q[1];
barrier q[0],q[1],q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
