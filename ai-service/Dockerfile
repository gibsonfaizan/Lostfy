# AI Service FastAPI Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install OpenCV system dependencies and build utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source code
COPY . .

EXPOSE 8000

ENV ENV=production
ENV PORT=8000

CMD ["python", "app.py"]
