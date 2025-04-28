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
import traceback
from web3 import Web3  # Import Web3 for contract interaction
import threading
from datetime import datetime


nltk.download('punkt')
nltk.download('stopwords')
CHECK_LIMITS = {}
check_limits_lock = threading.Lock()
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

PAPERS_DIR = os.path.join(os.path.dirname(__file__), 'papers')
os.makedirs(PAPERS_DIR, exist_ok=True)

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    tokens = nltk.word_tokenize(text)
    stop_words = set(nltk.corpus.stopwords.words('english'))
    tokens = [token for token in tokens if token not in stop_words]
    return ' '.join(tokens)

def calculate_similarity(text1, text2):
    processed_text1 = preprocess_text(text1)
    processed_text2 = preprocess_text(text2)
    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform([processed_text1, processed_text2])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity * 100)
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
        with open(paper_path, 'r') as f:
            paper_data = json.load(f)
        paper_data["versions"].append({
            "content": content,
            "timestamp": timestamp
        })
        if paper_data.get("author_address") != author_address:
            paper_data["author_address"] = author_address + " (shared)"
    else:
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
    with open(paper_path, 'r') as f:
        paper_data = json.load(f)
    paper_data['versions'].append({
        "content": content,
        "timestamp": data.get('timestamp', 0)
    })
    paper_data['content'] = content
    with open(paper_path, 'w') as f:
        json.dump(paper_data, f, indent=2)
    return jsonify({"success": True, "message": "Version added successfully"})

# Add this to your imports
import threading
from datetime import datetime


