OPENQASM 2.0;
include "qelib1.inc";
gate qft q0,q1,q2 { h q2; cp(pi/2) q2,q1; cp(pi/4) q2,q0; h q1; cp(pi/2) q1,q0; h q0; swap q0,q2; }
qreg q[3];
creg meas[3];
qft q[0],q[1],q[2];
barrier q[0],q[1],q[2];
measure q[0] -> meas[0];
measure q[1] -> meas[1];
measure q[2] -> meas[2];
