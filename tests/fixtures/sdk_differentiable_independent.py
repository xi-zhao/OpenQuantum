"""Independent numerical review; development evidence, not scientific Acceptance.

Run with the selected SDK prepared Python, for example:
.openquantum/python-envs/pennylane-differentiable/bin/python -B
        tests/fixtures/sdk_differentiable_independent.py pennylane --project-root .

References use direct dense gate expansion and forward tangent-state derivatives,
without SDK gradients, parameter-shift rules or the author reference helper.
"""
import argparse, importlib.util, json, socket, hashlib
from pathlib import Path
import numpy as np
parser = argparse.ArgumentParser(description='Independent state and forward tangent-derivative checks of the four differentiable SDK adapters.')
parser.add_argument('sdk', choices=['pennylane', 'deepquantum', 'tensorcircuit', 'mindquantum'])
parser.add_argument('--project-root', type=Path, default=Path(__file__).resolve().parents[2], help='Repository checkout; defaults to the checkout containing this script.')
args = parser.parse_args()
ROOT = args.project_root.resolve()
sdk = args.sdk
def no_network(*a,**k): raise RuntimeError('Independent review blocks network')
socket.socket.connect=no_network;socket.create_connection=no_network
spec=importlib.util.spec_from_file_location('reviewed_bridge',ROOT/f'.agents/skills/{sdk}-differentiable/mcp/bridge.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
P={'I':np.eye(2,dtype=complex),'X':np.array([[0,1],[1,0]],complex),'Y':np.array([[0,-1j],[1j,0]],complex),'Z':np.diag([1,-1]).astype(complex)}
def expand(local,targets,n):
  out=np.zeros((2**n,2**n),complex)
  for col in range(2**n):
    ib=[(col>>(n-1-q))&1 for q in range(n)]
    lc=sum(ib[q]<<(len(targets)-1-j) for j,q in enumerate(targets))
    for lr in range(2**len(targets)):
      ob=ib.copy()
      for j,q in enumerate(targets):ob[q]=(lr>>(len(targets)-1-j))&1
      row=sum(b<<(n-1-q) for q,b in enumerate(ob));out[row,col]=local[lr,lc]
  return out

def reference(v):
  n=v['numQubits'];m=len(v['trainableGateIndices']);state=np.eye(2**n,dtype=complex)[:,0];deriv=np.zeros((2**n,m),complex)
  cols={g:j for j,g in enumerate(v['trainableGateIndices'])}
  for gi,g in enumerate(v['gates']):
    name=g['gate'];du=None
    if name.startswith('R'):
      sig=P[name[1]];a=g['angle'];u=np.cos(a/2)*P['I']-1j*np.sin(a/2)*sig;du=-.5j*sig@u
    elif name=='H':u=np.array([[1,1],[1,-1]])/np.sqrt(2)
    elif name in ('S','T'):u=np.diag([1,np.exp(1j*np.pi/(2 if name=='S' else 4))])
    elif name=='CX':u=np.array([[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]],complex)
    elif name=='CZ':u=np.diag([1,1,1,-1])
    elif name=='SWAP':u=np.array([[1,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1]],complex)
    else:u=P[name]
    big=expand(u,g['targets'],n);deriv=big@deriv
    if gi in cols:deriv[:,cols[gi]]+=expand(du,g['targets'],n)@state
    state=big@state
  means=[];jac=[]
  for word in v['observables']:
    op=np.array([[1]],complex)
    for pauli in word:op=np.kron(op,P[pauli])
    means.append(float(np.vdot(state,op@state).real));jac.append((2*np.real(deriv.conj().T@(op@state))).tolist())
  return state,np.asarray(means),np.asarray(jac).reshape(len(means),m)

rng=np.random.default_rng(9027);cases=[]
for case_index in range(4):
  n=4
  gates=[]
  for i in range(18):
    if i in [0,3,5,10,12,16]:
      gates.append({'gate':['RX','RY','RZ'][i%3],'targets':[int(rng.integers(n))],'angle':float(rng.uniform(-2,2))})
    elif i%3==1:
      gates.append({'gate':['CX','CZ','SWAP'][int(rng.integers(3))],'targets':rng.choice(n,2,replace=False).tolist()})
    else:gates.append({'gate':['H','X','Y','Z','S','T'][int(rng.integers(6))],'targets':[int(rng.integers(n))]})
  cases.append({'numQubits':n,'gates':gates,'observables':['YZXI','IXYZ','YYYY','XXXX','ZZZZ','IIZI','IIII','YZXI'],'trainableGateIndices':[16,0,12,5,10]})
cases.append({'numQubits':4,'gates':[{'gate':'RX','targets':[0],'angle':0},{'gate':'RY','targets':[3],'angle':0}],'observables':['YIII','IIIX','IIII','ZIIY'],'trainableGateIndices':[1,0]})
cases.append({'numQubits':4,'gates':[{'gate':'X','targets':[2]}],'observables':['IIZI','ZIII','IIIZ','IIII'],'trainableGateIndices':[]})
records=[];tol=5e-7 if sdk=='deepquantum' else 2e-10
for i,v in enumerate(cases):
  r,_=mod.compute(v);s=np.asarray(r['amplitudes']);s=s[:,0]+1j*s[:,1];rs,rm,rj=reference(v)
  errors={'state':float(np.max(abs(s-rs))),'expectation':float(np.max(abs(np.asarray(r['expectations'])-rm))),'jacobian':float(np.max(abs(np.asarray(r['jacobian'])-rj))) if rj.size else 0.,'rawNormConsistency':abs(r['stateNormSquared']-float(np.sum(abs(s)**2)))}
  assert r['trainableGateIndices']==v['trainableGateIndices']
  assert all(error<tol for error in errors.values()),(sdk,i,errors)
  if i==5:assert abs(r['probabilities'][2]-1)<tol
  records.append({'case':i,'input':v,'errors':errors,'normSquared':r['stateNormSquared']})
payload={'sdk':sdk,'passed':True,'cases':records,'tolerance':tol,'reference':'independent forward tangent-state derivatives; no parameter shift, autodiff or author test helper used','networkConnectBlocked':True,'sourceHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/f'.agents/skills/{sdk}-differentiable/mcp/bridge.py',ROOT/'src/lib/sdk_differentiable.py',ROOT/'src/lib/sdk-differentiable.mjs',ROOT/'tests/fixtures/sdk_differentiable_science.py']},'scientificValidation':'not_evaluated'}
out=ROOT/'.openquantum/sdk-evidence/differentiable-review';out.mkdir(parents=True,exist_ok=True);(out/f'{sdk}.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'sdk':sdk,'passed':True,'cases':len(records),'maxErrors':{key:max(r['errors'][key] for r in records) for key in records[0]['errors']}}))
