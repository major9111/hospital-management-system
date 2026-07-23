PATIENT_INDEX = "patients"
APPOINTMENT_INDEX = "appointments"

PATIENT_MAPPING = {
    "mappings": {
        "properties": {
            "hospital_id": {"type": "keyword"},   # always filter by this — enforced in query builder, not optional
            "full_name": {"type": "text", "analyzer": "standard"},
            "date_of_birth": {"type": "date"},
            "gender": {"type": "keyword"},
            "phone": {"type": "keyword"},
            "created_at": {"type": "date"},
        }
    }
}

APPOINTMENT_MAPPING = {
    "mappings": {
        "properties": {
            "hospital_id": {"type": "keyword"},
            "patient_id": {"type": "keyword"},
            "doctor_id": {"type": "keyword"},
            "department": {"type": "keyword"},
            "scheduled_at": {"type": "date"},
            "status": {"type": "keyword"},
            "booked_via": {"type": "keyword"},
        }
    }
}
