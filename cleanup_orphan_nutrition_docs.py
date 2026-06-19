"""
Find and optionally delete orphaned Firestore nutrition documents.

Firebase Authentication does not cascade-delete Firestore data. If a user is
deleted from Auth, documents such as nutrition/{uid}, nutrition/{uid}/data/* and
legacy nutrition/{uid}_{field} can remain. This script compares Auth users with
Firestore documents and removes only data whose uid no longer exists.

Usage:
  python cleanup_orphan_nutrition_docs.py --dry-run
  python cleanup_orphan_nutrition_docs.py --delete

By default the script is conservative: it deletes orphan user documents and
legacy uid_field documents it can confidently associate with a deleted uid. Docs
that do not match the app schema are reported as "unknown" and are not deleted
unless --delete-unknown is also passed.
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_SERVICE_ACCOUNT = BASE_DIR / "serviceAccountKey.json"
DEFAULT_REPORT = BASE_DIR / "nutrition-orphan-cleanup-report.json"
NUTRITION_COLLECTION = "nutrition"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def init_firebase(service_account_path):
    if not service_account_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {service_account_path}")

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(service_account_path)))

    return firestore.client()


def list_auth_uids():
    """Return all active Firebase Authentication user ids."""
    uids = set()
    page = auth.list_users()

    while page:
        for user in page.users:
            uids.add(user.uid)
        page = page.get_next_page()

    return uids


def looks_like_firebase_uid(value):
    """
    Heuristic used only to avoid deleting unrelated top-level docs by accident.

    Firebase web Auth uids are usually long alphanumeric strings. Older app
    documents follow either nutrition/{uid} or nutrition/{uid}_{key}.
    """
    return bool(re.fullmatch(r"[A-Za-z0-9]{20,40}", value or ""))


def infer_doc_owner(doc_id, active_uids):
    """
    Classify a top-level nutrition document.

    Returns:
      (kind, owner_uid)

    Kinds:
      active_user: nutrition/{uid} exists in Auth.
      active_legacy: nutrition/{uid}_{key} belongs to an active Auth user.
      orphan_user: nutrition/{uid} looks like a deleted Auth uid.
      orphan_legacy: nutrition/{uid}_{key} looks like a deleted Auth uid.
      unknown: does not match known app document shapes.
    """
    if doc_id in active_uids:
        return "active_user", doc_id

    for uid in active_uids:
        if doc_id.startswith(uid + "_"):
            return "active_legacy", uid

    if "_" in doc_id:
        possible_uid = doc_id.split("_", 1)[0]
        if looks_like_firebase_uid(possible_uid):
            return "orphan_legacy", possible_uid

    if looks_like_firebase_uid(doc_id):
        return "orphan_user", doc_id

    return "unknown", None


def count_subcollection_docs(doc_ref):
    total = 0
    for subcollection in doc_ref.collections():
        for subdoc_ref in subcollection.list_documents():
            total += 1
            total += count_subcollection_docs(subdoc_ref)
    return total


def delete_document_tree(doc_ref, batch_size=400):
    """
    Recursively delete a document and all nested subcollection documents.

    Firestore does not delete subcollections when a parent document is deleted,
    so this is required for complete account cleanup.
    """
    deleted = 0

    for subcollection in doc_ref.collections():
        subdocs = list(subcollection.list_documents())
        for i in range(0, len(subdocs), batch_size):
            batch = doc_ref._client.batch()
            batch_deleted = 0

            for subdoc_ref in subdocs[i : i + batch_size]:
                deleted += delete_document_tree(subdoc_ref, batch_size=batch_size)
                batch.delete(subdoc_ref)
                batch_deleted += 1

            if batch_deleted:
                batch.commit()
                deleted += batch_deleted

    doc_ref.delete()
    deleted += 1
    return deleted


def audit_nutrition_docs(db, active_uids):
    collection = db.collection(NUTRITION_COLLECTION)
    report = {
        "generatedAt": utc_now(),
        "activeAuthUsers": len(active_uids),
        "activeUserDocs": [],
        "activeLegacyDocs": [],
        "orphanUserDocs": [],
        "orphanLegacyDocs": [],
        "unknownDocs": [],
    }

    for doc_ref in collection.list_documents():
        snap = doc_ref.get()
        doc_id = doc_ref.id
        kind, owner_uid = infer_doc_owner(doc_id, active_uids)
        entry = {
            "id": doc_id,
            "path": doc_ref.path,
            "ownerUid": owner_uid,
            "exists": snap.exists,
            "fieldCount": len(snap.to_dict() or {}) if snap.exists else 0,
            "nestedDocCount": count_subcollection_docs(doc_ref),
        }

        if kind == "active_user":
            report["activeUserDocs"].append(entry)
        elif kind == "active_legacy":
            report["activeLegacyDocs"].append(entry)
        elif kind == "orphan_user":
            report["orphanUserDocs"].append(entry)
        elif kind == "orphan_legacy":
            report["orphanLegacyDocs"].append(entry)
        else:
            report["unknownDocs"].append(entry)

    return report


def write_report(report, output_path):
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def print_summary(report, delete_mode, delete_unknown):
    orphan_user = len(report["orphanUserDocs"])
    orphan_legacy = len(report["orphanLegacyDocs"])
    unknown = len(report["unknownDocs"])

    print("\nResumo")
    print("------")
    print(f"Usuários ativos no Auth: {report['activeAuthUsers']}")
    print(f"Docs de usuários ativos: {len(report['activeUserDocs'])}")
    print(f"Docs legados de usuários ativos: {len(report['activeLegacyDocs'])}")
    print(f"Docs órfãos nutrition/{{uid}}: {orphan_user}")
    print(f"Docs órfãos legados nutrition/{{uid}}_campo: {orphan_legacy}")
    print(f"Docs desconhecidos: {unknown}")

    if delete_mode:
        print("\nModo: DELETE")
        print("Os docs órfãos conhecidos serão apagados.")
        if delete_unknown:
            print("ATENÇÃO: docs desconhecidos também serão apagados.")
    else:
        print("\nModo: DRY-RUN")
        print("Nada foi apagado. Rode com --delete para limpar órfãos conhecidos.")


def delete_orphans(db, report, delete_unknown=False):
    targets = []
    targets.extend(report["orphanUserDocs"])
    targets.extend(report["orphanLegacyDocs"])
    if delete_unknown:
        targets.extend(report["unknownDocs"])

    deleted_docs = 0
    failures = []

    for entry in targets:
        try:
            doc_ref = db.document(entry["path"])
            deleted_docs += delete_document_tree(doc_ref)
            print(f"apagado: {entry['path']}")
        except Exception as exc:
            failures.append({"path": entry["path"], "error": str(exc)})
            print(f"falhou: {entry['path']} -> {exc}")

    return {
        "targetCount": len(targets),
        "deletedDocsIncludingNested": deleted_docs,
        "failures": failures,
    }


def parse_args():
    parser = argparse.ArgumentParser(description="Clean orphaned nutrition Firestore docs.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Only report what would be deleted.")
    mode.add_argument("--delete", action="store_true", help="Delete known orphaned nutrition docs.")
    parser.add_argument(
        "--delete-unknown",
        action="store_true",
        help="Also delete docs that do not match the known app schema. Use only after reviewing dry-run.",
    )
    parser.add_argument(
        "--service-account",
        type=Path,
        default=DEFAULT_SERVICE_ACCOUNT,
        help=f"Path to Firebase service account JSON. Default: {DEFAULT_SERVICE_ACCOUNT}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_REPORT,
        help=f"Path for the JSON report. Default: {DEFAULT_REPORT}",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    delete_mode = bool(args.delete)

    db = init_firebase(args.service_account)
    active_uids = list_auth_uids()
    report = audit_nutrition_docs(db, active_uids)

    if delete_mode:
        report["deleteResult"] = delete_orphans(db, report, delete_unknown=args.delete_unknown)
        report["deletedAt"] = utc_now()

    write_report(report, args.output)
    print_summary(report, delete_mode=delete_mode, delete_unknown=args.delete_unknown)
    print(f"\nRelatório salvo em: {args.output}")

    if report.get("deleteResult", {}).get("failures"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
