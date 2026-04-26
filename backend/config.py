import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / '.env'


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue

        key, value = stripped.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(ENV_PATH)


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or str(value).strip() == '':
        raise RuntimeError(f'Missing required environment variable: {name}')
    return value

BUCKET_NAME = os.getenv('BUCKET_NAME', 'face-model-bucket')
MODEL_KEY = os.getenv('MODEL_KEY', 'face_recognition_pipeline.pkl')
LOCAL_MODEL_PATH = str(BASE_DIR / os.getenv('LOCAL_MODEL_PATH', 'models/face_recognition_pipeline.pkl'))
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.35'))
MAX_IMAGE_WIDTH = int(os.getenv('MAX_IMAGE_WIDTH', '960'))
FACE_DETECTION_MODEL = os.getenv('FACE_DETECTION_MODEL', 'hog')
FACE_DETECTION_UPSAMPLE = int(os.getenv('FACE_DETECTION_UPSAMPLE', '1'))
PIPELINE_RECOGNITION_THRESHOLD = float(os.getenv('PIPELINE_RECOGNITION_THRESHOLD', '0.6'))
DB_HOST = get_env('DB_HOST', '127.0.0.1')
DB_NAME = get_env('DB_NAME', 'postgres')
DB_USER = get_env('DB_USER', 'postgres')
DB_PASSWORD = get_env('DB_PASSWORD')
DB_PORT = int(os.getenv('DB_PORT', '5432'))
