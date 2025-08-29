import cv2
import os
import torch
import torch.nn.functional as F
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import yt_dlp

def download_tiktok(url, output_path="tiktok.mp4"):
        ydl_opts = {
            "outtmpl": output_path,
            "format": "mp4"
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return output_path

def extract_frames(video_path, output_folder="frames", frame_rate=1):
        os.makedirs(output_folder, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        frames = []
        frame_id = 0
        fps = cap.get(cv2.CAP_PROP_FPS)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            # Save one frame every `frame_rate` seconds
            if int(cap.get(cv2.CAP_PROP_POS_FRAMES)) % int(fps * frame_rate) == 0:
                frame_path = os.path.join(output_folder, f"frame_{frame_id}.jpg")
                cv2.imwrite(frame_path, frame)
                frames.append(frame_path)
                frame_id += 1

        cap.release()
        return frames


class ViolationClassifier:
    
    def __init__(self, clip_model, processor, device, violation_labels):
       
        self.clip_model = clip_model
        self.processor = processor
        self.device = device
        self.violation_labels = violation_labels

    def get_image_features(self, image_paths):
        
        images = [Image.open(p).convert("RGB") for p in image_paths]
        inputs = self.processor(images=images, return_tensors="pt").to(self.device)
        with torch.no_grad():
            image_features = self.clip_model.get_image_features(**inputs)
        return image_features
    
    def classify_violations(self, image_features, top_k=None, use_max=True):
        
        scores_dict = {}

        for label in self.violation_labels:
            
            inputs = self.processor(text=[label], return_tensors="pt", padding=True).to(self.device)
            with torch.no_grad():
                text_features = self.clip_model.get_text_features(**inputs)

            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            image_features_norm = image_features / image_features.norm(dim=-1, keepdim=True)

            cos_sim = (image_features_norm @ text_features.T).squeeze(1)

            scores = (cos_sim + 1) / 2

            if use_max:
                scores_dict[label] = scores.max().item()
            else:
                scores_dict[label] = scores.mean().item()

        ranked = sorted(scores_dict.items(), key=lambda x: x[1], reverse=True)
        if top_k:
            ranked = ranked[:top_k]

        return ranked
    

if __name__ == "__main__":
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model_name = "openai/clip-vit-base-patch32"
    clip_model = CLIPModel.from_pretrained(model_name).to(device)
    processor = CLIPProcessor.from_pretrained(model_name)

    violation_labels = ["a safe and normal photo or video",
    "a photo containing nudity or sexual content",
    "a violent or gory scene",
    "illegal drugs or drug use",
    "a scam or phishing advertisement",
    "a hateful or racist scene",
    "a photo showing weapons or guns",
    "graphic blood or injury",
    "self-harm or suicide content",
    "alcohol consumption",
    "offensive language or swearing in text",
    "child exploitation or unsafe content",]

    clf = ViolationClassifier(clip_model, processor, device, violation_labels)

    url = "https://vt.tiktok.com/ZSAQMB31D/"
    video_path = download_tiktok(url)

    image_paths = extract_frames(video_path, frame_rate=1)  

    image_features = clf.get_image_features(image_paths)

    results = clf.classify_violations(image_features, top_k=8, use_max=True)
    print("Top violation categories:", results)
