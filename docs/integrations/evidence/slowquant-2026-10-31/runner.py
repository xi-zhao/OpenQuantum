import importlib, importlib.metadata, json, pathlib, runpy, sys
def offline(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        raise RuntimeError('Unexpected network access in offline SDK verification')
sys.addaudithook(offline)
if __name__ == '__main__':
    program, modules = sys.argv[1], json.loads(sys.argv[2])
    sys.argv = [program]
    runpy.run_path(program, run_name='__main__')
    for name in modules:
        importlib.import_module(name)
    versions = {d.metadata['Name']: d.version for d in importlib.metadata.distributions() if d.metadata['Name']}
    pathlib.Path('versions.json').write_text(json.dumps(versions, sort_keys=True))
