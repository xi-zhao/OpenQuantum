import json,sys,importlib.metadata
import jax
jax.config.update("jax_enable_x64",True)
import jax.numpy as jnp
import tensorcircuit as tc
import numpy as np
from qiskit.quantum_info import Statevector
tc.set_backend("jax");tc.set_dtype("complex128")
def value(angle):
 c=tc.Circuit(3);c.h(0);c.ry(2,theta=angle);c.cnot(0,2)
 return jnp.real(c.expectation_ps(x=[0]))
angles=jnp.array([0.17,0.43,-0.61]);means=jax.vmap(value)(angles);gradients=jax.vmap(jax.grad(value))(angles)
c=tc.Circuit(3);c.h(0);c.ry(2,theta=0.43);c.cnot(0,2);q=c.to_qiskit()
a=np.asarray(c.state());b=np.asarray(Statevector.from_instruction(q).data).reshape((2,)*3).transpose(2,1,0).reshape(-1)
assert np.allclose(a,b,atol=1e-10)
json.dump({"distribution":sys.argv[1],"version":importlib.metadata.version(sys.argv[1]),"means":np.asarray(means).tolist(),"gradients":np.asarray(gradients).tolist(),"amplitudes":[[float(x.real),float(x.imag)] for x in a],"qiskitConversionVerified":True,"scientificValidation":"not_evaluated"},open("result.json","w"))
