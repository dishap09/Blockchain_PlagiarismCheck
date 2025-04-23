// client/src/components/PaperSubmission.js
import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { generateBucketHash, generateContentHash, initContract } from '../utils/web3Utils';
import { storePaper, checkPlagiarism } from '../utils/apiService';

function PaperSubmission({ web3, account, onSubmitSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Check if backend is available on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await checkPlagiarism("test", "test", account);
        setBackendAvailable(true);
      } catch (error) {
        console.log("Backend not available, proceeding without plagiarism checks");
        setBackendAvailable(false);
      }
    };
    checkBackend();
  }, [account]);

  const handleCheckPlagiarism = async (e) => {
    e.preventDefault();
    
    if (!title || !content) {
      setError('Please provide both title and content');
      return;
    }
    
    try {
      setChecking(true);
      setError('');
      setPlagiarismResult(null);
      
      const result = await checkPlagiarism(title, content, account);
      setPlagiarismResult(result);
      
      if (!result.is_original) {
        setError('High similarity detected with existing papers. Please revise your content.');
      }
    } catch (error) {
      console.error('Plagiarism check error:', error);
      setError(error.message || 'Plagiarism service unavailable. Please ensure your work is original.');
      setBackendAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !content) {
      setError('Please provide both title and content');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Generate bucket hash and content hash
      const bucketHash = generateBucketHash(title, account);
      const contentHash = generateContentHash(content);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Get contract instance
      const contract = await initContract(web3);
      
      // Check if title already exists
      const result = await contract.checkTitleExists(title);
      const exists = result[0];
      const existingBucketHash = result[1];
      const existingAuthor = result[2];
      
      if (exists) {
        // If the paper exists and user is not the author
        if (existingAuthor.toLowerCase() !== account.toLowerCase()) {
          // Even if backend is down, we should prevent submission of papers with same title
          setError(`A paper with this title already exists and you are not the author.`);
          setLoading(false);
          return;
        }
        
        // If the paper exists and user is the author
        setError(`You already have a paper with this title. Please go to "My Papers" to add a new version.`);
        setLoading(false);
        return;
      }
      
      // If backend is available and plagiarism wasn't checked, prompt user to check first
      if (backendAvailable && !plagiarismResult) {
        setError('Please check for plagiarism before submission');
        setLoading(false);
        return;
      }
      
      // If plagiarism was checked and found issues
      if (plagiarismResult && !plagiarismResult.is_original) {
        setError('Please address plagiarism issues before submission');
        setLoading(false);
        return;
      }
      
      // Register paper on blockchain
      await contract.registerPaper(title, contentHash, bucketHash, { from: account });
      
      // Store paper content in the backend
      await storePaper(bucketHash, title, content, account, timestamp);
      
      setLoading(false);
      onSubmitSuccess();
      
    } catch (error) {
      console.error('Error submitting paper:', error);
      setError('Failed to submit paper. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <h2>Submit New Academic Paper</h2>
      
      {!backendAvailable && (
        <Alert variant="warning">
          Plagiarism check service is currently unavailable. You can still submit papers, but please ensure your work is original.
        </Alert>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      // In the plagiarism result display section
      {plagiarismResult && !plagiarismResult.is_original && (
          <Alert variant="warning">
              <Alert.Heading>Potential Plagiarism Detected (30%+ Similarity)</Alert.Heading>
              <p>This paper shows significant similarity ({plagiarismResult.similarity_percent}%) with existing papers:</p>
              {plagiarismResult.similar_papers.map((paper, index) => (
                  <div key={index}>
                      <strong>{paper.title}</strong> by {paper.author} - {paper.similarity_percent}% similarity
                  </div>
              ))}
              <hr />
              <p className="mb-0">Papers with 30% or more similarity are considered potentially derivative.</p>
          </Alert>
      )}
      {plagiarismResult && plagiarismResult.is_original && (
        <Alert variant="success">
          <Alert.Heading>No Plagiarism Detected</Alert.Heading>
          <p>This paper appears to be original. You can proceed with submission.</p>
        </Alert>
      )}
      
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Paper Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter paper title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Paper Content</Form.Label>
          <Form.Control
            as="textarea"
            rows={15}
            placeholder="Enter paper content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </Form.Group>
        
        {backendAvailable && (
          <Button 
            variant="secondary" 
            onClick={handleCheckPlagiarism} 
            disabled={checking || !title || !content}
            className="me-2"
          >
            {checking ? (
              <>
                <Spinner as="span" animation="border" size="sm" /> Checking...
              </>
            ) : (
              'Check Plagiarism'
            )}
          </Button>
        )}
        
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading || !title || !content}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" /> Submitting...
            </>
          ) : (
            'Submit Paper'
          )}
        </Button>
      </Form>
    </Container>
  );
}

export default PaperSubmission;