# python_service/app.py
from flask import Flask, request, jsonify
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
import os
import json
import re
from flask_cors import CORS
import traceback  # Add this at the top of your file




nltk.download('punkt')
nltk.download('stopwords')


app = Flask(__name__)
# Configure CORS to allow requests from your React app's origin
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})




# Create a directory to store paper content
PAPERS_DIR = os.path.join(os.path.dirname(__file__), 'papers')
os.makedirs(PAPERS_DIR, exist_ok=True)

def preprocess_text(text):
    # Convert to lowercase
    text = text.lower()
    # Remove special characters and numbers
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    # Tokenize
    tokens = nltk.word_tokenize(text)
    # Remove stopwords
    stop_words = set(nltk.corpus.stopwords.words('english'))
    tokens = [token for token in tokens if token not in stop_words]
    # Join tokens back to string
    return ' '.join(tokens)

def calculate_similarity(text1, text2):
    processed_text1 = preprocess_text(text1)
    processed_text2 = preprocess_text(text2)
    
    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform([processed_text1, processed_text2])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity * 100)  # Convert to percentage and ensure Python float
    except:
        return 0.0

@app.route('/api/store_paper', methods=['POST'])
def store_paper():
    data = request.json
    bucket_hash = data.get('bucketHash')
    content = data.get('content')
    title = data.get('title')
    author_address = data.get('authorAddress')
    timestamp = data.get('timestamp', 0)
    
    if not all([bucket_hash, content, title, author_address]):
        return jsonify({"error": "Missing required fields"}), 400

    paper_path = os.path.join(PAPERS_DIR, f"{bucket_hash}.json")

    if os.path.exists(paper_path):
        # Load existing paper and append new version
        with open(paper_path, 'r') as f:
            paper_data = json.load(f)

        paper_data["versions"].append({
            "content": content,
            "timestamp": timestamp
        })

        # Optionally: update metadata if new author (multiple authors on same hash — can customize further)
        if paper_data.get("author_address") != author_address:
            paper_data["author_address"] = author_address + " (shared)"

    else:
        # New paper
        paper_data = {
            "bucket_hash": bucket_hash,
            "title": title,
            "content": content,
            "author_address": author_address,
            "versions": [
                {
                    "content": content,
                    "timestamp": timestamp
                }
            ]
        }

    # Write the paper data back to file
    with open(paper_path, 'w') as f:
        json.dump(paper_data, f, indent=2)

    return jsonify({"success": True, "message": "Paper stored successfully"})


    # Write the paper data back to file
    with open(paper_path, 'w') as f:
        json.dump(paper_data, f, indent=2)

    return jsonify({"success": True, "message": "Paper stored successfully"})


@app.route('/api/get_paper_content/<bucket_hash>', methods=['GET'])
def get_paper_content(bucket_hash):
    paper_path = os.path.join(PAPERS_DIR, f"{bucket_hash}.json")
    
    if not os.path.exists(paper_path):
        return jsonify({"error": "Paper not found"}), 404

    with open(paper_path, 'r') as f:
        paper_data = json.load(f)

    return jsonify(paper_data), 200
@app.route('/api/list_papers', methods=['GET'])
def list_papers():
    return jsonify(os.listdir(PAPERS_DIR))

@app.route('/api/add_version', methods=['POST'])
def add_version():
    data = request.json
    bucket_hash = data.get('bucketHash')
    content = data.get('content')
    
    if not all([bucket_hash, content]):
        return jsonify({"error": "Missing required fields"}), 400
    
    paper_path = os.path.join(PAPERS_DIR, f"{bucket_hash}.json")
    
    if not os.path.exists(paper_path):
        return jsonify({"error": "Paper not found"}), 404
    
    # Read existing paper data
    with open(paper_path, 'r') as f:
        paper_data = json.load(f)
    
    # Add new version
    paper_data['versions'].append({
        "content": content,
        "timestamp": data.get('timestamp', 0)
    })
    
    # Update current content
    paper_data['content'] = content
    
    # Save updated paper data
    with open(paper_path, 'w') as f:
        json.dump(paper_data, f, indent=2)
    
    return jsonify({"success": True, "message": "Version added successfully"})

@app.route('/api/check_plagiarism', methods=['POST'])
def check_plagiarism():
    try:
        print("\n=== Received Plagiarism Check Request ===")
        data = request.json
        print("Raw request data:", data)
        
        if not data:
            print("Error: No data received")
            return jsonify({"error": "No data received"}), 400

        title = data.get('title', '').strip().lower()
        content = data.get('content', '').strip()
        author_address = data.get('authorAddress', '').strip().lower()
        print(f"Parsed data - Title: '{title}', Author: '{author_address}', Content length: {len(content)}")

        if not all([title, content, author_address]):
            print("Error: Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400

        # Check if papers directory exists
        if not os.path.exists(PAPERS_DIR):
            print(f"Papers directory {PAPERS_DIR} doesn't exist")
            return jsonify({
                "original_exists": False,
                "is_original": True,
                "similarity_percent": 0,
                "similar_papers": []
            })

        print(f"Checking {PAPERS_DIR} for matching papers...")
        
        original_paper = None
        matching_filename = None

        for filename in os.listdir(PAPERS_DIR):
            if not filename.endswith(".json"):
                continue

            paper_path = os.path.join(PAPERS_DIR, filename)
            print(f"Checking file: {filename}")
            
            try:
                with open(paper_path, 'r') as f:
                    paper_data = json.load(f)
                
                paper_title = paper_data.get("title", "").lower().strip()
                stored_author = paper_data.get("author_address", "").split(" ")[0].lower().strip()
                
                print(f"Comparing with paper: {paper_title} by {stored_author}")
                
                if paper_title == title and stored_author != author_address:
                    print("Found matching paper from different author")
                    original_paper = paper_data
                    matching_filename = filename
                    break

            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
                continue

        response = {}
        if original_paper:
            print("Calculating similarity with original paper...")
            original_content = original_paper["versions"][0]["content"]
            similarity = float(calculate_similarity(content, original_content))  # Convert to native Python float
            print(f"Similarity calculated: {similarity}%")
            
            response = {
                "original_exists": True,
                "is_original": bool(similarity < 30),  # Convert to native Python bool
                "similarity_percent": similarity,
                "similar_papers": [{
                    "title": original_paper["title"],
                    "author": original_paper.get("author_address", "unknown"),
                    "similarity_percent": similarity,
                    "timestamp": original_paper["versions"][-1].get("timestamp", 0),
                    "bucket_hash": os.path.splitext(matching_filename)[0]
                }]
            }
        else:
            print("No matching paper found")
            response = {
                "original_exists": False,
                "is_original": True,
                "similarity_percent": 0,
                "similar_papers": []
            }

        print("Returning response:", response)
        return jsonify(response)

    except Exception as e:
        print("\n!!! CRITICAL ERROR IN PLAGIARISM CHECK !!!")
        print("Error:", str(e))
        print("Request data:", request.json)
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)