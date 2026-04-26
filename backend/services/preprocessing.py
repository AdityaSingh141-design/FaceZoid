import cv2

from config import MAX_IMAGE_WIDTH


def preprocess(image):

    if image is None:
        return None

    h, w = image.shape[:2]

    if MAX_IMAGE_WIDTH > 0 and w > MAX_IMAGE_WIDTH:

        scale = MAX_IMAGE_WIDTH / w

        image = cv2.resize(
            image,
            (int(w * scale), int(h * scale))
        )

    return image
