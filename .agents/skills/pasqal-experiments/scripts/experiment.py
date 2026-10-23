#!/usr/bin/env python3
"""Run with the interpreter returned by sdk-access inspect pulser-dynamics."""
import argparse
import json
import sys

import workflow as w


def parser():
    cli = argparse.ArgumentParser(description=__doc__)
    sub = cli.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate-spec", help="Validate the experiment contract offline")
    validate.add_argument("--spec", required=True)
    device = sub.add_parser("device", help="Read one project's live device snapshot (network read)")
    device.add_argument("--project-id", required=True)
    device.add_argument("--region", choices=("fr", "sa"), default="fr")
    device.add_argument("--device", required=True)
    device.add_argument("--out", required=True)
    prepare = sub.add_parser("prepare", help="Build and serialize every scan point offline; no submission")
    prepare.add_argument("--spec", required=True)
    prepare.add_argument("--sequence", required=True)
    prepare.add_argument("--out", required=True)
    prepare.add_argument("--target", default="local")
    prepare.add_argument("--project-id")
    prepare.add_argument("--region", choices=("fr", "sa"), default="fr")
    devices = prepare.add_mutually_exclusive_group()
    devices.add_argument("--device-file")
    devices.add_argument("--local-device")
    prepare.add_argument("--noise-file", help="JSON with source and Pulser NoiseModel params")
    prepare.add_argument("--backend-config", help="Saved native EmulationConfig abstract representation")
    prepare.add_argument("--open-batch", action="store_true")
    local = sub.add_parser("local-run", help="Run prepared ideal/noisy sequences with existing Pulser/QuTiP")
    local.add_argument("--plan", required=True)
    local.add_argument("--out", required=True)
    local.add_argument("--seed", type=int, default=42)
    local.add_argument("--max-atoms", type=int, default=12, help="Explicit resource budget; never changes the register")
    local.add_argument("--solver-file", help="JSON of native QuTiP solver options")
    submit = sub.add_parser("submit", help="Create a billable cloud batch or add jobs to an open batch")
    submit.add_argument("--plan", required=True)
    submit.add_argument("--receipt", required=True)
    submit.add_argument("--approve-plan", required=True, help="Exact reviewed plan hash; does not replace host/user authorization")
    submit.add_argument("--parent-receipt", help="Add this plan to an existing open batch")
    recover = sub.add_parser("recover", help="Read and reconcile a prior submission; never submits")
    recover.add_argument("--receipt", required=True)
    recover.add_argument("--batch-id", help="Required only if the submission response was lost")
    recover.add_argument("--plan", help="Reconstruct a missing receipt from its permanent submission claim")
    for command in ("close", "cancel"):
        control = sub.add_parser(command, help=f"Request {command} on the recorded cloud batch")
        control.add_argument("--receipt", required=True)
        control.add_argument("--confirm", action="store_true")
    harvest = sub.add_parser("harvest", help="Fetch raw results/status once; does not wait, submit or analyze")
    harvest.add_argument("--receipt", required=True)
    harvest.add_argument("--out", required=True)
    analyze = sub.add_parser("analyze", help="Analyze saved counts offline; scientificValidation=not_evaluated")
    analyze.add_argument("--raw", required=True)
    analyze.add_argument("--sequence", required=True)
    analyze.add_argument("--out", required=True)
    analyze.add_argument("--bootstrap", type=int, default=300)
    analyze.add_argument("--seed", type=int, default=42)
    analyze.add_argument("--baseline")
    analyze.add_argument("--sigma-tolerance", type=float, default=3.0)
    analyze.add_argument("--readout-file", help="Sourced p_false_pos/p_false_neg for per-site density correction only")
    plot = sub.add_parser("plot", help="Plot observable and bootstrap error bars offline")
    plot.add_argument("--report", required=True)
    plot.add_argument("--out", required=True)
    return cli


def main():
    args = parser().parse_args()
    if args.command == "validate-spec":
        w.validate_spec(w.read(args.spec))
        return {"specValid": True, "scientificValidation": "not_evaluated"}
    if args.command == "device":
        data = w.device_snapshot(args.project_id, args.region, args.device, args.out)
        return {"device": data["name"], "snapshot": args.out}
    if args.command == "prepare":
        data = w.prepare(args.spec, args.sequence, args.out, target=args.target, project_id=args.project_id,
                         region=args.region, device_file=args.device_file, local_device=args.local_device,
                         noise=w.read(args.noise_file) if args.noise_file else None,
                         backend_configuration=w.Path(args.backend_config).read_text() if args.backend_config else None,
                         open_batch=args.open_batch)
        return {k: data[k] for k in ("planSha256", "target", "project_id", "region", "total_shots", "open", "scientificValidation")}
    if args.command == "local-run":
        data = w.local_run(args.plan, args.out, seed=args.seed, max_atoms=args.max_atoms,
                           solver=w.read(args.solver_file) if args.solver_file else None)
        return {"points": len(data["rows"]), "raw": args.out, "networkUsed": False, "scientificValidation": "not_evaluated"}
    if args.command == "submit":
        data = w.submit(args.plan, args.receipt, args.approve_plan, parent_receipt=args.parent_receipt)
    elif args.command == "recover":
        data = w.recover(args.receipt, args.batch_id, plan_file=args.plan)
    elif args.command in ("close", "cancel"):
        data = w.control(args.receipt, args.command, args.confirm)
    elif args.command == "harvest":
        data = w.harvest(args.receipt, args.out)
        return {"batch_id": data["batch_id"], "status": data["status"], "raw": args.out, "points": len(data["rows"])}
    elif args.command == "analyze":
        data = w.analyze(args.raw, args.sequence, args.out, bootstrap=args.bootstrap, seed=args.seed,
                         baseline_file=args.baseline, sigma_tolerance=args.sigma_tolerance,
                         readout=w.read(args.readout_file) if args.readout_file else None)
        return {"report": args.out, "complete": data["complete"], "comparison": data["comparison"], "scientificValidation": "not_evaluated"}
    elif args.command == "plot":
        w.plot(args.report, args.out)
        return {"plot": args.out}
    return {key: data[key] for key in ("batch_id", "state", "status") if key in data}


if __name__ == "__main__":
    try:
        print(json.dumps(main(), allow_nan=False))
    except Exception as error:
        # Cloud exceptions may contain bodies, URLs or credentials. Keep local
        # contract errors actionable; suppress arbitrary provider/sequence text.
        from cloud import CloudError
        safe = str(error) if isinstance(error, (CloudError, FileExistsError)) else type(error).__name__
        if isinstance(error, ValueError) and error.__traceback__.tb_next and error.__traceback__.tb_next.tb_frame.f_code.co_filename == w.__file__:
            safe = str(error)
        print(f"Experiment failed: {safe}. Preserve existing artifacts; inspect the local contract or receipt before retrying.", file=sys.stderr)
        sys.exit(1)
