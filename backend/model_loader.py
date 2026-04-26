import boto3
import os
import pickle
from pathlib import Path

from config import BUCKET_NAME, LOCAL_MODEL_PATH, MODEL_KEY

def load_pipeline():
    local_model_path = Path(LOCAL_MODEL_PATH)
    local_model_path.parent.mkdir(parents=True, exist_ok=True)

    if not os.path.exists(local_model_path):
        s3 = boto3.client("s3")

        s3.download_file(
            BUCKET_NAME,
            MODEL_KEY,
            str(local_model_path)
        )

    with local_model_path.open("rb") as f:

        pipeline = pickle.load(f)

    return pipeline