@app.route('/api/check_plagiarism', methods=['POST'])
def check_plagiarism():
    try:
        print("\n=== Received Plagiarism Check Request ===")
        data = request.json
        print("Raw request data:", data)

        if not data:
            return jsonify({"error": "No data received"}), 400

        title = data.get('title', '').strip().lower()
        content = data.get('content', '').strip()
        author_address = data.get('authorAddress', '').strip().lower()

        if not all([title, content, author_address]):
            return jsonify({"error": "Missing required fields"}), 400
            
        # Check if the author has reached their limit for this paper
        check_key = f"{author_address}:{title}"
        with check_limits_lock:
            current_count = CHECK_LIMITS.get(check_key, 0)
            print(f"Current check count for {check_key}: {current_count}")
            
            if current_count >= 3:
                return jsonify({
                    "error": "Maximum plagiarism check limit reached for this paper",
                    "allowed": False,
                    "checks_remaining": 0
                }), 403
            
            # Increment the counter
            CHECK_LIMITS[check_key] = current_count + 1
            checks_remaining = 3 - CHECK_LIMITS[check_key]

        # Try to connect to the blockchain, but gracefully handle connection issues
        blockchain_available = True
        allowed = {"checksRemaining": checks_remaining, "banned": False}  # Default values if blockchain is unavailable
        
        try:
            # Web3 Contract Check
            w3 = Web3(Web3.HTTPProvider('http://localhost:8545', request_kwargs={'timeout': 5}))
            if not w3.is_connected():
                print("Warning: Could not connect to Ethereum node. Proceeding without blockchain verification.")
                blockchain_available = False
            else:
                checker_contract_address = "0x477d1a04263C98ECC5b4482D2FE24fA6f5D59a5D"
                checksum_address = w3.to_checksum_address(author_address)
                
                checker_abi = [
                    {
                        "anonymous": False,
                        "inputs": [
                            {"indexed": True, "internalType": "address", "name": "author", "type": "address"},
                            {"indexed": False, "internalType": "uint256", "name": "similarity", "type": "uint256"},
                            {"indexed": False, "internalType": "uint256", "name": "checksRemaining", "type": "uint256"},
                            {"indexed": False, "internalType": "bool", "name": "isBanned", "type": "bool"}
                        ],
                        "name": "PlagiarismChecked",
                        "type": "event"
                    },
                    {
                        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
                        "name": "authorStates",
                        "outputs": [
                            {"internalType": "uint256", "name": "checksRemaining", "type": "uint256"},
                            {"internalType": "uint256", "name": "highSimilarityCount", "type": "uint256"},
                            {"internalType": "bool", "name": "isBanned", "type": "bool"}
                        ],
                        "stateMutability": "view",
                        "type": "function"
                    },
                    {
                        "inputs": [
                            {"internalType": "address", "name": "author", "type": "address"},
                            {"internalType": "uint256", "name": "similarity", "type": "uint256"}
                        ],
                        "name": "recordCheck",
                        "outputs": [{"internalType": "bool", "name": "allowed", "type": "bool"}],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    },
                    {
                        "inputs": [{"internalType": "address", "name": "author", "type": "address"}],
                        "name": "getAuthorState",
                        "outputs": [
                            {"internalType": "uint256", "name": "checksRemaining", "type": "uint256"},
                            {"internalType": "uint256", "name": "highSimilarityCount", "type": "uint256"},
                            {"internalType": "bool", "name": "isBanned", "type": "bool"}
                        ],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ]

                checker = w3.eth.contract(address=checker_contract_address, abi=checker_abi)
                author_state = checker.functions.getAuthorState(checksum_address).call()
                allowed = {
                    "checksRemaining": min(checks_remaining, author_state[0]),  # Take the lower value
                    "banned": author_state[2]
                }
                
                if not allowed["checksRemaining"] > 0 or allowed["banned"]:
                    return jsonify({
                        "error": "Plagiarism check limit exceeded",
                        "allowed": False,
                        "checks_remaining": 0
                    }), 403
        except Exception as e:
            print(f"Blockchain connection error: {str(e)}")
            print("Proceeding without blockchain verification.")
            blockchain_available = False

        # Local paper similarity check
        original_paper = None
        matching_filename = None
        for filename in os.listdir(PAPERS_DIR):
            if not filename.endswith(".json"):
                continue
            paper_path = os.path.join(PAPERS_DIR, filename)
            try:
                with open(paper_path, 'r') as f:
                    paper_data = json.load(f)
                paper_title = paper_data.get("title", "").lower().strip()
                stored_author = paper_data.get("author_address", "").split(" ")[0].lower().strip()
                if paper_title == title and stored_author != author_address:
                    original_paper = paper_data
                    matching_filename = filename
                    break
            except Exception as e:
                continue

        # Create a log entry for this check
        check_log_entry = {
            "timestamp": datetime.now().isoformat(),
            "author": author_address,
            "title": title,
            "check_number": current_count + 1
        }
        
        # You could save this to a file if you need persistence
        check_log_dir = os.path.join(os.path.dirname(__file__), 'check_logs')
        os.makedirs(check_log_dir, exist_ok=True)
        log_file = os.path.join(check_log_dir, f"{author_address.replace('0x', '')}.json")
        
        try:
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    log_data = json.load(f)
            else:
                log_data = {"checks": []}
                
            log_data["checks"].append(check_log_entry)
            
            with open(log_file, 'w') as f:
                json.dump(log_data, f, indent=2)
        except Exception as e:
            print(f"Warning: Failed to log check: {str(e)}")

        if original_paper:
            original_content = original_paper["versions"][-1]["content"]
            similarity = float(calculate_similarity(content, original_content))
            
            # Try to record the check to the blockchain if it's available
            if blockchain_available:
                try:
                    # This would be where you call the recordCheck function on the smart contract
                    # We're skipping the actual transaction for now
                    pass
                except Exception as e:
                    print(f"Error recording similarity check to blockchain: {str(e)}")
            
            return jsonify({
                "original_exists": True,
                "is_original": bool(similarity < 30),
                "similarity_percent": similarity,
                "blockchain_available": blockchain_available,
                "checks_remaining": allowed["checksRemaining"],
                "message": "Potential Plagiarism Detected" if similarity >= 30 else "No Plagiarism Detected",
                "similar_papers": [{
                    "title": original_paper["title"],
                    "author": original_paper.get("author_address", "unknown"),
                    "similarity_percent": similarity,
                    "timestamp": original_paper["versions"][-1].get("timestamp", 0),
                    "bucket_hash": os.path.splitext(matching_filename)[0]
                }]
            })
        else:
            return jsonify({
                "original_exists": False,
                "is_original": True,
                "similarity_percent": 0,
                "blockchain_available": blockchain_available,
                "checks_remaining": allowed["checksRemaining"],
                "message": "No Plagiarism Detected",
                "similar_papers": []
            })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/check_limit', methods=['POST'])
def check_limit():
    data = request.json
    author_address = data.get('authorAddress', '').strip().lower()
    title = data.get('title', '').strip().lower()
    
    if not all([author_address, title]):
        return jsonify({"error": "Missing required fields"}), 400
        
    check_key = f"{author_address}:{title}"
    with check_limits_lock:
        current_count = CHECK_LIMITS.get(check_key, 0)
        remaining = max(0, 3 - current_count)
    
    return jsonify({
        "checks_used": current_count,
        "checks_remaining": remaining,
        "max_limit_reached": current_count >= 3
    }), 200 
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
