"""Independent domain-review regression. Run with the selected SDK prepared Python.

Example: .openquantum/python-envs/pytket-compilation/bin/python -B
    tests/fixtures/sdk_compilers_independent.py pytket-compilation --project-root .
References are independent tensor-axis gate application and scalar polynomial
energies. These checks are development evidence, not scientific Acceptance.
"""
import argparse, importlib.util, itertools, json, math, socket, sys
from pathlib import Path
import numpy as np

parser = argparse.ArgumentParser(description='Independent numerical checks of the six compiler/optimization SDK adapters.')
parser.add_argument('capability', choices=['pytket-compilation', 'ocean-optimization', 'kaiwu-qubo', 'pyquil-simulation', 'spinqit-simulation', 'qutrunk-simulation'])
parser.add_argument('--project-root', type=Path, default=Path(__file__).resolve().parents[2], help='OpenQuantum repository checkout; defaults to the checkout containing this script.')
args = parser.parse_args()
root = args.project_root.resolve()
id = args.capability
spec=importlib.util.spec_from_file_location('review_target',root/'.agents/skills'/id/'mcp/bridge.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def block(*args,**kwargs):raise AssertionError('Unexpected network access during independent review')
socket.socket.connect=block;socket.create_connection=block
rng=np.random.default_rng(19471926)
I=np.eye(2,dtype=complex);X=np.array([[0,1],[1,0]],complex);Y=np.array([[0,-1j],[1j,0]],complex);Z=np.diag([1,-1]).astype(complex)
local={'H':(X+Z)/np.sqrt(2),'X':X,'Y':Y,'Z':Z,'S':np.diag([1,1j]),'T':np.diag([1,np.exp(1j*np.pi/4)])}
CX=np.array([[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]],complex);CZ=np.diag([1,1,1,-1])
def reference(v):
 n=v['numQubits'];state=np.eye(2**n,dtype=complex)
 for g in v['gates']:
  name=g['gate'];targets=g['targets']
  if name in ('RX','RY','RZ'):
   m=np.cos(g['angle']/2)*I-1j*np.sin(g['angle']/2)*local[name[1]]
  else:m={'CX':CX,'CZ':CZ}.get(name,local.get(name))
  rest=[i for i in range(n) if i not in targets]
  axes=targets+rest+[n]
  tensor=np.transpose(state.reshape([2]*n+[2**n]),axes)
  tensor=(m@tensor.reshape(2**len(targets),-1)).reshape([2]*n+[2**n])
  state=np.transpose(tensor,np.argsort(axes)).reshape(2**n,2**n)
 return state
records=[]
if id in ['pytket-compilation','pyquil-simulation','spinqit-simulation','qutrunk-simulation']:
 cases=[{'numQubits':4,'gates':[{'gate':'X','targets':[i]}]} for i in [0,1,2,3]]
 for seed in range(8):
  g=[]
  for name in ['T','H','RX','RY','CX','CZ','RZ','S','Y','X','Z']*3:
   t=[int(q) for q in rng.choice(4,2 if name in ['CX','CZ'] else 1,replace=False)]
   item={'gate':name,'targets':t}
   if name in ['RX','RY','RZ']:item['angle']=float(rng.uniform(-19,19))
   g.append(item)
  cases.append({'numQubits':4,'gates':g})
 for v in cases:
  expected=reference(v)
  for opt in [False,True] if id=='pytket-compilation' else [None]:
   result,_=mod.compute({**v,'optimize':opt} if opt is not None else v)
   if id=='pytket-compilation':
    from pytket.qasm import circuit_from_qasm_str
    state=circuit_from_qasm_str(result['qasm']).get_unitary()*np.exp(1j*result['globalPhaseRadians'])
    error=float(np.max(abs(state-expected)))
   else:
    state=np.array([complex(*r['amplitude']) for r in result['outcomes']])
    error=float(np.max(abs(state-expected[:,0])))
    assert [r['bits'] for r in result['outcomes']]==[format(i,'04b') for i in range(16)]
    assert np.max(abs(np.array([r['probability'] for r in result['outcomes']])-abs(state)**2))<1e-15
   assert error<(4e-8 if id=='spinqit-simulation' else 2e-11),(id,error)
   records.append({'numQubits':4,'gates':len(v['gates']),'optimize':opt,'maxError':error})
elif id=='ocean-optimization':
 for vt in ['BINARY','SPIN']:
  for case in range(9):
   n=4;lin=rng.normal(size=n).tolist();pairs=[{'i':j,'j':i,'bias':float(rng.normal())} for i in range(n) for j in range(i+1,n)];offset=float(rng.normal())
   v={'linear':lin,'quadratic':pairs,'offset':offset,'vartype':vt,'method':'exact'}
   out,_=mod.compute(v)
   values=list(itertools.product([0,1] if vt=='BINARY' else [-1,1],repeat=n))
   def energy(m,x):return m['offset']+np.dot(m['linear'],x)+sum(t['bias']*x[t['i']]*x[t['j']] for t in m['quadratic'])
   errors=[]
   assert len(out['samples'])==16
   for row in out['samples']:
    x=np.array(row['values']);x01=x if vt=='BINARY' else (x+1)/2;spin=2*x-1 if vt=='BINARY' else x
    errors.extend([abs(row['energy']-energy(v,x)),abs(row['energy']-energy(out['binaryModel'],x01)),abs(row['energy']-energy(out['spinModel'],spin))])
   assert max(errors)<1e-12
   records.append({'vartype':vt,'reversePairIndices':True,'maxError':float(max(errors))})
 for seed in [0,2147483647]:
  out,_=mod.compute({'linear':[0,0,0],'quadratic':[],'offset':3.2,'vartype':'SPIN','method':'simulated_annealing','numReads':13,'numSweeps':1,'seed':seed})
  assert sum(r['numOccurrences'] for r in out['samples'])==13
  assert all(r['energy']==3.2 for r in out['samples'])
  records.append({'zeroSpinModel':True,'seed':seed,'maxError':0})
else:
 for n in [1,3,5,11]:
  for repeat in range(3):
   lin=rng.normal(size=n).tolist(); lin[-1]=0
   pairs=[{'i':n-1,'j':0,'bias':-.73}] if n>1 else []
   constraints=[{'coefficients':rng.integers(-3,4,size=n).tolist(),'rhs':float(rng.normal()),'penalty':float(rng.uniform(.1,4))}]
   xlist=[rng.integers(0,2,size=n).tolist() for _ in range(8)]
   v={'linear':lin,'quadratic':pairs,'offset':.927,'constraints':constraints,'assignments':xlist}
   out,_=mod.compute(v);errors=[]
   for row in out['evaluations']:
    x=np.array(row['values']);s=np.r_[2*x-1,1]
    e=.927+np.dot(lin,x)+sum(p['bias']*x[p['i']]*x[p['j']] for p in pairs)+sum(c['penalty']*(np.dot(c['coefficients'],x)-c['rhs'])**2 for c in constraints)
    energies=[row['energy'],x@np.array(out['quboMatrix'])@x+out['quboOffset'],-s@np.array(out['isingMatrix'])@s+out['isingOffset']]
    errors.extend(abs(a-e) for a in energies)
   assert max(errors)<1e-10
   assert out['variableNames']==[f'x_{i}' for i in range(n)]
   records.append({'numVariables':n,'maxError':float(max(errors))})
print(json.dumps({'capability':id,'cases':len(records),'maxError':max(r['maxError'] for r in records),'networkBlocked':True,'details':records}))
