FROM python:3.11-slim

WORKDIR /app

# System deps for RDKit + chemprop
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libxrender1 libxext6 libsm6 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY . .

# Create logs dir
RUN mkdir -p logs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
