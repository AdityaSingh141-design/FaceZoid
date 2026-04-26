from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import cv2
import face_recognition
import numpy as np

from config import FACE_DETECTION_MODEL, FACE_DETECTION_UPSAMPLE, PIPELINE_RECOGNITION_THRESHOLD


@dataclass
class FaceRecognitionPipeline:
    known_encodings: list[np.ndarray] = field(default_factory=list)
    known_names: list[str] = field(default_factory=list)
    known_rolls: list[str] = field(default_factory=list)
    unique_names: list[str] = field(default_factory=list)
    detection_model: str = FACE_DETECTION_MODEL
    recognition_threshold: float = PIPELINE_RECOGNITION_THRESHOLD
    detection_upsample: int = FACE_DETECTION_UPSAMPLE
    backend: str = 'face_recognition'
    version: str = '1.0.0'
    pipeline_type: str = 'option_a'
    total_encodings: int = 0
    total_people: int = 0

    def recognize(self, image: np.ndarray) -> dict[str, Any]:
        if image is None:
            return {'faces_detected': 0, 'faces': []}

        detection_model = getattr(self, 'detection_model', FACE_DETECTION_MODEL)
        detection_upsample = getattr(self, 'detection_upsample', FACE_DETECTION_UPSAMPLE)
        recognition_threshold = getattr(self, 'recognition_threshold', PIPELINE_RECOGNITION_THRESHOLD)
        known_rolls = getattr(self, 'known_rolls', [])
        known_names = getattr(self, 'known_names', [])
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        locations = face_recognition.face_locations(
            rgb_image,
            number_of_times_to_upsample=detection_upsample,
            model=detection_model,
        )

        if not locations:
            return {'faces_detected': 0, 'faces': []}

        encodings = face_recognition.face_encodings(rgb_image, known_face_locations=locations)
        faces: list[dict[str, Any]] = []

        for encoding, (top, right, bottom, left) in zip(encodings, locations):
            if not self.known_encodings:
                faces.append({
                    'name': 'Unknown',
                    'roll': None,
                    'confidence': 0.0,
                    'location': {'top': top, 'right': right, 'bottom': bottom, 'left': left},
                })
                continue

            distances = face_recognition.face_distance(self.known_encodings, encoding)
            best_index = int(np.argmin(distances))
            best_distance = float(distances[best_index])
            confidence = max(0.0, 1.0 - best_distance)
            is_match = best_distance <= recognition_threshold
            matched_name = known_names[best_index] if is_match and best_index < len(known_names) else 'Unknown'
            matched_roll = None

            if is_match:
                if best_index < len(known_rolls):
                    matched_roll = str(known_rolls[best_index])
                elif best_index < len(known_names):
                    # Some older pickles may still store roll identifiers in `known_names`.
                    matched_roll = str(known_names[best_index])

            faces.append({
                'name': matched_name,
                'roll': matched_roll,
                'confidence': confidence if is_match else 0.0,
                'distance': best_distance,
                'location': {'top': top, 'right': right, 'bottom': bottom, 'left': left},
            })

        return {'faces_detected': len(faces), 'faces': faces}
