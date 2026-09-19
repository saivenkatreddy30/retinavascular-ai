import cv2
import numpy as np
import base64

def compute_box_counting_dimension(binary_skeleton):
    pixels = np.column_stack(np.where(binary_skeleton > 0))
    if len(pixels) == 0:
        return 1.20
    scales = [2, 4, 8, 16, 32, 64]
    counts = []
    for scale in scales:
        grid = np.zeros((binary_skeleton.shape[0] // scale + 1, 
                         binary_skeleton.shape[1] // scale + 1), dtype=bool)
        grid[pixels[:, 0] // scale, pixels[:, 1] // scale] = True
        counts.append(np.sum(grid))
    coeffs = np.polyfit(np.log(scales), np.log(counts), 1)
    return float(-coeffs[0])

def opencv_skeletonize(img_binary):
    skel = np.zeros(img_binary.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    done = False
    temp = img_binary.copy()
    
    while not done:
        eroded = cv2.erode(temp, element)
        opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, element)
        subset = cv2.subtract(eroded, opened)
        skel = cv2.bitwise_or(skel, subset)
        temp = eroded.copy()
        if cv2.countNonZero(temp) == 0:
            done = True
    return skel

def process_retina(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file")
    
    img = cv2.resize(img, (512, 512))
    green = img[:, :, 1]
    
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced_green = clahe.apply(green)
    
    vessel_mask = cv2.adaptiveThreshold(
        enhanced_green, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 15, 3
    )
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    vessel_mask = cv2.morphologyEx(vessel_mask, cv2.MORPH_OPEN, kernel)
    
    skeleton = opencv_skeletonize(vessel_mask)
    
    dist_map = cv2.distanceTransform(vessel_mask, cv2.DIST_L2, 3)
    calibers = dist_map[skeleton > 0] * 2.0
    sorted_calibers = np.sort(calibers)
    n = len(sorted_calibers)
    if n > 100:
        arteriole = np.mean(sorted_calibers[: int(n * 0.4)])
        venule = np.mean(sorted_calibers[int(n * 0.6):])
        avr = float(arteriole / (venule + 1e-5))
    else:
        avr = 0.67
        
    num_skel_pixels = np.sum(skeleton > 0)
    contours, _ = cv2.findContours(vessel_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    chord_sum = sum(cv2.arcLength(cnt, closed=False) for cnt in contours) + 1e-5
    tortuosity = float(max(0.0, (num_skel_pixels / (chord_sum * 0.5)) - 1.0))
    
    fractal_df = compute_box_counting_dimension(skeleton)
    
    vis_mask = np.zeros_like(img)
    vis_mask[vessel_mask > 0] = [248, 189, 56]
    
    _, buffer_orig = cv2.imencode('.png', img)
    _, buffer_mask = cv2.imencode('.png', vis_mask)
    
    orig_b64 = base64.b64encode(buffer_orig).decode('utf-8')
    mask_b64 = base64.b64encode(buffer_mask).decode('utf-8')
    
    return {
        "avr": round(min(1.2, max(0.35, avr)), 2),
        "tortuosity": round(min(1.5, max(0.05, tortuosity)), 2),
        "fractal_df": round(min(1.65, max(1.15, fractal_df)), 3),
        "vessel_density": round(float(np.mean(vessel_mask > 0) * 100), 1),
        "original_image": f"data:image/png;base64,{orig_b64}",
        "vessel_mask_image": f"data:image/png;base64,{mask_b64}"
    }