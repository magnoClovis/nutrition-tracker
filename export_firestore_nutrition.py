import json
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore


BASE_DIR = Path(__file__).resolve().parent
SERVICE_ACCOUNT = BASE_DIR / "serviceAccountKey.json"
OUTPUT_RAW = BASE_DIR / "nutrition-full-raw.json"
OUTPUT_SUMMARY = BASE_DIR / "nutrition-audit-summary.json"


def normalize_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def export_document(doc_ref):
    snapshot = doc_ref.get()
    data = snapshot.to_dict() or {}

    exported = {
        "id": snapshot.id,
        "path": snapshot.reference.path,
        "exists": snapshot.exists,
        "data": {k: normalize_value(v) for k, v in data.items()},
        "subcollections": {},
    }

    for subcollection in doc_ref.collections():
        exported["subcollections"][subcollection.id] = []
        for subdoc in subcollection.stream():
            exported["subcollections"][subcollection.id].append(
                export_document(subdoc.reference)
            )

    return exported


def safe_json_count(raw):
    if raw is None:
        return None

    if isinstance(raw, (list, dict)):
        return len(raw)

    if not isinstance(raw, str):
        return None

    text = raw.strip()
    if not text:
        return 0

    try:
        parsed = json.loads(text)
    except Exception:
        return None

    if isinstance(parsed, list):
        return len(parsed)

    if isinstance(parsed, dict):
        return len(parsed)

    return None


def build_summary(raw_docs):
    summary = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "totalNutritionDocs": len(raw_docs),
        "users": {},
        "legacyDocuments": [],
        "unknownDocuments": [],
    }

    for doc in raw_docs:
        doc_id = doc["id"]

        if "_" in doc_id:
            uid, key = doc_id.split("_", 1)
            summary["legacyDocuments"].append({
                "docId": doc_id,
                "uidGuess": uid,
                "keyGuess": key,
                "valueCount": safe_json_count(doc["data"].get("value")),
            })
            continue

        uid = doc_id
        data = doc["data"]
        data_subdocs = doc["subcollections"].get("data", [])

        user_summary = {
            "uid": uid,
            "rootFieldCount": len(data),
            "rootKeys": sorted(data.keys()),
            "dataSubcollectionCount": len(data_subdocs),
            "dataKeys": sorted([d["id"] for d in data_subdocs]),
            "importantCounts": {},
        }

        important_keys = [
            "pantry",
            "pantry_v2",
            "suppPantry",
            "weightHistory",
            "goalHistory",
            "mealTemplates",
            "customGoals",
            "trainingByDate",
            "birthDate",
            "userBirth",
            "gender",
            "height",
            "activityLevel",
            "goalType",
            "goalKg",
            "goalWeeks",
            "bodyFatGoal",
            "userName",
            "language",
        ]

        data_by_key = {d["id"]: d["data"].get("value") for d in data_subdocs}

        for key in important_keys:
            root_value = data.get(key)
            sub_value = data_by_key.get(key)

            if root_value is not None or sub_value is not None:
                user_summary["importantCounts"][key] = {
                    "rootPresent": root_value is not None,
                    "rootCount": safe_json_count(root_value),
                    "subPresent": sub_value is not None,
                    "subCount": safe_json_count(sub_value),
                }

        summary["users"][uid] = user_summary

    return summary


def main():
    if not SERVICE_ACCOUNT.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {SERVICE_ACCOUNT}")

    cred = credentials.Certificate(str(SERVICE_ACCOUNT))
    firebase_admin.initialize_app(cred)

    db = firestore.client()

    raw_docs = []
    for doc in db.collection("nutrition").stream():
        raw_docs.append(export_document(doc.reference))

    output = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "collection": "nutrition",
        "documents": raw_docs,
    }

    OUTPUT_RAW.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary = build_summary(raw_docs)
    OUTPUT_SUMMARY.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Export bruto salvo em: {OUTPUT_RAW}")
    print(f"Resumo salvo em: {OUTPUT_SUMMARY}")


if __name__ == "__main__":
    main()