import os
import hashlib
import numpy as np
from PIL import Image

class ImageSimilarityService:
    """
    CLIP image embedding generator and similarity matching.
    Provides fallback stubs if torch/transformers/faiss-cpu are not installed.
    """
    def __init__(self):
        self.use_stub = True
        try:
            import torch
            from transformers import CLIPProcessor, CLIPModel
            import faiss
            
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
            self.use_stub = False
            
            # Simple in-memory FAISS flat index (512 dimensions for CLIP-ViT-B)
            self.index = faiss.IndexFlatIP(512)
            self.item_ids = []
            
            print(f"🖼️  ImageSimilarityService: CLIP loaded successfully on {self.device}.")
        except Exception:
            print("⚠️  ImageSimilarityService: CLIP/FAISS load failed. Using deterministic image comparison stub.")
            # In-memory stub database
            self.stub_registry = {} # item_id -> unit vector

    def get_embedding(self, image_path: str) -> list:
        """
        Generates a 512-dimensional vector embedding for an image.
        """
        if not os.path.exists(image_path):
            return [0.0] * 512

        if self.use_stub:
            # Deterministic stub: seed seed generator with image file contents hash to yield a unique vector
            try:
                hasher = hashlib.sha256()
                with open(image_path, 'rb') as f:
                    # read chunk
                    chunk = f.read(8192)
                    while chunk:
                        hasher.update(chunk)
                        chunk = f.read(8192)
                h = hasher.digest()
                seed = int.from_bytes(h[:4], 'big')
                rng = np.random.default_rng(seed)
                emb = rng.normal(0.0, 1.0, 512)
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb.tolist()
            except Exception as e:
                print(f"Error in stub image embedding: {str(e)}")
                return [0.0] * 512
        else:
            try:
                import torch
                img = Image.open(image_path)
                inputs = self.processor(images=img, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    embeddings = self.model.get_image_features(**inputs)
                    # L2 Normalize
                    embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
                return embeddings[0].cpu().numpy().tolist()
            except Exception as e:
                print(f"Error in CLIP image embedding: {str(e)}")
                return [0.0] * 512

    def register_item(self, item_id: int, image_path: str):
        """
        Register an item image in the index directory database.
        """
        try:
            emb = self.get_embedding(image_path)
            if all(v == 0.0 for v in emb):
                return
            
            if self.use_stub:
                self.stub_registry[item_id] = emb
            else:
                import numpy as np
                self.index.add(np.array([emb], dtype=np.float32))
                self.item_ids.append(item_id)
        except Exception as e:
            print(f"Error registering item image: {str(e)}")

    def get_matches(self, image_path: str, top_k: int = 5) -> list:
        """
        Queries index for top match items.
        Returns a list of dicts with {"item_id": int, "score": float}
        """
        emb = self.get_embedding(image_path)
        if all(v == 0.0 for v in emb):
            return []

        if self.use_stub:
            results = []
            for item_id, reg_emb in self.stub_registry.items():
                # Cosine similarity
                sim = float(np.dot(emb, reg_emb))
                # Map from [-1, 1] to [0.0 - 1.0]
                norm_sim = max(0.0, min(1.0, (sim + 1.0) / 2.0))
                results.append({"item_id": item_id, "score": round(norm_sim * 100, 2)})
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]
        else:
            try:
                import numpy as np
                D, I = self.index.search(np.array([emb], dtype=np.float32), top_k)
                results = []
                for dist, idx in zip(D[0], I[0]):
                    if idx != -1:
                        # Map dot product score to [0 - 100] percentage
                        pct = max(0, min(100, (float(dist) + 1.0) / 2.0 * 100))
                        results.append({"item_id": self.item_ids[idx], "score": round(pct, 2)})
                return results
            except Exception as e:
                print(f"Error querying matches: {str(e)}")
                return []

image_similarity_service = ImageSimilarityService()
